import { useState, useEffect } from 'react';
import { FiEye, FiTruck, FiCheckCircle, FiPhone, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from '../../components/common/Toast';
import { formatPrice, ORDER_STATUSES } from '../../utils/helpers';
import { subscribeToAllOrders, updateOrderStatus, deleteOrder } from '../../services/orders';
import { getWhatsAppLink } from '../../services/whatsapp';
import './Admin.css';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Real-time orders subscription
    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllOrders((data) => {
            setOrders(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredOrders = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            toast.success(`Order updated to ${ORDER_STATUSES[newStatus]?.label}`);
            if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to update order');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (window.confirm('Delete this order permanently? This cannot be undone.')) {
            try {
                await deleteOrder(orderId);
                toast.success('Order deleted');
                if (selectedOrder?.id === orderId) setSelectedOrder(null);
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete order');
            }
        }
    };

    const sendShippingToWhatsApp = (order) => {
        const addr = order.shippingAddress || {};
        const items = order.items?.map((item, i) => {
            const qty = item.quantity || item.qty;
            return `${i + 1}. ${item.name}\n    Size: ${item.size || 'N/A'} | Qty: ${qty} | €${(item.price * qty).toFixed(2)}`;
        }).join('\n') || '';
        const msg = `📦 *ORDER SHIPPING DETAILS*\n━━━━━━━━━━━━━━━━━\n📋 *Order ID:* ${order.id}\n📧 *Customer:* ${order.userEmail}\n💵 *Total:* €${(order.total || 0).toFixed(2)}\n\n📦 *Items:*\n${items}\n\n📍 *Ship To:*\n${addr.name || ''}\n${addr.street || ''}\n${addr.city || ''}, ${addr.postalCode || ''}${addr.region ? '\n' + addr.region : ''}\n${addr.country || ''}\n📱 ${addr.phone || 'N/A'}\n━━━━━━━━━━━━━━━━━`;
        window.open(`https://wa.me/919909527515?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div>
            <div className="admin-page-header">
                <h1 className="admin-page-title">Orders</h1>
                <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>● Live updates</span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
                <button className={`btn ${!statusFilter ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setStatusFilter('')}>All ({orders.length})</button>
                {Object.entries(ORDER_STATUSES).map(([key, val]) => (
                    <button key={key} className={`btn ${statusFilter === key ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setStatusFilter(key)}>
                        {val.icon} {val.label} ({orders.filter(o => o.status === key).length})
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>No orders yet</div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr><th>Order ID</th><th>Customer</th><th>Shipping</th><th>Total</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td><strong>{order.id.substring(0, 8)}...</strong></td>
                                    <td>{order.userEmail}</td>
                                    <td>
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                            {order.shippingAddress?.city}{order.shippingAddress?.region ? `, ${order.shippingAddress.region}` : ''}, {order.shippingAddress?.country}
                                        </span>
                                    </td>
                                    <td>{formatPrice(order.total)}</td>
                                    <td><span className={`badge badge-${ORDER_STATUSES[order.status]?.color}`}>{ORDER_STATUSES[order.status]?.icon} {ORDER_STATUSES[order.status]?.label}</span></td>
                                    <td>
                                        <div className="admin-table-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(order)}><FiEye size={14} /> View</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => sendShippingToWhatsApp(order)} style={{ color: '#25D366' }}><FaWhatsapp size={14} /></button>
                                            {order.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(order.id, 'payment_received')} style={{ color: 'var(--success)' }}><FiCheckCircle size={14} /></button>}
                                            {order.status === 'payment_received' && <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(order.id, 'shipped')} style={{ color: 'var(--primary)' }}><FiTruck size={14} /></button>}
                                            {order.status === 'shipped' && <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(order.id, 'delivered')} style={{ color: 'var(--success)' }}><FiCheckCircle size={14} /></button>}
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteOrder(order.id)} style={{ color: '#ff4444' }}><FiTrash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ margin: 0 }}>Order #{selectedOrder.id.substring(0, 8)}</h2>
                            <span className={`badge badge-${ORDER_STATUSES[selectedOrder.status]?.color}`}>{ORDER_STATUSES[selectedOrder.status]?.icon} {ORDER_STATUSES[selectedOrder.status]?.label}</span>
                        </div>

                        {/* Order Meta */}
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                            <span>{selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                            <span>{selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            <span>Payment via Wise</span>
                        </div>

                        <div className="order-detail-grid">
                            {/* LEFT: Customer + Shipping */}
                            <div>
                                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Customer Details</h4>
                                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                                    <div><strong>{selectedOrder.shippingAddress?.name}</strong></div>
                                    <div>{selectedOrder.userEmail}</div>
                                    <div>Tel: {selectedOrder.shippingAddress?.phone || 'N/A'}</div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>UID: {selectedOrder.userId?.substring(0, 12)}...</div>
                                </div>

                                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Shipping Address</h4>
                                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                                    <div><strong>{selectedOrder.shippingAddress?.name}</strong></div>
                                    <div>{selectedOrder.shippingAddress?.street}</div>
                                    <div>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.postalCode}</div>
                                    {selectedOrder.shippingAddress?.region && <div>{selectedOrder.shippingAddress.region}</div>}
                                    <div><strong>{selectedOrder.shippingAddress?.country}</strong></div>
                                    <div>Tel: {selectedOrder.shippingAddress?.phone}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                                    <a href={getWhatsAppLink(selectedOrder.shippingAddress?.phone || '', `Hi ${selectedOrder.shippingAddress?.name}, regarding your order #${selectedOrder.id.substring(0, 8)}...`)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                                        <FiPhone size={14} /> WhatsApp Customer
                                    </a>
                                    <button className="btn btn-ghost btn-sm" onClick={() => sendShippingToWhatsApp(selectedOrder)} style={{ color: '#25D366' }}>
                                        <FaWhatsapp size={14} /> Shipping Details
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: Items + Pricing */}
                            <div>
                                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Order Items</h4>
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                                    {selectedOrder.items?.map((item, i) => (
                                        <div key={i} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0', borderBottom: i < selectedOrder.items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                                                Size: {item.size || 'N/A'} · Qty: {item.quantity || item.qty} · €{item.price?.toFixed(2)} × {item.quantity || item.qty} = <strong style={{ color: 'var(--primary)' }}>{formatPrice(item.price * (item.quantity || item.qty))}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Subtotal</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Shipping</span><span>{selectedOrder.shipping === 0 ? 'FREE' : formatPrice(selectedOrder.shipping)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Tax (19%)</span><span>{formatPrice(selectedOrder.tax)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: 'var(--space-2)', borderTop: '2px solid var(--border-color)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--primary)' }}>
                                        <span>Total</span><span>{formatPrice(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Status Update */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Update Status:</span>
                            <select value={selectedOrder.status} onChange={e => handleUpdateStatus(selectedOrder.id, e.target.value)} style={{ width: 'auto' }}>
                                {Object.entries(ORDER_STATUSES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
