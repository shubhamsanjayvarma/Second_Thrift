import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import crypto from 'crypto';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

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

                // Send email notification to customer & admin if not already sent
                const conf = await db.collection('payment_confirmations').findOne({ orderId });
                if (!conf?.emailSent) {
                    const record = await db.collection('orders_metadata').findOne({ orderId });
                    const emailTarget = {
                        orderId,
                        items: record?.items || [],
                        total: record?.total || (session.amount_total ? session.amount_total / 100 : 0),
                        subtotal: record?.subtotal || record?.total || (session.amount_total ? session.amount_total / 100 : 0),
                        shipping: record?.shipping || 0,
                        shippingLabel: record?.shippingLabel || 'Europe (Free / Included)',
                        shippingAddress: record?.shippingAddress || {},
                        userEmail: record?.customerEmail || session.customer_details?.email,
                    };
                    const emailRes = await sendOrderConfirmationEmail(emailTarget);
                    if (emailRes.success) {
                        await db.collection('payment_confirmations').updateOne(
                            { orderId },
                            { $set: { emailSent: true, emailSentAt: new Date() } }
                        );
                    }
                }
            } catch (err) {
                console.error('Stripe webhook: Failed to store payment confirmation or send email:', err);
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

// ============ EMAIL NOTIFICATION SYSTEM ============
const formatEur = (val) => `€${Number(val || 0).toFixed(2)}`;

const buildOrderConfirmationHtml = (order) => {
    const orderNum = (order.orderId || 'ORDER').replace(/^st_/i, '').toUpperCase().slice(0, 10);
    const customerName = order.shippingAddress?.name || 'Customer';
    const address = order.shippingAddress || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const siteUrl = process.env.SITE_URL || 'https://www.secondthriftt.com';
    const whatsappNum = process.env.VITE_OWNER_WHATSAPP || '+919909527515';
    const contactEmail = process.env.VITE_ADMIN_EMAIL || 'secondthriftt39@gmail.com';

    const itemsRows = items.map(item => `
        <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #ffffff; font-size: 14px;">
                <div style="font-weight: 600;">${item.name || 'Vintage Item'}</div>
                ${item.size ? `<div style="font-size: 12px; color: #a1a1aa; margin-top: 3px;">Size: ${item.size}</div>` : ''}
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: center; color: #e4e4e7; font-size: 14px;">
                ${item.quantity || 1}
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right; color: #ffffff; font-size: 14px; font-weight: 600;">
                ${formatEur((item.price || 0) * (item.quantity || 1))}
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation #${orderNum}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0c10; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #14161d; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1f232e 0%, #14161d 100%); padding: 28px 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-size: 24px; font-weight: 800; letter-spacing: 0.12em; color: #fcc419; text-transform: uppercase;">
                                SECOND THRIFT
                            </div>
                            <div style="font-size: 11px; letter-spacing: 0.18em; color: #a1a1aa; text-transform: uppercase; margin-top: 4px;">
                                Premium Vintage & Designer Streetwear
                            </div>
                        </td>
                    </tr>

                    <!-- Status Banner -->
                    <tr>
                        <td style="padding: 24px 30px 10px 30px; text-align: center;">
                            <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; font-weight: 700; font-size: 12px; letter-spacing: 0.08em; padding: 6px 16px; border-radius: 20px; text-transform: uppercase;">
                                ✓ Payment Received · Order Confirmed
                            </div>
                            <h1 style="font-size: 22px; font-weight: 700; margin: 16px 0 8px 0; color: #ffffff;">
                                Thank You For Your Order!
                            </h1>
                            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5; margin: 0;">
                                Hi <strong style="color: #ffffff;">${customerName}</strong>, we've received your order <strong style="color: #fcc419;">#${orderNum}</strong> and our team in India is curating and packing your vintage pieces for courier dispatch.
                            </p>
                        </td>
                    </tr>

                    <!-- Order Info Box -->
                    <tr>
                        <td style="padding: 15px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px;">
                                <tr>
                                    <td width="50%" style="font-size: 13px; color: #a1a1aa; vertical-align: top; padding: 4px;">
                                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 2px;">Order ID</div>
                                        <div style="color: #ffffff; font-weight: 600;">#${orderNum}</div>
                                    </td>
                                    <td width="50%" style="font-size: 13px; color: #a1a1aa; vertical-align: top; padding: 4px;">
                                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 2px;">Payment Method</div>
                                        <div style="color: #ffffff; font-weight: 600;">Stripe (Card / Apple Pay)</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Shipping Details -->
                    <tr>
                        <td style="padding: 10px 30px;">
                            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fcc419; margin-bottom: 8px;">
                                📍 Delivery Address
                            </div>
                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; font-size: 13px; color: #d4d4d8; line-height: 1.6;">
                                <div style="color: #ffffff; font-weight: 600;">${address.name || customerName}</div>
                                <div>${address.street || ''}</div>
                                <div>${address.city || ''}, ${address.postalCode || ''}</div>
                                <div>${address.region ? address.region + ', ' : ''}${address.country || ''}</div>
                                ${address.phone ? `<div style="color: #a1a1aa; margin-top: 4px; font-size: 12px;">📞 ${address.phone}</div>` : ''}
                            </div>
                        </td>
                    </tr>

                    <!-- Order Items -->
                    <tr>
                        <td style="padding: 15px 30px;">
                            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fcc419; margin-bottom: 8px;">
                                🛍️ Purchased Items
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.12);">
                                        <th align="left" style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Product</th>
                                        <th align="center" style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Qty</th>
                                        <th align="right" style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #a1a1aa;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsRows}
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- Totals & Shipping Breakdown -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(255,255,255,0.02); border-radius: 10px; padding: 14px;">
                                <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #a1a1aa;">Subtotal:</td>
                                    <td style="padding: 6px 0; font-size: 14px; color: #ffffff; text-align: right; font-weight: 500;">
                                        ${formatEur(order.subtotal || order.total)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #a1a1aa;">
                                        Shipping (${order.shippingLabel || 'Standard Delivery'}):
                                    </td>
                                    <td style="padding: 6px 0; font-size: 14px; text-align: right; font-weight: 600; color: ${Number(order.shipping) === 0 ? '#10b981' : '#ffffff'};">
                                        ${Number(order.shipping) === 0 ? 'FREE' : formatEur(order.shipping)}
                                    </td>
                                </tr>
                                <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
                                    <td style="padding: 12px 0 4px 0; font-size: 16px; color: #ffffff; font-weight: 700;">
                                        Total Paid:
                                    </td>
                                    <td style="padding: 12px 0 4px 0; font-size: 20px; color: #fcc419; text-align: right; font-weight: 800;">
                                        ${formatEur(order.total)}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Action Button -->
                    <tr>
                        <td style="padding: 0 30px 24px 30px; text-align: center;">
                            <a href="${siteUrl}/orders" target="_blank" style="display: inline-block; background-color: #fcc419; color: #000000; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; letter-spacing: 0.04em;">
                                View & Track Order
                            </a>
                        </td>
                    </tr>

                    <!-- Support Note -->
                    <tr>
                        <td style="padding: 16px 30px; background: rgba(252, 196, 25, 0.04); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                            <div style="font-size: 13px; color: #d4d4d8; line-height: 1.5;">
                                Questions or need special packing instructions?
                            </div>
                            <div style="margin-top: 6px;">
                                <a href="https://wa.me/${whatsappNum.replace(/[^0-9]/g, '')}" style="color: #25D366; font-size: 13px; font-weight: 600; text-decoration: none; margin-right: 15px;">
                                    💬 WhatsApp Support
                                </a>
                                <a href="mailto:${contactEmail}" style="color: #fcc419; font-size: 13px; font-weight: 600; text-decoration: none;">
                                    ✉️ ${contactEmail}
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 30px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.06);">
                            <div style="margin-bottom: 6px;">
                                🌿 Sustainable Fashion: Thank you for extending the lifecycle of premium vintage clothing.
                            </div>
                            <div>
                                © ${new Date().getFullYear()} Second Thrift (SecondThriftt). All rights reserved.
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

const getSmtpConfig = (customSettings = {}) => {
    const host = customSettings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(customSettings.smtpPort || process.env.SMTP_PORT || '465', 10);
    const secure = customSettings.smtpSecure !== undefined
        ? Boolean(customSettings.smtpSecure)
        : (process.env.SMTP_SECURE !== 'false' && process.env.SMTP_SECURE !== false);
    const user = customSettings.smtpUser || process.env.SMTP_USER || process.env.GMAIL_USER || 'secondthriftt.1@gmail.com';
    const rawPass = customSettings.smtpPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
    const pass = rawPass.replace(/\s+/g, '');
    const senderName = customSettings.senderName || 'Second Thrift';
    const senderEmail = customSettings.senderEmail || user;
    const from = customSettings.from || process.env.SMTP_FROM || `"${senderName}" <${senderEmail}>`;

    return { host, port, secure, user, pass, from, senderEmail, senderName };
};

const createEmailTransporter = (customSettings = {}) => {
    const config = getSmtpConfig(customSettings);
    if (!config.pass) {
        return null;
    }
    return {
        transporter: nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        }),
        from: config.from,
        user: config.user,
        config,
    };
};

const sendOrderConfirmationEmail = async (orderData, customSettings = {}, options = {}) => {
    const recipient = orderData.userEmail || orderData.customerEmail || orderData.shippingAddress?.email;
    if (!recipient) {
        console.warn('⚠️ sendOrderConfirmationEmail: No recipient email found for order', orderData.orderId);
        return { success: false, error: 'No recipient email found' };
    }

    const emailSetup = createEmailTransporter(customSettings);
    const orderNum = (orderData.orderId || 'ORDER').replace(/^st_/i, '').toUpperCase().slice(0, 10);
    const subject = options.isTest
        ? `[TEST] Second Thrift Email Notification Service Test`
        : `Order Confirmed: #${orderNum} - Second Thrift`;
    const html = buildOrderConfirmationHtml(orderData);

    if (!emailSetup) {
        console.log(`ℹ️ [SIMULATED EMAIL] SMTP credentials not set. Simulated order confirmation email for ${recipient} (#${orderNum})`);
        return {
            success: true,
            simulated: true,
            recipient,
            subject,
            message: 'Email delivery simulated because SMTP password / App Password is not yet configured.'
        };
    }

    const mailOptions = {
        from: emailSetup.from,
        to: recipient,
        subject,
        html,
    };

    const adminEmail = customSettings.adminNotificationEmail || process.env.VITE_ADMIN_EMAIL || 'secondthriftt39@gmail.com';
    if (!options.isTest && adminEmail && adminEmail.toLowerCase() !== recipient.toLowerCase() && (customSettings.notifyAdmin !== false)) {
        mailOptions.bcc = adminEmail;
    }

    try {
        const info = await emailSetup.transporter.sendMail(mailOptions);
        console.log(`📧 Order confirmation email delivered to ${recipient} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId, recipient };
    } catch (err) {
        console.error(`❌ Failed to send order email to ${recipient}:`, err.message);
        return { success: false, error: err.message };
    }
};

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

        const { orderId, items, total, currency = 'EUR', customerEmail, successUrl, cancelUrl, shipping = 0, shippingCountry = '', shippingLabel = '', shippingAddress, subtotal } = req.body;

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

        // Cache order metadata in MongoDB for email generation & confirmation
        try {
            const { db } = await connectDB();
            await db.collection('orders_metadata').updateOne(
                { orderId },
                {
                    $set: {
                        orderId,
                        items: Array.isArray(items) ? items : [],
                        total: totalNumber,
                        subtotal: Number(subtotal || totalNumber),
                        currency: currencyCode,
                        customerEmail: customerEmail || '',
                        shipping: Number(shipping || 0),
                        shippingCountry,
                        shippingLabel,
                        shippingAddress: shippingAddress || {},
                        updatedAt: new Date(),
                    },
                    $setOnInsert: { createdAt: new Date() }
                },
                { upsert: true }
            );
        } catch (cacheErr) {
            console.warn('Could not cache order metadata in MongoDB:', cacheErr.message);
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
        const isPaid = session.payment_status === 'paid';
        const orderId = session.metadata?.orderId;

        // Auto-send confirmation email on successful payment verification
        if (isPaid && orderId) {
            try {
                const { db } = await connectDB();
                const conf = await db.collection('payment_confirmations').findOne({ orderId });
                if (!conf?.emailSent) {
                    const record = await db.collection('orders_metadata').findOne({ orderId });
                    const emailTarget = {
                        orderId,
                        items: record?.items || [],
                        total: record?.total || (session.amount_total ? session.amount_total / 100 : 0),
                        subtotal: record?.subtotal || record?.total || (session.amount_total ? session.amount_total / 100 : 0),
                        shipping: record?.shipping || 0,
                        shippingLabel: record?.shippingLabel || 'Europe (Free / Included)',
                        shippingAddress: record?.shippingAddress || {},
                        userEmail: record?.customerEmail || session.customer_details?.email,
                    };
                    const emailRes = await sendOrderConfirmationEmail(emailTarget);
                    if (emailRes.success) {
                        await db.collection('payment_confirmations').updateOne(
                            { orderId },
                            { $set: { emailSent: true, emailSentAt: new Date() } },
                            { upsert: true }
                        );
                    }
                }
            } catch (autoEmailErr) {
                console.warn('Auto-email error on verify:', autoEmailErr.message);
            }
        }

        res.json({
            verified: isPaid,
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

// ============ ORDER EMAIL NOTIFICATION ENDPOINTS ============

// 1. Send Order Confirmation Email (called on checkout completion or by admin resend)
app.post('/api/send-order-email', async (req, res) => {
    try {
        const { orderId, orderData, settings, resend } = req.body;
        if (!orderId && !orderData) {
            return res.status(400).json({ error: 'Missing orderId or orderData' });
        }

        const { db } = await connectDB();
        let targetOrder = orderData;

        if (!targetOrder && orderId) {
            targetOrder = await db.collection('orders_metadata').findOne({ orderId });
        }

        if (!targetOrder) {
            return res.status(404).json({ error: 'Order details not found to send email' });
        }

        const targetId = orderId || targetOrder.orderId;
        if (targetId && !resend) {
            const conf = await db.collection('payment_confirmations').findOne({ orderId: targetId });
            if (conf?.emailSent) {
                return res.json({ success: true, alreadySent: true, message: 'Confirmation email already sent for this order' });
            }
        }

        const result = await sendOrderConfirmationEmail(targetOrder, settings || {});
        if (result.success && targetId) {
            await db.collection('payment_confirmations').updateOne(
                { orderId: targetId },
                { $set: { emailSent: true, emailSentAt: new Date() } },
                { upsert: true }
            );
        }

        res.json(result);
    } catch (err) {
        console.error('Send order email error:', err);
        res.status(500).json({ error: err.message || 'Failed to send order email' });
    }
});

// 2. Test Email Endpoint (admin testing SMTP / Gmail App Password)
app.post('/api/test-email', async (req, res) => {
    try {
        const { targetEmail, smtpSettings } = req.body;
        const recipient = targetEmail || smtpSettings?.senderEmail || process.env.VITE_ADMIN_EMAIL || 'secondthriftt39@gmail.com';
        
        const testOrder = {
            orderId: 'TEST_' + Date.now().toString(36).toUpperCase(),
            userEmail: recipient,
            shippingAddress: {
                name: 'Store Administrator',
                street: 'Vintage Hub, Suite 101',
                city: 'Berlin',
                postalCode: '10115',
                country: 'Germany',
                phone: '+49 123 456789',
            },
            items: [
                {
                    name: 'Test Vintage Work Jacket - Notification Check',
                    size: 'L',
                    quantity: 1,
                    price: 75.00,
                }
            ],
            subtotal: 75.00,
            shipping: 0.00,
            shippingLabel: 'Europe (Included / Free)',
            total: 75.00,
            paymentMethod: 'stripe',
            paymentStatus: 'paid',
        };

        const result = await sendOrderConfirmationEmail(testOrder, smtpSettings || {}, { isTest: true });
        res.json(result);
    } catch (err) {
        console.error('Test email error:', err);
        res.status(500).json({ error: err.message || 'Failed to send test email' });
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
