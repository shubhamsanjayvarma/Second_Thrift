import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import crypto from 'crypto';
import Stripe from 'stripe';

const app = express();

const TEN_MB = 10 * 1024 * 1024;
const MAX_PAYMENT_AMOUNT = 10000; // EUR
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
const EXTENSION_BY_MIME = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
};

let cachedFirebaseCerts = null;
let firebaseCertsExpiresAt = 0;

// ============ STRIPE INITIALIZATION ============
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

// ============ MIDDLEWARE ============
app.disable('x-powered-by');
app.set('trust proxy', 1);

const defaultAllowedOrigins = [
    'https://secondthriftt.com',
    'https://www.secondthriftt.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    credentials: true,
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload attempts. Please try again later.' },
});

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many payment requests. Please try again later.' },
});

app.use('/api', generalLimiter);

// ============ STRIPE WEBHOOK (must be before express.json()) ============
// Stripe requires the raw body to verify the webhook signature.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
        console.error('Stripe webhook: missing configuration');
        return res.status(500).json({ error: 'Stripe webhook not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId) {
            try {
                // Update the order status in Firestore via a flag we store — 
                // since this is a serverless function and we don't have Firebase Admin SDK,
                // we'll store a payment confirmation record in MongoDB so the frontend can poll/verify.
                const { db } = await connectDB();
                await db.collection('payment_confirmations').updateOne(
                    { orderId },
                    {
                        $set: {
                            orderId,
                            stripeSessionId: session.id,
                            stripePaymentIntentId: session.payment_intent,
                            paymentStatus: session.payment_status, // 'paid'
                            amountTotal: session.amount_total,
                            currency: session.currency,
                            customerEmail: session.customer_details?.email,
                            confirmedAt: new Date(),
                        },
                    },
                    { upsert: true }
                );
                console.log(`✅ Stripe webhook: Payment confirmed for order ${orderId}`);
            } catch (err) {
                console.error('Stripe webhook: Failed to store payment confirmation:', err);
            }
        }
    }

    res.json({ received: true });
});

// JSON body parser for all other routes
app.use(express.json());

// Multer — store files in memory before writing to GridFS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TEN_MB },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
            return;
        }
        cb(null, true);
    },
});

const base64UrlJson = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const getFirebaseCerts = async () => {
    if (cachedFirebaseCerts && Date.now() < firebaseCertsExpiresAt) {
        return cachedFirebaseCerts;
    }

    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) {
        throw new Error('Unable to fetch Firebase certificates');
    }

    const cacheControl = response.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

    cachedFirebaseCerts = await response.json();
    firebaseCertsExpiresAt = Date.now() + maxAge * 1000;
    return cachedFirebaseCerts;
};

const verifyFirebaseToken = async (idToken) => {
    const parts = idToken?.split('.');
    if (!parts || parts.length !== 3) {
        throw new Error('Invalid auth token');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = base64UrlJson(encodedHeader);
    const payload = base64UrlJson(encodedPayload);

    if (header.alg !== 'RS256' || !header.kid) {
        throw new Error('Invalid auth token header');
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Firebase project ID is not configured on server');
    }

    const certs = await getFirebaseCerts();
    const cert = certs[header.kid];
    if (!cert) {
        throw new Error('Unknown auth token key');
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    if (!verifier.verify(cert, Buffer.from(encodedSignature, 'base64url'))) {
        throw new Error('Invalid auth token signature');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || payload.iat > now + 300) {
        throw new Error('Expired auth token');
    }
    if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
        throw new Error('Auth token project mismatch');
    }
    if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('Invalid auth token subject');
    }

    return payload;
};

const requireAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const payload = await verifyFirebaseToken(token);
        const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL;
        if (!adminEmail || payload.email?.toLowerCase() !== adminEmail.toLowerCase()) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = payload;
        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};

