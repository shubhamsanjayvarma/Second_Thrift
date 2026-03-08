import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer — store files in memory before writing to GridFS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// MongoDB connection
let db, bucket;

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env');
        process.exit(1);
    }
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db('secondthrift');
    bucket = new GridFSBucket(db, { bucketName: 'media' });
    console.log('✅ Connected to MongoDB Atlas');
}

// ============ UPLOAD ============
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, mimetype, buffer } = req.file;
        const filename = `${Date.now()}_${originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        // Write to GridFS
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: mimetype,
            metadata: {
                originalName: originalname,
                uploadedAt: new Date(),
            },
        });

        await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.end(buffer);
        });

        const fileId = uploadStream.id.toString();
        // Append extension to URL so frontend frontend correctly identifies videos vs images
        const ext = originalname.includes('.') ? originalname.substring(originalname.lastIndexOf('.')) : '';
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
        // Strip any extension if present (e.g. 66xxxx.mp4 -> 66xxxx)
        const idParam = req.params.id.split('.')[0];
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
app.delete('/api/media/:id', async (req, res) => {
    try {
        const fileId = new ObjectId(req.params.id);
        await bucket.delete(fileId);
        console.log(`🗑️ Deleted: ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// ============ LIST MEDIA ============
app.get('/api/media', async (req, res) => {
    try {
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
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Media server running on http://localhost:${PORT}`);
        console.log(`   POST /api/upload    — Upload image/video`);
        console.log(`   GET  /api/media/:id — Serve file`);
        console.log(`   DEL  /api/media/:id — Delete file`);
    });
});

