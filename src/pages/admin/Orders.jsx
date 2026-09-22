import { useState, useEffect } from 'react';
import { FiEye, FiTruck, FiCheckCircle, FiPhone, FiRefreshCw, FiTrash2, FiFileText, FiXCircle, FiActivity, FiMail, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useToast } from '../../components/common/Toast';
import { formatPrice, ORDER_STATUSES } from '../../utils/helpers';
import { subscribeToAllOrders, updateOrderStatus, deleteOrder, updateOrderPaymentStatus, updateOrderShipping, cancelOrderShipping, updateOrderShippingFee } from '../../services/orders';
import { getWhatsAppLink } from '../../services/whatsapp';
import './Admin.css';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    
    // Ship Global States
    const [isShipGlobalModalOpen, setIsShipGlobalModalOpen] = useState(false);
    const [shippingFormData, setShippingFormData] = useState(null);
    const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
    const [activeTrackingData, setActiveTrackingData] = useState(null);
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);
    const [editingShipping, setEditingShipping] = useState(false);
    const [shippingInputVal, setShippingInputVal] = useState('');

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

    // Ship Global Country and Service Helpers
    const countryToISO2 = (country = '') => {
        const c = country.toLowerCase().trim();
        const map = {
            'austria': 'AT', 'belgium': 'BE', 'croatia': 'HR', 'cyprus': 'CY', 'estonia': 'EE',
            'finland': 'FI', 'france': 'FR', 'germany': 'DE', 'greece': 'GR', 'ireland': 'IE',
            'italy': 'IT', 'latvia': 'LV', 'lithuania': 'LT', 'luxembourg': 'LU', 'malta': 'MT',
            'netherlands': 'NL', 'portugal': 'PT', 'slovakia': 'SK', 'slovenia': 'SI', 'spain': 'ES',
            'andorra': 'AD', 'kosovo': 'XK', 'monaco': 'MC', 'montenegro': 'ME', 'san marino': 'SM',
            'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'switzerland': 'CH',
            'liechtenstein': 'LI', 'norway': 'NO', 'sweden': 'SE', 'denmark': 'DK', 'poland': 'PL',
            'czech republic': 'CZ', 'hungary': 'HU', 'romania': 'RO', 'bulgaria': 'BG', 'serbia': 'RS',
            'albania': 'AL', 'iceland': 'IS', 'ukraine': 'UA', 'moldova': 'MD', 'russia': 'RU',
            'belarus': 'BY', 'bosnia and herzegovina': 'BA', 'north macedonia': 'MK', 'india': 'IN',
            'bhutan': 'BT', 'nepal': 'NP', 'bangladesh': 'BD', 'pakistan': 'PK', 'sri lanka': 'LK',
            'maldives': 'MV', 'china': 'CN', 'united states': 'US', 'usa': 'US', 'united states of america': 'US'
        };
        return map[c] || c.substring(0, 2).toUpperCase();
    };

    const getDefaultServiceCode = (country = '') => {
        const c = country.toLowerCase().trim();
        if (['united kingdom', 'uk', 'great britain', 'gb'].includes(c)) {
            return 'sgdirectyungb';
        }
        const euCountries = [
            'austria', 'belgium', 'croatia', 'cyprus', 'czech republic', 'denmark', 'estonia',
            'finland', 'france', 'germany', 'greece', 'hungary', 'ireland', 'italy', 'latvia',
            'lithuania', 'luxembourg', 'malta', 'netherlands', 'poland', 'portugal', 'romania',
            'slovakia', 'slovenia', 'spain', 'sweden', 'andorra', 'monaco', 'san marino'
        ];
        if (euCountries.includes(c)) {
            return 'sgdirecteuyun';
        }
        return 'Shipglobal Direct';
    };

    // Ship Global Event Handlers
    const handleOpenShippingModal = (order) => {
        const fullName = order.shippingAddress?.name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '.';

        const countryCode = countryToISO2(order.shippingAddress?.country || '');
        const serviceCode = getDefaultServiceCode(order.shippingAddress?.country || '');

        setShippingFormData({
            orderId: order.id,
            invoice_no: order.id,
            invoice_date: new Date().toISOString().split('T')[0],
            order_reference: order.id,
            service: serviceCode,
            package_weight: order.totalWeight ? String(order.totalWeight) : '0.5',
            package_length: '10',
            package_breadth: '10',
            package_height: '10',
            currency_code: order.paymentCurrency || 'EUR',
            csb5_status: 0,
            customer_shipping_firstname: firstName,
            customer_shipping_lastname: lastName,
            customer_shipping_mobile: order.shippingAddress?.phone || '',
            customer_shipping_email: order.userEmail || '',
            customer_shipping_company: '',
            customer_shipping_address: order.shippingAddress?.street || '',
            customer_shipping_address_2: '',
            customer_shipping_address_3: '',
            customer_shipping_city: order.shippingAddress?.city || '',
            customer_shipping_postcode: order.shippingAddress?.postalCode || '',
            customer_shipping_country_code: countryCode,
            customer_shipping_state: order.shippingAddress?.region || '',
            ioss_number: '',
            customer_nickname: '',
            vendor_order_items: (order.items || []).map(item => ({
                vendor_order_item_name: item.name || 'Product',
                vendor_order_item_sku: '',
                vendor_order_item_quantity: String(item.quantity || item.qty || 1),
                vendor_order_item_unit_price: String(item.price || 0),
                vendor_order_item_hsn: '61112000',
                vendor_order_item_tax_rate: '0'
            }))
        });
        setIsShipGlobalModalOpen(true);
    };

    const handleShipGlobalSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingShipping(true);
        toast.loading('Creating Ship Global order...', { id: 'ship-global-toast' });
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/shipglobal/add-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shippingFormData)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.msg || data.error || 'Failed to create shipping order');
            }

            const trackingNumber = data.tracking || data.awb_number || data.data?.tracking;
            if (!trackingNumber) {
                throw new Error('No tracking number returned from Ship Global API');
            }

            await updateOrderShipping(shippingFormData.orderId, trackingNumber, shippingFormData.service);
            
            toast.success(`Shipment created! AWB: ${trackingNumber}`, { id: 'ship-global-toast' });
            setIsShipGlobalModalOpen(false);

            if (selectedOrder?.id === shippingFormData.orderId) {
                setSelectedOrder(prev => ({
                    ...prev,
                    status: 'shipped',
                    trackingNumber,
                    shippingCarrier: 'Ship Global',
                    shippingServiceCode: shippingFormData.service
                }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to create shipment.', { id: 'ship-global-toast' });
        } finally {
            setIsSubmittingShipping(false);
        }
    };

    const handleDownloadLabel = async (trackingNumber) => {
        toast.loading('Fetching shipping label...', { id: 'label-toast' });
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/shipglobal/get-label`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracking: trackingNumber })
            });

            const data = await res.json();
            if (!res.ok || !data.success || !data.label) {
                throw new Error(data.error || 'Failed to fetch shipping label');
            }

            const byteCharacters = atob(data.label);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `label-${trackingNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toast.success('Label downloaded successfully!', { id: 'label-toast' });
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to download label.', { id: 'label-toast' });
        }
    };

    const handleCancelShipment = async (orderId, trackingNumber) => {
        if (!window.confirm(`Are you sure you want to cancel the Ship Global shipment for AWB: ${trackingNumber}?`)) return;
        
        toast.loading('Cancelling shipment with Ship Global...', { id: 'cancel-shipping-toast' });
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/shipglobal/cancel-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracking: trackingNumber })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.msg || data.error || 'Failed to cancel shipment');
            }

            await cancelOrderShipping(orderId);
            toast.success('Shipment cancelled successfully!', { id: 'cancel-shipping-toast' });
            
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => ({
                    ...prev,
                    status: 'payment_received',
                    trackingNumber: null,
                    shippingCarrier: null,
                    shippingServiceCode: null
                }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to cancel shipment.', { id: 'cancel-shipping-toast' });
        }
    };

    const handleFetchTracking = async (trackingNumber) => {
        setIsTrackingLoading(true);
        setActiveTrackingData(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/shipglobal/track/${trackingNumber}`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch tracking info');
            }
            setActiveTrackingData(data.data);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to load tracking data.');
        } finally {
            setIsTrackingLoading(false);
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
                            <tr><th>Order ID</th><th>Customer</th><th>Shipping</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="ap-order-row">
                                    <td className="ap-td-id"><strong>#{order.id.substring(0, 8)}</strong></td>
                                    <td className="ap-td-email">{order.userEmail}</td>
                                    <td className="ap-td-shipping">
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                            {order.shippingAddress?.city}{order.shippingAddress?.region ? `, ${order.shippingAddress.region}` : ''}, {order.shippingAddress?.country}
                                        </span>
                                    </td>
                                    <td className="ap-td-total">{formatPrice(order.total)}</td>
                                    <td className="ap-td-payment">
                                        <span className={`badge badge-${order.paymentStatus === 'paid' ? 'success' : 'warning'}`}>
                                            {order.paymentStatus === 'paid' ? 'Paid via Stripe' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="ap-td-status"><span className={`badge badge-${ORDER_STATUSES[order.status]?.color}`}>{ORDER_STATUSES[order.status]?.icon} {ORDER_STATUSES[order.status]?.label}</span></td>
                                    <td className="ap-td-actions">
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
                            <span>Payment via {selectedOrder.paymentMethod === 'stripe' ? 'Stripe' : 'Wise'}</span>
                            <span className={`badge badge-${selectedOrder.paymentStatus === 'paid' ? 'success' : selectedOrder.paymentStatus === 'refunded' ? 'error' : 'warning'}`}>
                                {selectedOrder.paymentStatus === 'paid' ? 'Paid' : selectedOrder.paymentStatus === 'refunded' ? 'Refunded' : 'Pending Payment'}
                            </span>
                            {selectedOrder.paymentStatus === 'pending' && selectedOrder.stripeSessionId && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                                    onClick={async () => {
                                        try {
                                            toast.loading('Syncing with Stripe...', { id: 'admin-payment-sync' });
                                            const apiUrl = import.meta.env.VITE_API_URL || '';
                                            const res = await fetch(`${apiUrl}/api/stripe/verify/${selectedOrder.stripeSessionId}`);
                                            if (!res.ok) throw new Error('Verification request failed');
                                            const data = await res.json();
                                            if (data.verified) {
                                                await updateOrderPaymentStatus(selectedOrder.id, 'paid', selectedOrder.stripeSessionId);
                                                setSelectedOrder(prev => ({ ...prev, paymentStatus: 'paid' }));
                                                toast.success('Payment verified and order updated in Firestore!', { id: 'admin-payment-sync' });
                                            } else {
                                                toast.error(`Payment status on Stripe: ${data.paymentStatus || 'unpaid'}`, { id: 'admin-payment-sync' });
                                            }
                                        } catch (err) {
                                            console.error('Sync failed:', err);
                                            toast.error(err.message || 'Failed to sync status with Stripe.', { id: 'admin-payment-sync' });
                                        }
                                    }}
                                >
                                    <FiRefreshCw size={12} /> Sync Status
                                </button>
                            )}
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}
                                onClick={async () => {
                                    try {
                                        toast.loading(`Sending confirmation email to ${selectedOrder.userEmail}...`, { id: 'admin-resend-email' });
                                        const apiUrl = import.meta.env.VITE_API_URL || '';
                                        const res = await fetch(`${apiUrl}/api/send-order-email`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                orderId: selectedOrder.id,
                                                orderData: selectedOrder,
                                                resend: true,
                                            }),
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            if (data.simulated) {
                                                toast.info(`Simulated: ${data.message}`, { id: 'admin-resend-email', duration: 5000 });
                                            } else {
                                                toast.success(`Confirmation email sent to ${selectedOrder.userEmail}!`, { id: 'admin-resend-email' });
                                            }
                                        } else {
                                            toast.error(`Failed to send email: ${data.error || 'Check SMTP configuration'}`, { id: 'admin-resend-email', duration: 5000 });
                                        }
                                    } catch (err) {
                                        console.error('Resend email error:', err);
                                        toast.error(err.message || 'Failed to resend confirmation email.', { id: 'admin-resend-email' });
                                    }
                                }}
                            >
                                <FiMail size={12} /> Resend Email
                            </button>
                        </div>

                        <div className="order-detail-grid">
                            {/* LEFT: Customer + Shipping */}
                            <div>
                                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Customer Details</h4>
                                <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, marginBottom: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                                    <div><strong>{selectedOrder.shippingAddress?.name}</strong></div>
                                    <div style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{selectedOrder.userEmail}</div>
                                    <div>Tel: {selectedOrder.shippingAddress?.phone || 'N/A'}</div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>UID: {selectedOrder.userId?.substring(0, 12)}...</div>
                                    
                                    {/* Stripe Actions */}
                                    {selectedOrder.paymentStatus === 'paid' && selectedOrder.stripeSessionId && (
                                        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)' }}>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ color: '#ff4444', width: '100%', justifyContent: 'center', border: '1px solid rgba(255, 68, 68, 0.2)' }}
                                                onClick={async () => {
                                                    if (!window.confirm('Are you sure you want to refund this order in Stripe?')) return;
                                                    try {
                                                        const { auth } = await import('../../services/firebase');
                                                        const user = auth.currentUser;
                                                        if (!user) throw new Error('Not authenticated');
                                                        const token = await user.getIdToken();
                                                        
                                                        const apiUrl = import.meta.env.VITE_API_URL || '';
                                                        const res = await fetch(`${apiUrl}/api/stripe/refund`, {
                                                            method: 'POST',
                                                            headers: { 
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({ paymentIntentId: selectedOrder.stripeSessionId }) // Note: We pass sessionId, but backend will refund the payment intent it finds or we need to pass paymentIntentId!
                                                        });
                                                        if (!res.ok) {
                                                            const errData = await res.json().catch(()=>({}));
                                                            throw new Error(errData.error || 'Refund failed');
                                                        }
                                                        
                                                        // Update Firestore order
                                                        await updateOrderStatus(selectedOrder.id, 'cancelled', 'Refunded via Stripe');
                                                        toast.success('Refund successful!');
                                                    } catch (err) {
                                                        toast.error(err.message || 'Failed to issue refund.');
                                                    }
                                                }}
                                            >
                                                Issue Stripe Refund
                                            </button>
                                        </div>
                                    )}
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

                                {/* Ship Global Shipping Integration Card */}
                                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>Ship Global Delivery</h4>
                                <div style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-3)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                    {selectedOrder.trackingNumber && selectedOrder.shippingCarrier === 'Ship Global' ? (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span>Status: <strong>{selectedOrder.status.toUpperCase()}</strong></span>
                                                <span className="badge badge-success" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiActivity size={10} /> Active Shipment</span>
                                            </div>
                                            <div style={{ marginBottom: '8px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>AWB Tracking: </span>
                                                <strong>{selectedOrder.trackingNumber}</strong>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleDownloadLabel(selectedOrder.trackingNumber)}>
                                                    <FiFileText size={14} /> Download Shipping Label
                                                </button>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleFetchTracking(selectedOrder.trackingNumber)} disabled={isTrackingLoading}>
                                                        {isTrackingLoading ? 'Loading...' : <><FiActivity size={14} /> Track Status</>}
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: '#ff4444', flex: 1, justifyContent: 'center' }} onClick={() => handleCancelShipment(selectedOrder.id, selectedOrder.trackingNumber)}>
                                                        <FiXCircle size={14} /> Cancel Shipping
                                                    </button>
                                                </div>
                                            </div>

                                            {activeTrackingData && (
                                                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2)', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', maxHeight: '160px', overflowY: 'auto' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>Updates for {selectedOrder.trackingNumber}</span>
                                                        <button className="btn btn-ghost" style={{ padding: '0 4px', height: 'auto', fontSize: '10px' }} onClick={() => setActiveTrackingData(null)}>✕</button>
                                                    </div>
                                                    {activeTrackingData.awbEvents && activeTrackingData.awbEvents.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                                                            {activeTrackingData.awbEvents.map((evt, idx) => (
                                                                <div key={idx} style={{ paddingLeft: '6px', borderLeft: '2px solid var(--primary)' }}>
                                                                    <div style={{ fontWeight: 600 }}>{evt.awb_history_comment}</div>
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                                                                        {evt.awb_history_datetime} • {evt.awb_history_location}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No updates logged yet.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                This order has not been registered with Ship Global yet.
                                            </p>
                                            {selectedOrder.paymentStatus === 'paid' ? (
                                                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleOpenShippingModal(selectedOrder)}>
                                                    <FiTruck size={14} /> Ship with Ship Global
                                                </button>
                                            ) : (
                                                <button className="btn btn-ghost btn-sm" style={{ width: '100%', cursor: 'not-allowed', justifyContent: 'center' }} disabled>
                                                    Awaiting Customer Payment
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Shipping
                                            {!editingShipping && (
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '2px 4px', height: 'auto', fontSize: '11px', color: 'var(--primary)', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setShippingInputVal(String(selectedOrder.shipping ?? 0));
                                                        setEditingShipping(true);
                                                    }}
                                                    title="Edit Shipping Fee"
                                                >
                                                    <FiEdit2 size={12} /> Edit
                                                </button>
                                            )}
                                        </span>
                                        {editingShipping ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px' }}>€</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={shippingInputVal}
                                                    onChange={e => setShippingInputVal(e.target.value)}
                                                    style={{ width: '70px', padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: '#fff' }}
                                                    autoFocus
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '2px 6px', height: 'auto', fontSize: '11px' }}
                                                    onClick={async () => {
                                                        try {
                                                            const newFee = parseFloat(shippingInputVal) || 0;
                                                            const res = await updateOrderShippingFee(selectedOrder.id, newFee);
                                                            setSelectedOrder(prev => ({ ...prev, shipping: res.shipping, total: res.total }));
                                                            setEditingShipping(false);
                                                            toast.success(`Shipping updated to €${res.shipping.toFixed(2)} (New Total: €${res.total.toFixed(2)})`);
                                                        } catch (err) {
                                                            toast.error(err.message || 'Failed to update shipping fee');
                                                        }
                                                    }}
                                                    title="Save"
                                                >
                                                    <FiCheck size={12} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '2px 6px', height: 'auto', fontSize: '11px' }}
                                                    onClick={() => setEditingShipping(false)}
                                                    title="Cancel"
                                                >
                                                    <FiX size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span>{selectedOrder.shipping === 0 ? 'FREE' : formatPrice(selectedOrder.shipping)}</span>
                                        )}
                                    </div>
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

            {/* Ship Global Shipping Modal */}
            {isShipGlobalModalOpen && shippingFormData && (
                <div className="admin-modal-overlay" onClick={() => setIsShipGlobalModalOpen(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ margin: 0 }}>Ship Global Shipment Configuration</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setIsShipGlobalModalOpen(false)}>✕</button>
                        </div>
                        
                        <form onSubmit={handleShipGlobalSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Invoice No (Unique)</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.invoice_no}
                                        onChange={e => setShippingFormData({ ...shippingFormData, invoice_no: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Service Code</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.service}
                                        onChange={e => setShippingFormData({ ...shippingFormData, service: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        placeholder="e.g. sgdirecteuyun"
                                        required
                                    />
                                </div>
                            </div>

                            <h4 style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: 'var(--space-3)', color: 'var(--primary)' }}>Package Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Weight (KG)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={shippingFormData.package_weight}
                                        onChange={e => setShippingFormData({ ...shippingFormData, package_weight: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Length (CM)</label>
                                    <input
                                        type="number"
                                        value={shippingFormData.package_length}
                                        onChange={e => setShippingFormData({ ...shippingFormData, package_length: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Breadth (CM)</label>
                                    <input
                                        type="number"
                                        value={shippingFormData.package_breadth}
                                        onChange={e => setShippingFormData({ ...shippingFormData, package_breadth: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Height (CM)</label>
                                    <input
                                        type="number"
                                        value={shippingFormData.package_height}
                                        onChange={e => setShippingFormData({ ...shippingFormData, package_height: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <h4 style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: 'var(--space-3)', color: 'var(--primary)' }}>Recipient Address</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>First Name</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_firstname}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_firstname: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Last Name</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_lastname}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_lastname: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Email</label>
                                    <input
                                        type="email"
                                        value={shippingFormData.customer_shipping_email}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_email: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Mobile Phone</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_mobile}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_mobile: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Street Address</label>
                                <input
                                    type="text"
                                    value={shippingFormData.customer_shipping_address}
                                    onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_address: e.target.value })}
                                    style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>City</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_city}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_city: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>State/Region</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_state}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_state: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Postal Code</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.customer_shipping_postcode}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_postcode: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>Country Code (ISO 2-letter)</label>
                                    <input
                                        type="text"
                                        maxLength="2"
                                        value={shippingFormData.customer_shipping_country_code}
                                        onChange={e => setShippingFormData({ ...shippingFormData, customer_shipping_country_code: e.target.value.toUpperCase() })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                        placeholder="e.g. DE"
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-xs)', display: 'block', marginBottom: '4px' }}>IOSS Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={shippingFormData.ioss_number}
                                        onChange={e => setShippingFormData({ ...shippingFormData, ioss_number: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setIsShipGlobalModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmittingShipping}>
                                    {isSubmittingShipping ? 'Submitting...' : 'Register Shipment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
