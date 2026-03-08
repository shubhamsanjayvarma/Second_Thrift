import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import { FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { formatPrice } from '../../utils/helpers';
import './CartSidebar.css';

const CartSidebar = () => {
    const { items, isOpen, setCartOpen, cartCount, subtotal, removeItem, updateQuantity } = useCart();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="cart-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCartOpen(false)}
                    />
                    <motion.div
                        className="cart-sidebar"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <div className="cart-header">
                            <h3><FiShoppingBag /> Cart ({cartCount})</h3>
                            <button className="cart-close" onClick={() => setCartOpen(false)}>
                                <FiX size={22} />
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <div className="cart-empty">
                                <FiShoppingBag size={48} />
                                <p>Your cart is empty</p>
                                <Link to="/shop" className="btn btn-primary" onClick={() => setCartOpen(false)}>
                                    Start Shopping
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="cart-items">
                                    {items.map((item, index) => (
                                        <motion.div
                                            key={`${item.id}-${item.size}`}
                                            className="cart-item"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="cart-item-image">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} />
                                                ) : (
                                                    <div className="cart-item-placeholder">📦</div>
                                                )}
                                            </div>
                                            <div className="cart-item-info">
                                                <h4>{item.name}</h4>
                                                <span className="cart-item-size">Size: {item.size}</span>
                                                <span className="cart-item-price">{formatPrice(item.price)}</span>
                                            </div>
                                            <div className="cart-item-actions">
                                                <div className="cart-quantity">
                                                    <button onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}>
                                                        <FiMinus size={14} />
                                                    </button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}>
                                                        <FiPlus size={14} />
                                                    </button>
                                                </div>
                                                <button className="cart-remove" onClick={() => removeItem(item.id, item.size)}>
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="cart-footer">
                                    <div className="cart-subtotal">
                                        <span>Subtotal</span>
                                        <span className="cart-subtotal-price">{formatPrice(subtotal)}</span>
                                    </div>
                                    <p className="cart-shipping-note">Shipping & taxes calculated at checkout</p>
                                    <Link
                                        to="/checkout"
                                        className="btn btn-secondary btn-lg w-full"
                                        onClick={() => setCartOpen(false)}
                                    >
                                        Checkout
                                    </Link>
                                    <Link
                                        to="/cart"
                                        className="btn btn-ghost w-full"
                                        onClick={() => setCartOpen(false)}
                                    >
                                        View Cart
                                    </Link>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;
