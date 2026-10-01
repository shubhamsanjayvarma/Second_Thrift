import { useState, useEffect, useRef } from 'react';
import { isVideoUrl, isYouTubeUrl, getYouTubeId, extractMediaUrl } from '../../utils/helpers';

/**
 * SmartMedia: Renders <img> or <video> or <iframe> based on URL detection.
 * Supports YouTube, Vimeo, direct video files, and images.
 * Falls back gracefully if the initial guess is wrong.
 */
const SmartMedia = ({ src, alt = '', className = '', style = {}, videoProps = {}, isThumbnail = false }) => {
    const [mediaType, setMediaType] = useState(null); // 'image' | 'video' | 'youtube' | 'vimeo' | null
    const [failed, setFailed] = useState(false);
    const probed = useRef(false);

    const cleanSrc = extractMediaUrl(src) || src;

    useEffect(() => {
        if (!src) { setMediaType(null); return; }
        probed.current = false;
        setFailed(false);

        const currentClean = extractMediaUrl(src) || src;

        // Fast path: Data URL image
        if (typeof currentClean === 'string' && currentClean.startsWith('data:image/')) {
            setMediaType('image');
            return;
        }

        // Fast path: URL is YouTube
        if (isYouTubeUrl(currentClean)) {
            setMediaType('youtube');
            return;
        }

        // Fast path: Vimeo
        if (/vimeo\.com/i.test(currentClean)) {
            setMediaType('vimeo');
            return;
        }

        // Fast path: URL has a recognizable video extension
        if (isVideoUrl(currentClean)) {
            setMediaType('video');
            return;
        }

        // If URL looks like an image extension, use image directly
        if (/\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(currentClean)) {
            setMediaType('image');
            return;
        }

        // For internal API URLs without extensions, probe the content-type
        if (currentClean.includes('/api/media/')) {
            probed.current = true;
            fetch(currentClean, { method: 'HEAD' })
                .then(res => {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.startsWith('video/')) {
                        setMediaType('video');
                    } else {
                        setMediaType('image');
                    }
                })
                .catch(() => {
                    setMediaType('image'); // Default to image on error
                });
        } else {
            // External URL without extension — assume image
            setMediaType('image');
        }
    }, [src]);

    if (!src || mediaType === null) {
        return null;
    }

    if (failed) {
        // If the guessed type failed, try the other type
        if (mediaType === 'image') {
            return (
                <video
                    src={cleanSrc}
                    className={className}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: isThumbnail ? 'none' : 'auto', ...style }}
                    muted
                    autoPlay={!isThumbnail}
                    loop
                    playsInline
                    {...videoProps}
                />
            );
        }
        return (
            <img
                src={cleanSrc}
                alt={alt}
                className={className}
                style={style}
                loading="lazy"
                decoding="async"
            />
        );
    }

    if (mediaType === 'video') {
        return (
            <video
                src={cleanSrc}
                className={className}
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000', pointerEvents: isThumbnail ? 'none' : 'auto', ...style }}
                muted={isThumbnail ? true : undefined}
                autoPlay={isThumbnail ? false : undefined}
                loop={isThumbnail}
                controls={!isThumbnail}
                playsInline
                onError={() => setFailed(true)}
                {...videoProps}
            />
        );
    }

    if (mediaType === 'vimeo') {
        const vimeoMatch = cleanSrc.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        const vimeoId = vimeoMatch ? vimeoMatch[1] : null;
        if (vimeoId) {
            return (
                <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
                    title="Vimeo video player"
                    className={className}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', pointerEvents: isThumbnail ? 'none' : 'auto', ...style }}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                />
            );
        }
    }

    if (mediaType === 'youtube') {
        const youtubeId = getYouTubeId(cleanSrc);
        if (!youtubeId) {
            if (cleanSrc.includes('/embed/')) {
                return (
                    <iframe
                        src={cleanSrc}
                        title="YouTube video player"
                        className={className}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', pointerEvents: isThumbnail ? 'none' : 'auto', ...style }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                );
            }
            return (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b', color: '#a1a1aa', fontSize: '12px' }}>
                    ▶ Video Link
                </div>
            );
        }
        if (isThumbnail) {
            return (
                <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt={alt}
                    className={className}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', ...style }}
                    loading="lazy"
                    decoding="async"
                />
            );
        }
        return (
            <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title="YouTube video player"
                className={className}
                style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', pointerEvents: isThumbnail ? 'none' : 'auto', ...style }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    return (
        <img
            src={cleanSrc}
            alt={alt}
            className={className}
            style={style}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
};

export default SmartMedia;
