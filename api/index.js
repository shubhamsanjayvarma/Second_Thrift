import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const app = express();

const TEN_MB = 10 * 1024 * 1024;
const MAX_RAZORPAY_AMOUNT = 10000;
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

// Middleware
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
        if (!origin || allowedOrigins.has(origin)) {
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

// ============ RAZORPAY INTEGRATION ============

// 1. Create Order
app.post('/api/razorpay/order', paymentLimiter, async (req, res) => {
    try {
        const { amount, currency = 'EUR', receipt } = req.body;
        const amountNumber = Number(amount);
        const currencyCode = String(currency).trim().toUpperCase();
        const receiptId = String(receipt || `receipt_${Date.now()}`)
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 40);

        if (!Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > MAX_RAZORPAY_AMOUNT) {
            return res.status(400).json({ error: `Amount must be between 0 and ${MAX_RAZORPAY_AMOUNT}` });
        }

        if (!/^[A-Z]{3}$/.test(currencyCode)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }

        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            return res.status(500).json({ error: 'Razorpay keys not configured on server' });
        }

        const instance = new Razorpay({ key_id, key_secret });

        const options = {
            amount: Math.round(amountNumber * 100), // Razorpay expects amount in smallest currency subunit (e.g. cents)
            currency: currencyCode,
            receipt: receiptId
        };

        const order = await instance.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error('Razorpay Order error:', err);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// 2. Verify Payment Signature
app.post('/api/razorpay/verify', paymentLimiter, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (
            !/^order_[a-zA-Z0-9]+$/.test(razorpay_order_id || '') ||
            !/^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id || '') ||
            !/^[a-f0-9]{64}$/i.test(razorpay_signature || '')
        ) {
            return res.status(400).json({ verified: false, error: 'Invalid payment verification payload' });
        }

        if (!key_secret) {
            return res.status(500).json({ error: 'Razorpay key secret not configured on server' });
        }

        // Verify the signature securely
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generated_signature = crypto
            .createHmac('sha256', key_secret)
            .update(text)
            .digest('hex');

        const generatedBuffer = Buffer.from(generated_signature, 'hex');
        const receivedBuffer = Buffer.from(razorpay_signature, 'hex');

        if (generatedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(generatedBuffer, receivedBuffer)) {
            return res.json({ verified: true, message: 'Payment successfully verified' });
        } else {
            return res.status(400).json({ verified: false, error: 'Invalid payment signature' });
        }
    } catch (err) {
        console.error('Razorpay Verify error:', err);
        res.status(500).json({ error: 'Failed to verify payment signature' });
    }
});

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