const sanitizeFilename = (originalname, mimetype) => {
    const ext = EXTENSION_BY_MIME[mimetype] || '';
    const base = originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'upload';

    return `${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${base}${ext}`;
};

// MongoDB connection
let cachedDb = null;
let cachedBucket = null;

async function connectDB() {
    if (cachedDb && cachedBucket) {
        return { db: cachedDb, bucket: cachedBucket };
    }
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI not found in environment');
    }
    const client = new MongoClient(uri);
    await client.connect();
    cachedDb = client.db('secondthrift');
    cachedBucket = new GridFSBucket(cachedDb, { bucketName: 'media' });
    console.log('✅ Connected to MongoDB Atlas');
    return { db: cachedDb, bucket: cachedBucket };
}

// ============ UPLOAD ============
app.post('/api/upload', uploadLimiter, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        const { bucket } = await connectDB();
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, mimetype, buffer, size } = req.file;
        if (!ALLOWED_UPLOAD_TYPES.has(mimetype)) {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        if (size > TEN_MB) {
            return res.status(413).json({ error: 'File too large' });
        }

        const filename = sanitizeFilename(originalname, mimetype);

        // Write to GridFS
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: mimetype,
            metadata: {
                originalName: originalname,
                uploadedAt: new Date(),
                uploadedBy: req.user.email,
            },
        });

        await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.end(buffer);
        });

        const fileId = uploadStream.id.toString();
        // Append extension to URL so frontend correctly identifies videos vs images
        const ext = EXTENSION_BY_MIME[mimetype] || '';
        const url = `/api/media/${fileId}${ext}`;

        console.log(`📁 Uploaded: ${originalname} → ${fileId}`);
        res.json({ url, fileId, filename });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ============ SERVE MEDIA ============
