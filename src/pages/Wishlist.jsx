import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiTrash2, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { formatPrice } from '../utils/helpers';
import './Wishlist.css';

const Wishlist = () => {
    const { user } = useAuth();
    const { items, loading, removeItem } = useWishlist();
    const { addItem: addToCart } = useCart();
    const toast = useToast();

    const handleRemove = async (productId, name) => {
        await removeItem(productId);
        toast.success(`${name} removed from wishlist`);
    };

    const handleMoveToCart = (item) => {
        addToCart({
            id: item.productId || item.id,
            name: item.name,
            price: item.price,
            images: [item.image],
        });
        toast.success(`${item.name} added to cart!`);
    };

    if (!user) {
        return (
            <div className="wishlist-page">
                <div className="wishlist-empty container">
                    <FiHeart size={48} />
                    <h2>Your Wishlist</h2>
                    <p>Please log in to view your saved items</p>
                    <Link to="/login" className="btn btn-primary">Log In</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="wishlist-page">
            <div className="wishlist-header">
                <div className="container">
                    <h1>My Wishlist</h1>
                    <p>{items.length} {items.length === 1 ? 'item' : 'items'} saved</p>
                </div>
            </div>

            <div className="container wishlist-content">
                {loading ? (
                    <div className="wishlist-loading">
                        <div className="spinner" />
                        <span>Loading your wishlist...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="wishlist-empty">
                        <FiHeart size={48} />
                        <h2>Your wishlist is empty</h2>
                        <p>Browse our collection and save items you love</p>
                        <Link to="/shop" className="btn btn-primary">
                            Explore Shop <FiArrowRight />
                        </Link>
                    </div>
                ) : (
                    <div className="wishlist-grid">
                        <AnimatePresence>
                            {items.map((item) => (
                                <motion.div
                                    key={item.productId || item.id}
                                    className="wishlist-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    layout
                                >
                                    <Link to={`/product/${item.productId || item.id}`} className="wishlist-card-image">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} loading="lazy" />
                                        ) : (
                                            <div className="wishlist-placeholder">
                                                <FiShoppingBag size={28} />
                                            </div>
                                        )}
                                    </Link>
                                    <div className="wishlist-card-body">
                                        {item.brand && <span className="wishlist-card-brand">{item.brand}</span>}
                                        {item.category && <span className="wishlist-card-cat">{item.category}</span>}
                                        <Link to={`/product/${item.productId || item.id}`} className="wishlist-card-name">
                                            {item.name}
                                        </Link>
                                        <span className="wishlist-card-price">{formatPrice(item.price)}</span>
                                        <div className="wishlist-card-actions">
                                            <button className="btn btn-primary btn-sm" onClick={() => handleMoveToCart(item)}>
                                                <FiShoppingBag size={14} /> Add to Cart
                                            </button>
                                            <button className="wishlist-remove-btn" onClick={() => handleRemove(item.productId || item.id, item.name)}>
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
