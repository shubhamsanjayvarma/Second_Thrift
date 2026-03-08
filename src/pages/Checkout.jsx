import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiPackage, FiCreditCard, FiCheck, FiCopy, FiExternalLink, FiSearch, FiChevronDown } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { createOrder } from '../services/orders';
import { getPaymentDetails } from '../services/wise';
import { formatPrice, COUNTRIES_BY_REGION, calculateOrderTotals } from '../utils/helpers';
import './Checkout.css';

const Checkout = () => {
    const { items, subtotal, clearCart } = useCart();
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState(null);
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

    // Send shipping details to admin WhatsApp (Invoice format)
    const sendShippingToWhatsApp = () => {
        if (!paymentInfo) return;

        const orderDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const orderTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // Build itemized list with numbering
        const savedItems = orderItems.length > 0 ? orderItems : items;
        const orderItemsList = savedItems.length > 0
            ? savedItems.map((item, i) => {
                const lineTotal = (item.price * item.quantity).toFixed(2);
                return `${i + 1}. ${item.name}\n    Size: ${item.size || 'N/A'} | Qty: ${item.quantity} | €${item.price.toFixed(2)} × ${item.quantity} = *€${lineTotal}*`;
            }).join('\n\n')
            : '(See admin panel for order details)';

        // Calculate values
        const totalAmt = paymentInfo.amount.toFixed(2);

        const msg = `╔══════════════════════════╗
       *SECOND THRIFT*
         _Order Invoice_
╚══════════════════════════╝

📋 *Invoice No:* ${paymentInfo.reference}
📅 *Date:* ${orderDate} at ${orderTime}

━━━━━━━━━━━━━━━━━━

👤 *CUSTOMER*
Name: ${address.name}
Email: ${user?.email || 'N/A'}
Phone: ${address.phone}

━━━━━━━━━━━━━━━━━━

📦 *ORDER ITEMS*

${orderItemsList}

━━━━━━━━━━━━━━━━━━

💰 *TOTAL*
*€${totalAmt}*
_(All inclusive — no extra charges)_

━━━━━━━━━━━━━━━━━━

📍 *SHIPPING ADDRESS*
${address.name}
${address.street}
${address.city}, ${address.postalCode}
${address.region}
${address.country}
📱 ${address.phone}

━━━━━━━━━━━━━━━━━━

💳 *Payment:* Bank Transfer
✅ *Status:* Order Placed

━━━━━━━━━━━━━━━━━━
_Thank you for shopping with Second Thrift!_`;

        window.open(`https://wa.me/919909527515?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handlePlaceOrder = async () => {
        if (!user) { toast.error('Please login to place order'); navigate('/login'); return; }
        if (!address.name || !address.street || !address.city || !address.postalCode || !address.country || !address.region || !address.phone) {
            toast.error('Please fill in all address fields'); return;
        }
        setLoading(true);
        try {
            const orderData = {
                userId: user.uid, userEmail: user.email,
                items: items.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size })),
                shippingAddress: address, subtotal: total, shipping: 0, tax: 0, total,
            };

            let orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
                orderId = await Promise.race([createOrder(orderData), timeoutPromise]);
            } catch (e) {
                console.warn('Firestore save failed, using local ID', e);
            }

            const payment = getPaymentDetails(orderId, total);
            setPaymentInfo({ ...payment, orderId });
            setOrderItems([...items]); // Save items before clearing cart
            clearCart();
            setStep(4);
            toast.success('Order placed! Complete payment via bank transfer.');
        } catch (err) {
            console.error(err);
            toast.error('Failed to place order.');
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

                        {/* ========== STEP 3: PAYMENT (Simple) ========== */}
                        {step === 3 && (
                            <motion.div className="checkout-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2>Payment</h2>
                                <div className="wise-simple-card">
                                    <div className="wise-simple-header">
                                        <div className="wise-badge"><span className="wise-brand">wise</span></div>
                                        <span>Secure Payment</span>
                                    </div>
                                    <p className="wise-simple-desc">
                                        Your payment will be processed through <strong>Wise</strong> — the trusted international payment platform.
                                        You can pay using <strong>bank transfer, credit card, or debit card</strong>.
                                    </p>
                                    <div className="wise-simple-total">
                                        <span>Total Amount</span>
                                        <strong>{formatPrice(total)}</strong>
                                    </div>
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                                    <button className="btn btn-wise btn-lg" onClick={handlePlaceOrder} disabled={loading}>
                                        {loading ? 'Placing Order...' : `Pay ${formatPrice(total)} via Wise`}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ========== STEP 4: ORDER CONFIRMED ========== */}
                        {step === 4 && paymentInfo && (
                            <motion.div className="checkout-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="confirmation-header">
                                    <div className="confirmation-icon"><FiCheck size={32} /></div>
                                    <h2>Order Placed Successfully!</h2>
                                    <p>Complete your payment using the details below</p>
                                </div>

                                {/* Wise Payment Details */}
                                <div className="wise-payment-card">
                                    <div className="wise-payment-header">
                                        <div className="wise-badge"><span className="wise-brand">wise</span></div>
                                        <span className="wise-payment-amount">{formatPrice(paymentInfo.amount)}</span>
                                    </div>

                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 16px', lineHeight: 1.5 }}>
                                        Send payment using Wise or bank transfer. You can pay with <strong>card, bank transfer, or Wise balance</strong>.
                                    </p>

                                    <div className="wise-payment-details">
                                        <div className="wise-detail-row" onClick={() => copyToClipboard(paymentInfo.accountHolder, 'Account Holder')}>
                                            <div className="wise-detail-label">Account Holder</div>
                                            <div className="wise-detail-value">
                                                <strong>{paymentInfo.accountHolder}</strong>
                                                <FiCopy size={14} />
                                            </div>
                                        </div>
                                        <div className="wise-detail-row" onClick={() => copyToClipboard(paymentInfo.iban, 'IBAN')}>
                                            <div className="wise-detail-label">IBAN</div>
                                            <div className="wise-detail-value">
                                                <strong style={{ letterSpacing: '1px' }}>{paymentInfo.iban}</strong>
                                                <FiCopy size={14} />
                                            </div>
                                        </div>
                                        <div className="wise-detail-row" onClick={() => copyToClipboard(paymentInfo.bic, 'BIC / SWIFT')}>
                                            <div className="wise-detail-label">BIC / SWIFT</div>
                                            <div className="wise-detail-value">
                                                <strong>{paymentInfo.bic}</strong>
                                                <FiCopy size={14} />
                                            </div>
                                        </div>
                                        <div className="wise-detail-row" onClick={() => copyToClipboard(paymentInfo.amount.toFixed(2), 'Amount')}>
                                            <div className="wise-detail-label">Amount (EUR)</div>
                                            <div className="wise-detail-value">
                                                <strong>€{paymentInfo.amount.toFixed(2)}</strong>
                                                <FiCopy size={14} />
                                            </div>
                                        </div>
                                        <div className="wise-detail-row" onClick={() => copyToClipboard(paymentInfo.reference, 'Reference')}>
                                            <div className="wise-detail-label">Reference <span style={{ color: 'var(--error)', fontSize: '11px' }}>(Required)</span></div>
                                            <div className="wise-detail-value">
                                                <strong className="wise-ref">{paymentInfo.reference}</strong>
                                                <FiCopy size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <a href="https://wise.com/pay/business/ketanbhaisureshbhaigorasava" target="_blank" rel="noopener noreferrer" className="btn btn-wise btn-lg w-full">
                                        <FiExternalLink /> Open Wise & Pay
                                    </a>

                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>Bank:</strong> {paymentInfo.bankName}<br />
                                        <span style={{ fontSize: '12px' }}>{paymentInfo.bankAddress}</span>
                                    </div>

                                    <div className="wise-accepted">
                                        <span>Accepted:</span>
                                        <span>Bank Transfer</span>
                                        <span>Credit Card</span>
                                        <span>Debit Card</span>
                                    </div>
                                </div>

                                {/* Send Shipping Details */}
                                <div className="shipping-whatsapp-card">
                                    <h3>Send Shipping Details to Admin</h3>
                                    <p>Send your order & shipping info to our team so we can ship your order.</p>
                                    <button className="btn btn-whatsapp btn-lg w-full" onClick={sendShippingToWhatsApp}>
                                        <FaWhatsapp size={18} /> Send via WhatsApp
                                    </button>
                                </div>

                                <div className="confirmation-actions">
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
                                <div className="wise-mini-badge">
                                    <span className="wise-brand-sm">wise</span>
                                    <span>Secure Payment</span>
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
