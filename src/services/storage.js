// Media upload/delete via MongoDB backend (Serverless API) 
// using client-side compression to avoid Vercel's 4.5MB payload limit
import { auth } from './firebase';

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const getAdminAuthHeaders = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Please sign in as admin before uploading media');
    }

    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
};

const validateMediaFile = (file) => {
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
        throw new Error('Unsupported file type. Use JPG, PNG, WEBP, or MP4.');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error('File is too large. Maximum upload size is 10MB.');
    }
};

const compressImage = async (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    // Only compress images, not videos or gifs where canvas transformation ruins them
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Only resize if the image actually exceeds maximum bounds to preserve quality
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: file.type || 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        resolve(file); // Fallback to original if compression fails
                    }
                }, file.type || 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file); // Fallback to original if image loading fails
        };
        reader.onerror = () => resolve(file);
    });
};

export const uploadProductMedia = async (file) => {
    if (!file) throw new Error('No file provided');
    validateMediaFile(file);

    let fileToUpload = file;

    // Auto-compress large files (e.g. over 2MB)
    if (file.size > 2 * 1024 * 1024 && file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file, 1600, 1600, 0.75);
    }
    validateMediaFile(fileToUpload);

    const formData = new FormData();
    formData.append('file', fileToUpload);
    const headers = await getAdminAuthHeaders();

    const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
    });

    if (res.status === 413) {
        throw new Error('File too large even after compression. Please use a smaller file.');
    }

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}): ${text.slice(0, 50)}`);
    }

    const data = await res.json();
    return data.url; // returns "/api/media/<id>"
};

export const uploadProductImage = async (file) => uploadProductMedia(file);
export const uploadCategoryImage = async (file) => uploadProductMedia(file);
export const uploadBannerImage = async (file) => uploadProductMedia(file);

export const deleteImage = async (url) => {
    try {
        if (!url || !url.startsWith('/api/media')) return;
        const headers = await getAdminAuthHeaders();
        const res = await fetch(url, { method: 'DELETE', headers });
        if (!res.ok) console.error('Failed to delete media');
    } catch (e) {
        console.error('Failed to delete image:', e);
    }
};
