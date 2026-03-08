import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiPackage, FiCreditCard, FiCheck, FiCopy, FiExternalLink, FiSearch, FiChevronDown } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { createOrder } from '../services/orders';
import { formatPrice, COUNTRIES_BY_REGION, calculateOrderTotals } from '../utils/helpers';
import './Checkout.css';

const Checkout = () => {
    const { items, subtotal, clearCart } = useCart();
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const countryRef = useRef(null);

    const [address, setAddress] = useState({
        name: '', street: '', city: '', postalCode: '', country: '', region: '', phone: '',
    });

    // Close country dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (countryRef.current && !countryRef.current.contains(e.target)) {
                setShowCountryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter countries
    const filteredCountries = countrySearch.trim()
        ? Object.entries(COUNTRIES_BY_REGION).reduce((acc, [region, countries]) => {
            const filtered = countries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()));
            if (filtered.length > 0) acc[region] = filtered;
            return acc;
        }, {})
        : COUNTRIES_BY_REGION;

    const selectCountry = (country) => {
        setAddress({ ...address, country });
        setCountrySearch('');
        setShowCountryDropdown(false);
    };

    const { total } = calculateOrderTotals(items);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    // (Removed specific WhatsApp invoice logic, as Razorpay is automated now)

    const handlePlaceOrder = async () => {
        if (!user) { toast.error('Please login to place order'); navigate('/login'); return; }
        if (!address.name || !address.street || !address.city || !address.postalCode || !address.country || !address.region || !address.phone) {
            toast.error('Please fill in all address fields'); return;
        }
        setLoading(true);

        try {
            // 1. Create Order on our backend (Razorpay)
            toast.loading('Initializing payment...', { id: 'payment-toast' });

            const receipt = `rcpt_${Date.now()}`;
            const res = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/razorpay/order` : '/api/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total,
                    currency: 'EUR',
                    receipt: receipt
                })
            });

            if (!res.ok) throw new Error('Failed to create payment order');
            const razorpayOrder = await res.json();

            // 2. Open Razorpay Checkout Modal
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use Razorpay test key from environment
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                name: "Second Thrift",
                description: "Order Payment",
                order_id: razorpayOrder.id,
                handler: async function (response) {
                    // 3. Payment Success - Verify Signature on backend
                    toast.loading('Verifying payment securely...', { id: 'payment-toast' });
                    try {
                        const verifyRes = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/razorpay/verify` : '/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok && verifyData.verified) {
                            // 4. Verification successful, Save to Firestore
                            toast.loading('Finalizing order...', { id: 'payment-toast' });
                            const orderData = {
                                userId: user.uid, userEmail: user.email,
                                items: items.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size })),
                                shippingAddress: address, subtotal: total, shipping: 0, tax: 0, total,
                                paymentStatus: 'paid', // Mark as paid!
                                paymentMethod: 'razorpay',
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id
                            };

                            const newOrderId = await createOrder(orderData);

                            setOrderInfo({ orderId: newOrderId, ...orderData });
                            setOrderItems([...items]);
                            clearCart();
                            setStep(4);

                            toast.success('Payment successful! Order confirmed.', { id: 'payment-toast' });
                        } else {
                            toast.error('Payment verification failed. Please contact support.', { id: 'payment-toast' });
                        }
                    } catch (verifyErr) {
                        console.error('Verification error:', verifyErr);
                        toast.error('An error occurred during verification.', { id: 'payment-toast' });
                    }
                },
                prefill: {
                    name: address.name,
                    email: user.email,
                    contact: address.phone
                },
                theme: {
                    color: "#0a0a0f" // Theme color from our app
                }
            };

            const rzp1 = new window.Razorpay(options);

            rzp1.on('payment.failed', function (response) {
                toast.error(`Payment failed: ${response.error.description}`, { id: 'payment-toast' });
            });

            rzp1.open();

        } catch (err) {
            console.error(err);
            toast.error('Failed to initialize payment gateway.', { id: 'payment-toast' });
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0 && step !== 4) {
        return (
            <div className="checkout-page">
                <div className="container checkout-empty">
                    <h2>Your cart is empty</h2>
                    <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="container">
                {/* Steps */}
                <div className="checkout-steps">
                    {[
                        { n: 1, label: 'Shipping', icon: <FiMapPin /> },
                        { n: 2, label: 'Review', icon: <FiPackage /> },
                        { n: 3, label: 'Payment', icon: <FiCreditCard /> },
                        { n: 4, label: 'Done', icon: <FiCheck /> },
                    ].map(s => (
                        <div key={s.n} className={`checkout-step ${step >= s.n ? 'active' : ''} ${step === s.n ? 'current' : ''}`}>
                            <div className="step-icon">{s.icon}</div>
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="checkout-grid">
                    <div className="checkout-main">

                        {/* ========== STEP 1: SHIPPING ========== */}
                        {step === 1 && (
                            <motion.div className="checkout-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2>Shipping Address</h2>
                                <p className="form-required-note">All fields are required *</p>
                                <form className="checkout-form" onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!address.name.trim() || !address.street.trim() || !address.city.trim() || !address.postalCode.trim() || !address.country || !address.region.trim() || !address.phone.trim()) {
                                        toast.error('Please fill in all shipping fields'); return;
                                    }
                                    setStep(2);
                                }}>
                                    <input placeholder="Full name *" value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} required />
                                    <input placeholder="Street address *" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} required />
                                    <div className="form-row">
                                        <input placeholder="City *" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} required />
                                        <input placeholder="Postal code *" value={address.postalCode} onChange={e => setAddress({ ...address, postalCode: e.target.value })} required />
                                    </div>

                                    {/* Searchable Country */}
                                    <div className="country-picker" ref={countryRef}>
                                        <div className={`country-picker-trigger ${address.country ? 'has-value' : ''}`} onClick={() => setShowCountryDropdown(!showCountryDropdown)}>
                                            <span>{address.country || 'Select country *'}</span>
                                            <FiChevronDown className={`country-chevron ${showCountryDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showCountryDropdown && (
                                            <div className="country-dropdown">
                                                <div className="country-search-box">
                                                    <FiSearch size={14} />
                                                    <input type="text" placeholder="Search country..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} autoFocus />
                                                </div>
                                                <div className="country-list">
                                                    {Object.entries(filteredCountries).map(([region, countries]) => (
                                                        <div key={region}>
                                                            <div className="country-region-label">{region}</div>
                                                            {countries.map(c => (
                                                                <div key={c} className={`country-option ${address.country === c ? 'selected' : ''}`} onClick={() => selectCountry(c)}>{c}</div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                    {Object.keys(filteredCountries).length === 0 && <div className="country-no-results">No countries found</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <input placeholder="State / Region / District *" value={address.region} onChange={e => setAddress({ ...address, region: e.target.value })} required />
                                    <input placeholder="Phone (WhatsApp) *" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} required />
                                    <button type="submit" className="btn btn-primary btn-lg">Continue to Review</button>
                                </form>
                            </motion.div>
                        )}

                        {/* ========== STEP 2: REVIEW ========== */}
                        {step === 2 && (
                            <motion.div className="checkout-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2>Order Review</h2>
                                <div className="checkout-items">
                                    {items.map(item => (
                                        <div key={`${item.id}-${item.size}`} className="checkout-item">
                                            <div className="checkout-item-info">
                                                <h4>{item.name}</h4>
                                                <span>Size: {item.size} · Qty: {item.quantity}</span>
                                            </div>
                                            <span className="checkout-item-price">{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="checkout-address-preview">
                                    <h4>Shipping to:</h4>
                                    <p>{address.name}<br />{address.street}<br />{address.city}, {address.postalCode}<br />{address.region}, {address.country}<br />Tel: {address.phone}</p>
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                                    <button className="btn btn-primary btn-lg" onClick={() => setStep(3)}>Continue to Payment</button>
                                </div>
                            </motion.div>
                        )}

                        {/* ========== STEP 3: PAYMENT ========== */}
                        {step === 3 && (
                            <motion.div className="checkout-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2>Payment</h2>
                                <div className="wise-simple-card" style={{ border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                                    <div className="wise-simple-header">
                                        <div className="wise-badge" style={{ background: '#3395FF', color: '#fff', fontSize: '10px', padding: '2px 6px' }}><span className="wise-brand">Razorpay</span></div>
                                        <span>Secure Checkout</span>
                                    </div>
                                    <p className="wise-simple-desc">
                                        Your payment will be processed securely via <strong>Razorpay</strong>.
                                        You can pay using credit card, debit card, or other international payment methods.
                                    </p>
                                    <div className="wise-simple-total">
                                        <span>Total Amount</span>
                                        <strong>{formatPrice(total)}</strong>
                                    </div>
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                                    <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={loading}>
                                        {loading ? 'Opening Gateway...' : `Pay ${formatPrice(total)} Now`}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ========== STEP 4: ORDER COMPLETE ========== */}
                        {step === 4 && orderInfo && (
                            <motion.div className="checkout-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="confirmation-header" style={{ color: 'var(--success)' }}>
                                    <div className="confirmation-icon" style={{ background: 'var(--success)' }}><FiCheck size={32} color="#000" /></div>
                                    <h2 style={{ color: 'var(--success)' }}>Payment Successful!</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>Thank you for your order. We are preparing it for shipment.</p>
                                </div>

                                <div className="wise-payment-card" style={{ textAlign: 'center', padding: '32px' }}>
                                    <h3 style={{ marginBottom: '16px' }}>Order #{orderInfo.orderId.substring(0, 8).toUpperCase()}</h3>
                                    <p>A confirmation has been sent to your email.</p>
                                </div>

                                <div className="confirmation-actions" style={{ marginTop: '24px' }}>
                                    <Link to="/orders" className="btn btn-ghost">View My Orders</Link>
                                    <Link to="/shop" className="btn btn-primary">Continue Shopping</Link>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar */}
                    {step < 4 && (
                        <aside className="checkout-sidebar">
                            <div className="checkout-summary-card">
                                <h3>Order Summary</h3>
                                {items.map(item => (
                                    <div key={`${item.id}-${item.size}`} className="summary-row"><span>{item.name} × {item.quantity}</span><span>{formatPrice(item.price * item.quantity)}</span></div>
                                ))}
                                <div className="summary-row summary-total"><span>Total</span><span>{formatPrice(total)}</span></div>
                                <p className="free-shipping-note" style={{ color: 'var(--success)', marginTop: '8px' }}>✓ Shipping & taxes included</p>
                                <div className="wise-mini-badge" style={{ background: 'rgba(51, 149, 255, 0.1)' }}>
                                    <span className="wise-brand-sm" style={{ color: '#3395FF' }}>Razorpay</span>
                                    <span>Secure Payments</span>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Checkout;
