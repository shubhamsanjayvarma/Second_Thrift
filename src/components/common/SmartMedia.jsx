import { useState, useEffect, useRef } from 'react';
import { isVideoUrl, isYouTubeUrl, getYouTubeId } from '../../utils/helpers';

/**
 * SmartMedia: Renders <img> or <video> based on URL detection.
 * For internal API URLs without extensions, probes the Content-Type via HEAD request.
 * Falls back gracefully if the initial guess is wrong.
 */
const SmartMedia = ({ src, alt = '', className = '', style = {}, videoProps = {} }) => {
    const [mediaType, setMediaType] = useState(null); // 'image' | 'video' | null
    const [failed, setFailed] = useState(false);
    const probed = useRef(false);

    useEffect(() => {
        if (!src) { setMediaType(null); return; }
        probed.current = false;
        setFailed(false);

        // Fast path: URL has a recognizable extension
        if (isVideoUrl(src)) {
            setMediaType('video');
            return;
        }

        // Fast path: URL is YouTube
        if (isYouTubeUrl(src)) {
            setMediaType('youtube');
            return;
        }

        // If URL looks like an image extension, use image directly
        if (/\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(src)) {
            setMediaType('image');
            return;
        }

        // For internal API URLs without extensions, probe the content-type
        if (src.includes('/api/media/')) {
            probed.current = true;
            fetch(src, { method: 'HEAD' })
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
                    src={src}
                    className={className}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
                    muted
                    autoPlay
                    loop
                    playsInline
                    {...videoProps}
                />
            );
        }
        return (
            <img
                src={src}
                alt={alt}
                className={className}
                style={style}
                loading="lazy"
            />
        );
    }

    if (mediaType === 'video') {
        return (
            <video
                src={src}
                className={className}
                style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
                muted
                autoPlay
                loop
                playsInline
                onError={() => setFailed(true)}
                {...videoProps}
            />
        );
    }

    if (mediaType === 'youtube') {
        const youtubeId = getYouTubeId(src);
        if (!youtubeId) {
            return null; // Invalid YouTube link
        }
        return (
            <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title="YouTube video player"
                className={className}
                style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', ...style }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            style={style}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
};

export default SmartMedia;