app.get('/api/media/:id', async (req, res) => {
    try {
        const { db, bucket } = await connectDB();
        // Strip any extension if present (e.g. 66xxxx.mp4 -> 66xxxx)
        const idParam = req.params.id.split('.')[0];
        if (!ObjectId.isValid(idParam)) {
            return res.status(400).json({ error: 'Invalid media ID' });
        }
        const fileId = new ObjectId(idParam);

        // Get file info
        const files = await db.collection('media.files').find({ _id: fileId }).toArray();
        if (!files.length) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = files[0];
        const fileSize = file.length;
        const range = req.headers.range;

        if (range) {
            // Support Partial Content / Video Scrubbing natively
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': file.contentType || 'application/octet-stream',
            });

            const downloadStream = bucket.openDownloadStream(fileId, { start, end: end + 1 });
            downloadStream.pipe(res);
        } else {
            // Full file request
            res.set('Accept-Ranges', 'bytes');
            res.set('Content-Length', fileSize);
            res.set('Content-Type', file.contentType || 'application/octet-stream');
            res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache

            const downloadStream = bucket.openDownloadStream(fileId);
            downloadStream.pipe(res);
        }
    } catch (err) {
        console.error('Serve error:', err);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

// ============ DELETE MEDIA ============
app.delete('/api/media/:id', uploadLimiter, requireAdmin, async (req, res) => {
    try {
        const { bucket } = await connectDB();
        const idParam = req.params.id.split('.')[0];
        if (!ObjectId.isValid(idParam)) {
            return res.status(400).json({ error: 'Invalid media ID' });
        }
        const fileId = new ObjectId(idParam);
        await bucket.delete(fileId);
        console.log(`🗑️ Deleted: ${idParam}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// ============ LIST MEDIA ============
app.get('/api/media', requireAdmin, async (req, res) => {
    try {
        const { db } = await connectDB();
        const files = await db.collection('media.files')
            .find()
            .sort({ uploadDate: -1 })
            .limit(100)
            .toArray();

        const result = files.map(f => ({
            id: f._id.toString(),
            url: `/api/media/${f._id}`,
            filename: f.filename,
            contentType: f.contentType,
            size: f.length,
            uploadedAt: f.uploadDate,
        }));
        res.json(result);
    } catch (err) {
        console.error('List media error:', err);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// ============ STRIPE INTEGRATION ============

// 1. Create Checkout Session
app.post('/api/stripe/create-checkout-session', paymentLimiter, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe is not configured on the server' });
        }

        const { orderId, items, total, currency = 'EUR', customerEmail, successUrl, cancelUrl, shipping = 0, shippingCountry = '', shippingLabel = '' } = req.body;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid orderId' });
        }

        const totalNumber = Number(total);
        const currencyCode = String(currency).trim().toLowerCase();

        if (!Number.isFinite(totalNumber) || totalNumber <= 0 || totalNumber > MAX_PAYMENT_AMOUNT) {
            return res.status(400).json({ error: `Amount must be between 0 and ${MAX_PAYMENT_AMOUNT}` });
        }

        if (!/^[a-z]{3}$/.test(currencyCode)) {
            return res.status(400).json({ error: 'Invalid currency code' });
        }

        // Build line items for Stripe Checkout
        const lineItems = [];

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                const unitAmount = Math.round(Number(item.price || 0) * 100);
                const quantity = Math.max(1, Number(item.quantity || 1));
                if (unitAmount <= 0) continue;

                lineItems.push({
                    price_data: {
                        currency: currencyCode,
                        product_data: {
                            name: String(item.name || 'Product').slice(0, 200),
                            ...(item.size ? { description: `Size: ${item.size}` } : {}),
                        },
                        unit_amount: unitAmount,
                    },
                    quantity,
                });
            }
        }

        // Add shipping line item if shipping fee applies (e.g. USA / International)
        const shippingAmount = Math.round(Number(shipping || 0) * 100);
        if (shippingAmount > 0) {
            const countryLabel = shippingCountry ? ` (${shippingCountry})` : '';
            const itemName = shippingLabel || `Express International Shipping${countryLabel}`;
            lineItems.push({
                price_data: {
                    currency: currencyCode,
                    product_data: {
                        name: String(itemName).slice(0, 200),
                        description: `Tracked international courier delivery to ${shippingCountry || 'destination'}`,
                    },
                    unit_amount: shippingAmount,
                },
                quantity: 1,
            });
        }

        // Fallback: if no line items, create a single item
        if (lineItems.length === 0) {
            lineItems.push({
                price_data: {
                    currency: currencyCode,
                    product_data: { name: 'Second Thrift Order' },
                    unit_amount: Math.round(totalNumber * 100),
                },
                quantity: 1,
            });
        }

        const siteUrl = process.env.SITE_URL || 'https://www.secondthriftt.com';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            metadata: { orderId },
            customer_email: customerEmail || undefined,
            success_url: successUrl || `${siteUrl}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${siteUrl}/checkout?status=cancelled`,
        });

        console.log(`💳 Stripe session created: ${session.id} for order ${orderId}`);
        res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
        console.error('Stripe create-checkout-session error:', err);
        res.status(500).json({ error: 'Failed to create Stripe checkout session' });
    }
});

// 2. Verify Payment (client polls this after redirect)
app.get('/api/stripe/verify/:sessionId', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe is not configured on the server' });
        }

        const { sessionId } = req.params;
        if (!sessionId || !sessionId.startsWith('cs_')) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.json({
            verified: session.payment_status === 'paid',
            paymentStatus: session.payment_status,
            orderId: session.metadata?.orderId,
            amountTotal: session.amount_total,
            currency: session.currency,
        });
    } catch (err) {
        console.error('Stripe verify error:', err);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// 3. Refund (admin only)
app.post('/api/stripe/refund', requireAdmin, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe is not configured on the server' });
        }

        const { paymentIntentId, sessionId, amount } = req.body;

        let targetPaymentIntent = paymentIntentId;

        if ((targetPaymentIntent && targetPaymentIntent.startsWith('cs_')) || (!targetPaymentIntent && sessionId)) {
            // Retrieve session to get payment intent
            const sessionToRetrieve = targetPaymentIntent?.startsWith('cs_') ? targetPaymentIntent : sessionId;
            const session = await stripe.checkout.sessions.retrieve(sessionToRetrieve);
            targetPaymentIntent = session.payment_intent;
        }

        if (!targetPaymentIntent || typeof targetPaymentIntent !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid payment intent or session ID' });
        }

        const refundParams = { payment_intent: targetPaymentIntent };
        if (amount) {
            const refundAmount = Math.round(Number(amount) * 100);
            if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
                return res.status(400).json({ error: 'Invalid refund amount' });
            }
            refundParams.amount = refundAmount;
        }

        const refund = await stripe.refunds.create(refundParams);
        console.log(`💸 Refund created: ${refund.id}`);
        res.json({ refundId: refund.id, status: refund.status, amount: refund.amount });
    } catch (err) {
        console.error('Stripe refund error:', err);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

// ============ SHIP GLOBAL INTEGRATION ============

// 1. Add Order (admin only)
app.post('/api/shipglobal/add-order', requireAdmin, async (req, res) => {
    try {
        const email = process.env.SHIPGLOBAL_EMAIL;
        const password = process.env.SHIPGLOBAL_PASSWORD;
        if (!email || !password) {
            return res.status(500).json({ error: 'Ship Global API credentials are not configured on the server.' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');

        const response = await fetch('https://app.shipglobal.in/apiv1/order/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Ship Global Add Order error:', err);
        res.status(500).json({ error: 'Failed to add order to Ship Global' });
    }
});

// 2. Get Label (admin only)
app.post('/api/shipglobal/get-label', requireAdmin, async (req, res) => {
    try {
        const email = process.env.SHIPGLOBAL_EMAIL;
        const password = process.env.SHIPGLOBAL_PASSWORD;
        if (!email || !password) {
            return res.status(500).json({ error: 'Ship Global API credentials are not configured on the server.' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');

        const response = await fetch('https://app.shipglobal.in/apiv1/order/getLabel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                tracking: req.body.tracking,
                label: req.body.label !== false
            })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Ship Global Get Label error:', err);
        res.status(500).json({ error: 'Failed to retrieve shipping label from Ship Global' });
    }
});

// 3. Cancel & Refund Order (admin only)
app.post('/api/shipglobal/cancel-order', requireAdmin, async (req, res) => {
    try {
        const email = process.env.SHIPGLOBAL_EMAIL;
        const password = process.env.SHIPGLOBAL_PASSWORD;
        if (!email || !password) {
            return res.status(500).json({ error: 'Ship Global API credentials are not configured on the server.' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');

        const response = await fetch('https://app.shipglobal.in/apiv1/order/cancelRefundOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                tracking: req.body.tracking
            })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Ship Global Cancel Order error:', err);
        res.status(500).json({ error: 'Failed to cancel order with Ship Global' });
    }
});

// 4. Tracking (public)
app.get('/api/shipglobal/track/:trackingId', async (req, res) => {
    try {
        const email = process.env.SHIPGLOBAL_EMAIL;
        const password = process.env.SHIPGLOBAL_PASSWORD;
        if (!email || !password) {
            return res.status(500).json({ error: 'Ship Global API credentials are not configured on the server.' });
        }

        const authHeader = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');

        const response = await fetch('https://app.shipglobal.in/apiv1/tools/tracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                tracking: req.params.trackingId
            })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('Ship Global Tracking error:', err);
        res.status(500).json({ error: 'Failed to retrieve tracking details from Ship Global' });
    }
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, or MP4.' });
        }
    }

    if (err?.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }

    next(err);
});

// Configure Vercel to NOT parse the body so Multer can handle FormData uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// For Vercel Serverless environment export the Express app
export default app;
