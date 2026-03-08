import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiPackage } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { formatPrice, ORDER_STATUSES } from '../utils/helpers';
import './Orders.css';

const Orders = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        navigate('/login');
        return null;
    }

    // Placeholder — in production, orders would be fetched from Firestore
    const orders = [];

    return (
        <div className="orders-page">
            <div className="container">
                <h1 className="orders-title">My Orders</h1>

                {orders.length === 0 ? (
                    <motion.div
                        className="orders-empty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <FiShoppingBag size={56} />
                        <h2>No orders yet</h2>
                        <p>When you place orders, they will appear here.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/shop')}>
                            <FiPackage /> Start Shopping
                        </button>
                    </motion.div>
                ) : (
                    <div className="orders-list">
                        {orders.map(order => {
                            const statusInfo = ORDER_STATUSES[order.status] || {};
                            return (
                                <motion.div
                                    key={order.id}
                                    className="order-card"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="order-card-header">
                                        <div>
                                            <span className="order-id">Order #{order.id}</span>
                                            <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                                        </div>
                                        <span className={`badge badge-${statusInfo.color}`}>
                                            {statusInfo.icon} {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="order-card-items">
                                        {order.items?.map((item, i) => (
                                            <div key={i} className="order-item">
                                                <span>{item.name} × {item.quantity}</span>
                                                <span>{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="order-card-footer">
                                        <span className="order-total">Total: {formatPrice(order.total)}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
