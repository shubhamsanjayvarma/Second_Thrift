import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiHeart, FiEye } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { useRegion } from '../../context/RegionContext';
import { formatPrice, getProductUnitPricing } from '../../utils/helpers';
import SmartMedia from '../common/SmartMedia';
import './ProductCard.css';

const ProductCard = ({ product, index = 0 }) => {
    const { addItem } = useCart();
    const { isInWishlist, toggleItem } = useWishlist();
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const inWishlist = isInWishlist(product.id);
    const { isUS, getRegionalPrice } = useRegion();

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addItem(product);
        toast.success(`${product.name} added to cart!`);
    };

    const handleWishlistToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error('Please log in to save items');
            navigate('/login');
            return;
        }
        const added = await toggleItem(product);
        toast.success(added ? `${product.name} added to wishlist` : `${product.name} removed from wishlist`);
    };

    return (
        <motion.div
            className="product-card card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
        >
            <Link to={`/product/${product.id}`} className="product-card-link">
                <div className="product-card-image">
                    {product.images?.[0] ? (
                        <SmartMedia src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div className="product-card-placeholder">
                            <FiShoppingBag size={32} />
                        </div>
                    )}
                    <div className="product-card-overlay">
                        <button className="product-action" onClick={handleAddToCart} title="Add to Cart">
                            <FiShoppingBag size={18} />
                        </button>
                        <button className="product-action" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/product/${product.id}`); }} title="View Details">
                            <FiEye size={18} />
                        </button>
                        <button className={`product-action ${inWishlist ? 'wishlist-active' : ''}`} onClick={handleWishlistToggle} title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}>
                            <FiHeart size={18} style={inWishlist ? { fill: '#ff4444', color: '#ff4444' } : {}} />
                        </button>
                    </div>
                    {product.featured && <span className="product-badge badge-secondary">Featured</span>}
                    {product.condition && product.condition !== 'good' && (
                        <span className="product-condition badge-primary">{product.condition === 'new' ? 'New' : product.condition === 'like-new' ? 'Like New' : 'Fair'}</span>
                    )}
                    {product.grade && (
                        <span className="product-condition" style={{ background: '#10b981', left: product.condition && product.condition !== 'good' ? '75px' : '12px' }}>
                            Grade {product.grade}
                        </span>
                    )}
                </div>
                <div className="product-card-body">
                    {product.brand && <span className="product-card-brand">{product.brand}</span>}
                    <span className="product-card-category">{product.categoryName || product.category}</span>
                    <h3 className="product-card-name">{product.name}</h3>
                    <div className="product-card-price">
                        <span className="product-price-current">{formatPrice(product.price, product.currency)}</span>
                        {product.comparePrice && product.comparePrice > product.price && (
                            <span className="product-price-original">{formatPrice(product.comparePrice, product.currency)}</span>
                        )}
                        {product.bulkPrices?.length > 0 && (
                            <span className="product-price-bulk">From {formatPrice(product.bulkPrices[0].price, product.currency)} in bulk</span>
                        )}
                        {(() => {
                            const unitPricing = getProductUnitPricing(product, product.price);
                            if (!unitPricing) return null;
                            return (
                                <div className="product-card-unit-badge">
                                    <span className="unit-badge-pill">Pack of {unitPricing.pieceCount}</span>
                                    <span className="unit-badge-price">{unitPricing.unitPriceFormatted} / {unitPricing.unitLabel === 'jeans' || unitPricing.unitLabel === 'shorts' ? unitPricing.unitLabel : 'pc'}</span>
                                </div>
                            );
                        })()}
                        {isUS && (
                            <span style={{ display: 'block', width: '100%', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px', fontWeight: 500 }}>
                                {getRegionalPrice(product.price).secondary}
                            </span>
                        )}
                    </div>
                    {product.sizeRangeMin && product.sizeRangeMax ? (
                        <div className="product-card-sizes" style={{ marginTop: '6px' }}>
                            <span className="size-tag" style={{ border: '1px solid rgba(252, 196, 25, 0.3)', color: '#fcc419', background: 'transparent' }}>
                                Waist {product.sizeRangeMin}–{product.sizeRangeMax}
                            </span>
                        </div>
                    ) : product.sizes?.length > 0 && (
                        <div className="product-card-sizes">
                            {product.sizes.slice(0, 4).map(s => <span key={s} className="size-tag">{s}</span>)}
                            {product.sizes.length > 4 && <span className="size-tag size-more">+{product.sizes.length - 4}</span>}
                        </div>
                    )}
                    {product.colors?.length > 0 && (
                        <div className="product-card-colors">
                            {product.colors.slice(0, 5).map(c => <span key={c} className="color-dot" title={c} />)}
                            {product.colors.length > 5 && <span className="color-dot-more">+{product.colors.length - 5}</span>}
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
};

export default ProductCard;
