import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingBag, FiHeart, FiMinus, FiPlus, FiChevronRight, FiChevronLeft, FiTruck, FiShield, FiZap, FiRefreshCw, FiShare2, FiTag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatPrice, SIZES, COLORS } from '../utils/helpers';
import { getProductById } from '../services/products';
import SmartMedia from '../components/common/SmartMedia';
import { isVideoUrl, isYouTubeUrl } from '../utils/helpers';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const { addItem } = useCart();
    const { isInWishlist, toggleItem } = useWishlist();
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSize, setSelectedSize] = useState('One Size');
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [slideDirection, setSlideDirection] = useState(1); // 1 = right, -1 = left

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getProductById(id);
                if (!data) {
                    setError('Product not found');
                } else {
                    setProduct(data);
                    if (data.sizes?.length > 0) setSelectedSize(data.sizes[0]);
                }
            } catch (err) {
                console.error('Failed to fetch product:', err);
                setError('Failed to load product');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleAddToCart = () => {
        if (!product) return;
        addItem(product, quantity, selectedSize);
        toast.success(`${product.name} added to cart!`);
    };

    const handleBuyNow = () => {
        if (!product) return;
        addItem(product, quantity, selectedSize);
        navigate('/checkout');
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: product.name, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied!');
        }
    };

    const handleNextImage = () => {
        if (!product?.images?.length) return;
        setSlideDirection(1);
        setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    };

    const handlePrevImage = () => {
        if (!product?.images?.length) return;
        setSlideDirection(-1);
        setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    };

    const handleThumbnailClick = (idx) => {
        setSlideDirection(idx > selectedImage ? 1 : -1);
        setSelectedImage(idx);
    };

    const currentPrice = product?.bulkPrices?.reduce((price, bp) => {
        return quantity >= bp.minQty ? bp.price : price;
    }, product?.price) || product?.price || 0;

    // Helper: get color hex from COLORS constant
    const getColorHex = (colorName) => {
        const found = COLORS.find(c => c.name.toLowerCase() === colorName.toLowerCase());
        return found?.hex || '#888';
    };

    // Loading
    if (loading) {
        return (
            <div className="product-detail-page">
                <div className="container" style={{ paddingTop: '2rem' }}>
                    <div className="product-detail-grid">
                        <div className="product-main-image product-skeleton" />
                        <div>
                            <div className="product-skeleton" style={{ height: 20, width: '40%', marginBottom: 12, borderRadius: 6 }} />
                            <div className="product-skeleton" style={{ height: 36, width: '80%', marginBottom: 16, borderRadius: 6 }} />
                            <div className="product-skeleton" style={{ height: 48, width: '50%', marginBottom: 20, borderRadius: 6 }} />
                            <div className="product-skeleton" style={{ height: 80, width: '100%', marginBottom: 16, borderRadius: 10 }} />
                            <div className="product-skeleton" style={{ height: 44, width: '100%', marginBottom: 12, borderRadius: 10 }} />
                            <div className="product-skeleton" style={{ height: 44, width: '100%', borderRadius: 10 }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="product-detail-page">
                <div className="container" style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>—</div>
                    <h2 style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', color: '#fff', marginBottom: '0.75rem' }}>
                        {error || 'Product Not Found'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', fontFamily: "'Poppins', sans-serif", fontSize: '0.85rem' }}>
                        This product may have been removed or doesn't exist.
                    </p>
                    <Link to="/shop" className="btn btn-primary" style={{ fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Back to Shop
                    </Link>
                </div>
            </div>
        );
    }

    const categoryName = product.category?.charAt(0).toUpperCase() + product.category?.slice(1) || 'Products';
    const conditionLabel = product.condition === 'new' ? 'New' : product.condition === 'like-new' ? 'Like New' : product.condition === 'fair' ? 'Fair' : 'Good Condition';
    const conditionColor = product.condition === 'new' ? 'success' : product.condition === 'like-new' ? 'primary' : 'warning';

    return (
        <div className="product-detail-page">
            <div className="container">
                {/* Breadcrumbs */}
                <nav className="breadcrumbs">
                    <Link to="/">Home</Link>
                    <FiChevronRight size={14} />
                    <Link to="/shop">Shop</Link>
                    <FiChevronRight size={14} />
                    <Link to={`/shop?category=${product.category}`}>{categoryName}</Link>
                    <FiChevronRight size={14} />
                    <span>{product.name}</span>
                </nav>

                <div className="product-detail-grid">
                    {/* Images */}
                    <div className="product-images">
                        <div className="product-main-image-container">
                            {product.images?.length > 0 ? (
                                <>
                                    <AnimatePresence initial={false} custom={slideDirection}>
                                        <motion.div
                                            key={selectedImage}
                                            custom={slideDirection}
                                            initial={{ opacity: 0, x: slideDirection > 0 ? 100 : -100 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: slideDirection > 0 ? -100 : 100 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            className="product-main-image-slide"
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={0.2}
                                            onDragEnd={(e, { offset }) => {
                                                const swipe = offset.x;
                                                if (swipe < -50) {
                                                    handleNextImage();
                                                } else if (swipe > 50) {
                                                    handlePrevImage();
                                                }
                                            }}
                                        >
                                            <SmartMedia
                                                key={selectedImage}
                                                src={product.images[selectedImage]}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </motion.div>
                                    </AnimatePresence>

                                    {product.images.length > 1 && (
                                        <>
                                            <button className="slider-nav-btn prev" onClick={handlePrevImage}><FiChevronLeft size={24} /></button>
                                            <button className="slider-nav-btn next" onClick={handleNextImage}><FiChevronRight size={24} /></button>

                                            <div className="slider-dots">
                                                {product.images.map((_, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`slider-dot ${idx === selectedImage ? 'active' : ''}`}
                                                        onClick={() => handleThumbnailClick(idx)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="product-image-placeholder">
                                    <FiShoppingBag size={64} />
                                    <span>Product Image</span>
                                </div>
                            )}
                        </div>
                        {product.images?.length > 1 && (
                            <div className="product-thumbnails">
                                {product.images.map((img, idx) => {
                                    const isVideo = isVideoUrl(img);
                                    return (
                                        <button
                                            key={idx}
                                            className={`product-thumb ${selectedImage === idx ? 'active' : ''}`}
                                            onClick={() => handleThumbnailClick(idx)}
                                            style={{ position: 'relative' }}
                                        >
                                            <SmartMedia src={img} alt={`${product.name} - ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} videoProps={{ autoPlay: false }} isThumbnail={true} />
                                            {isVideo && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                                                    <span style={{ fontSize: '20px', color: '#fff' }}>▶</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <motion.div
                        className="product-info"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Brand & Category */}
                        {product.brand && <span className="product-brand-label">{product.brand}</span>}
                        <span className="product-category-label">{categoryName}{product.subcategory ? ` / ${product.subcategory}` : ''}</span>
                        <h1>{product.name}</h1>

                        {/* Price Section */}
                        <div className="product-price-section">
                            <span className="product-current-price">{formatPrice(currentPrice)}</span>
                            {product.comparePrice && product.comparePrice > product.price && (
                                <span className="product-original-price">{formatPrice(product.comparePrice)}</span>
                            )}
                            {currentPrice < product.price && (
                                <span className="product-original-price">{formatPrice(product.price)}</span>
                            )}
                            <span className={`badge badge-${conditionColor}`}>{conditionLabel}</span>
                        </div>

                        {/* SKU */}
                        {product.sku && (
                            <div className="product-sku">SKU: {product.sku}</div>
                        )}

                        {/* Stock */}
                        <div className="product-stock-indicator">
                            {product.stock > 0 ? (
                                <span className="stock-in">✓ In Stock — {product.stock} available</span>
                            ) : (
                                <span className="stock-out">✕ Out of Stock</span>
                            )}
                        </div>

                        {/* Description */}
                        <p className="product-description">{product.description}</p>

                        {/* Product Meta Tags (Gender, Season, Materials) */}
                        <div className="product-meta-tags">
                            {product.gender && product.gender !== 'unisex' && (
                                <span className="product-meta-tag">{product.gender === 'men' ? 'Men' : product.gender === 'women' ? 'Women' : product.gender}</span>
                            )}
                            {product.season && product.season !== 'all-season' && (
                                <span className="product-meta-tag">
                                    {product.season === 'spring-summer' ? 'Spring/Summer' : product.season === 'fall-winter' ? 'Fall/Winter' : product.season}
                                </span>
                            )}
                            {product.materials?.length > 0 && product.materials.map(mat => (
                                <span key={mat} className="product-meta-tag">{mat}</span>
                            ))}
                        </div>

                        {/* Colors */}
                        {product.colors?.length > 0 && (
                            <div className="product-colors">
                                <h4>Colors</h4>
                                <div className="product-color-options">
                                    {product.colors.map(color => (
                                        <span key={color} className="product-color-swatch" title={color}>
                                            <span className="swatch-circle" style={{ background: getColorHex(color) }} />
                                            <span className="swatch-label">{color}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bulk Pricing */}
                        {product.bulkPrices?.length > 0 && (
                            <div className="bulk-pricing">
                                <h4>Bulk Pricing</h4>
                                <div className="bulk-pricing-table">
                                    <div className="bulk-row bulk-header">
                                        <span>Quantity</span><span>Price per unit</span>
                                    </div>
                                    <div className={`bulk-row ${quantity < (product.bulkPrices[0]?.minQty || 999) ? 'active' : ''}`}>
                                        <span>1 - {(product.bulkPrices[0]?.minQty || 2) - 1}</span>
                                        <span>{formatPrice(product.price)}</span>
                                    </div>
                                    {product.bulkPrices.map((bp, i) => (
                                        <div key={i} className={`bulk-row ${quantity >= bp.minQty && (i === product.bulkPrices.length - 1 || quantity < product.bulkPrices[i + 1]?.minQty) ? 'active' : ''}`}>
                                            <span>{bp.minQty}+ units</span>
                                            <span>{formatPrice(bp.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Size Selection */}
                        {product.sizes?.length > 0 && (
                            <div className="product-sizes">
                                <h4>Size</h4>
                                <div className="size-options">
                                    {product.sizes.map(size => (
                                        <button
                                            key={size}
                                            className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="product-quantity">
                            <h4>Quantity</h4>
                            <div className="quantity-selector">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={product.stock || 999} />
                                <button onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}><FiPlus /></button>
                            </div>
                            <span className="quantity-total">Total: {formatPrice(currentPrice * quantity)}</span>
                        </div>

                        {/* Actions */}
                        <div className="product-actions-container">
                            <div className="product-actions-secondary">
                                <button
                                    className={`btn btn-action-icon ${isInWishlist(product.id) ? 'wishlist-active' : ''}`}
                                    onClick={async () => {
                                        if (!user) { toast.error('Please log in to save items'); navigate('/login'); return; }
                                        const added = await toggleItem(product);
                                        toast.success(added ? 'Added to wishlist' : 'Removed from wishlist');
                                    }}
                                >
                                    <FiHeart size={20} style={isInWishlist(product.id) ? { fill: '#ff4444', color: '#ff4444' } : {}} />
                                    <span>Wishlist</span>
                                </button>
                                <button className="btn btn-action-icon" onClick={handleShare}>
                                    <FiShare2 size={18} />
                                    <span>Share</span>
                                </button>
                            </div>

                            <div className="product-actions-sticky">
                                <div className="sticky-mobile-info">
                                    <span className="sticky-price">{formatPrice(currentPrice * quantity)}</span>
                                    {product.stock > 0 ? (
                                        <span className="sticky-stock in-stock">In Stock</span>
                                    ) : (
                                        <span className="sticky-stock out-stock">Out of Stock</span>
                                    )}
                                </div>
                                <div className="sticky-buttons">
                                    <button className="btn btn-add-cart" onClick={handleAddToCart} disabled={product.stock <= 0}>
                                        <FiShoppingBag size={20} /> <span className="btn-text">Add to Cart</span>
                                    </button>
                                    <button className="btn btn-buy-now" onClick={handleBuyNow} disabled={product.stock <= 0}>
                                        <FiZap size={20} className="buy-icon" /> Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {product.tags?.length > 0 && (
                            <div className="product-tags">
                                <FiTag size={14} />
                                {product.tags.map(tag => (
                                    <Link key={tag} to={`/shop?search=${tag}`} className="product-tag">{tag}</Link>
                                ))}
                            </div>
                        )}

                        {/* Trust badges */}
                        <div className="product-trust">
                            <div><FiTruck /> European shipping available</div>
                            <div><FiShield /> Quality checked before shipping</div>
                            <div><FiRefreshCw /> Easy returns within 14 days</div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
