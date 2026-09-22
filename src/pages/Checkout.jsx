import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiPackage, FiCreditCard, FiCheck, FiSearch, FiChevronDown } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import { useToast } from '../components/common/Toast';
import { createOrder, updateOrderPaymentStatus } from '../services/orders';
import {
    formatPrice,
    formatCurrency,
    COUNTRIES_BY_REGION,
    calculateOrderTotals,
    getCurrencyForCountry,
    getPaymentCurrencyForCountry,
} from '../utils/helpers';
import { convertFromEur, getExchangeRates } from '../services/exchangeRates';
import './Checkout.css';

const Checkout = () => {
    const { items, clearCart } = useCart();
    const { user } = useAuth();
    const { isUS, settings } = useRegion();
    const toast = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orderInfo, setOrderInfo] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [exchangeRates, setExchangeRates] = useState({ EUR: 1 });
    const [ratesStale, setRatesStale] = useState(false);
    const countryRef = useRef(null);

    const [address, setAddress] = useState({
        name: '', street: '', city: '', postalCode: '',
        country: isUS ? 'United States' : 'Germany',
        region: '', phone: '',
    });

    // Handle Stripe return redirect
    useEffect(() => {
        const status = searchParams.get('status');
        const sessionId = searchParams.get('session_id');

        if (status === 'success' && sessionId) {
            // Verify the payment with our backend
            const verifyPayment = async () => {
                try {
                    toast.loading('Verifying payment...', { id: 'payment-toast' });
                    const apiUrl = import.meta.env.VITE_API_URL || '';
                    const res = await fetch(`${apiUrl}/api/stripe/verify/${sessionId}`);
                    const data = await res.json();

                    if (data.verified) {
                        setOrderInfo({
                            orderId: data.orderId || 'CONFIRMED',
                            total: data.amountTotal ? data.amountTotal / 100 : 0,
                            currency: data.currency?.toUpperCase() || 'EUR',
                        });
                        
                        // Mark order as paid in Firestore immediately so Admin Panel shows it
                        if (data.orderId) {
                            try {
                                await updateOrderPaymentStatus(data.orderId, 'paid', sessionId);
                            } catch (updateErr) {
                                console.error('Failed to update order status in Firestore:', updateErr);
                            }

                            // Trigger Order Confirmation Email to Customer
                            try {
                                fetch(`${apiUrl}/api/send-order-email`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ orderId: data.orderId }),
                                }).catch(err => console.warn('Order email trigger notice:', err.message));
                            } catch (emailErr) {
                                console.warn('Failed to call send-order-email:', emailErr.message);
                            }
                        }

                        setOrderItems([]);
                        clearCart();
                        setStep(4);
                        toast.success('Payment successful! Order confirmed.', { id: 'payment-toast' });
                    } else {
                        toast.error('Payment verification failed. Please contact support.', { id: 'payment-toast' });
                    }
                } catch (err) {
                    console.error('Payment verification error:', err);
                    toast.error('Could not verify payment. Please contact support.', { id: 'payment-toast' });
                }
            };
            verifyPayment();
        } else if (status === 'cancelled') {
            toast.error('Payment was cancelled.', { id: 'payment-toast' });
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

    useEffect(() => {
        let mounted = true;
        getExchangeRates().then(({ rates, stale }) => {
            if (!mounted) return;
            setExchangeRates(rates);
            setRatesStale(stale);
        });
        return () => { mounted = false; };
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

    const { subtotal, shipping, tax, total, shippingLabel, shippingZone, totalWeight } = calculateOrderTotals(items, address.country, settings);
    const localCurrency = getCurrencyForCountry(address.country);
    const paymentCurrency = getPaymentCurrencyForCountry(address.country);
    const localTotal = convertFromEur(total, localCurrency, exchangeRates);
    const paymentTotal = convertFromEur(total, paymentCurrency, exchangeRates);
    const exchangeRate = exchangeRates[localCurrency] || 1;
    const showConvertedTotal = address.country && localCurrency !== 'EUR';
    const paymentMethodsCopy = 'Cards, Apple Pay, Google Pay, and other methods supported by Stripe.';

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    const renderConvertedPrice = (eurAmount) => {
        const converted = convertFromEur(eurAmount, localCurrency, exchangeRates);
        return (
            <span className="converted-price">
                <strong>{formatPrice(eurAmount)}</strong>
                {showConvertedTotal && <small>Approx. {formatCurrency(converted, localCurrency)}</small>}
            </span>
        );
    };

    const handlePlaceOrder = async () => {
        if (!user) { toast.error('Please login to place order'); navigate('/login'); return; }
        if (!address.name || !address.street || !address.city || !address.postalCode || !address.country || !address.region || !address.phone) {
            toast.error('Please fill in all address fields'); return;
        }
        setLoading(true);

        try {
            // 1. Create order in Firestore first (status: pending)
            toast.loading('Creating your order...', { id: 'payment-toast' });

            const orderData = {
                userId: user.uid, userEmail: user.email,
                items: items.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity, size: i.size, weight: i.weight || null })),
                shippingAddress: address,
                subtotal,
                shipping,
                shippingLabel,
                shippingZone,
                totalWeight,
                tax: 0,
                total,
                displayCurrency: localCurrency,
                displayTotal: localTotal,
                paymentCurrency,
                paymentTotal,
                exchangeRate,
                paymentStatus: 'pending',
                paymentMethod: 'stripe',
            };

            const newOrderId = await createOrder(orderData);

            // 2. Create Stripe Checkout Session
            toast.loading('Redirecting to secure payment...', { id: 'payment-toast' });

            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: newOrderId,
                    items: items.map(i => ({
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                        size: i.size,
                    })),
                    shipping,
                    shippingCountry: address.country,
                    shippingLabel,
                    shippingAddress: address,
                    subtotal,
                    total: paymentTotal,
                    currency: paymentCurrency,
                    customerEmail: user.email,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to create payment session');
            }

            const { url, sessionId } = await res.json();

            // 3. Redirect to Stripe Checkout
            if (url) {
                try {
                    await updateOrderPaymentStatus(newOrderId, 'pending', sessionId);
                } catch (saveErr) {
                    console.error('Failed to save stripeSessionId to order:', saveErr);
                }
                window.location.href = url;
            } else {
                throw new Error('No checkout URL returned');
            }

        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to initialize payment. Please try again.', { id: 'payment-toast' });
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

                                    {address.country && (
                                        <div className="currency-preview">
                                            <span>Price display for {address.country}</span>
                                            <strong>{formatCurrency(localTotal, localCurrency)}</strong>
                                            <small>
                                                Store price is {formatPrice(total)}.
                                                {' Stripe will process your payment securely. Local currency shown is an estimate.'}
                                            </small>
                                            {ratesStale && <small>Using fallback exchange rates until live rates refresh.</small>}
                                        </div>
                                    )}

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
                                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span><strong>Delivery:</strong> {shippingLabel}</span>
                                            {totalWeight > 0 && shippingZone === 'usa' && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    Estimated parcel weight: <strong>{totalWeight.toFixed(1)} KG</strong>
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ color: shipping === 0 ? 'var(--success)' : 'var(--primary)', fontWeight: 600 }}>
                                            {shipping === 0 ? 'FREE / Included' : formatPrice(shipping)}
                                        </span>
                                    </div>
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
                                        <div className="wise-badge" style={{ background: '#635BFF', color: '#fff', fontSize: '10px', padding: '2px 6px' }}><span className="wise-brand">Stripe</span></div>
                                        <span>Secure Checkout</span>
                                    </div>
                                    <p className="wise-simple-desc">
                                        Your payment will be processed securely via <strong>Stripe</strong>.
                                        You can pay using credit card, debit card, Apple Pay, Google Pay, or other supported methods.
                                    </p>
                                    <div className="wise-simple-total">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="wise-simple-total" style={{ borderTop: 'none', paddingTop: 0 }}>
                                        <span>Shipping ({shippingLabel})</span>
                                        <span style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>
                                            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                                        </span>
                                    </div>
                                    <div className="wise-simple-total" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '12px' }}>
                                        <span>Total Amount</span>
                                        <strong>{formatPrice(total)}</strong>
                                    </div>
                                    {showConvertedTotal && (
                                        <div className="wise-simple-total" style={{ borderTop: 'none', paddingTop: 0, opacity: 0.7 }}>
                                            <span>Approx. in {localCurrency}</span>
                                            <span>{formatCurrency(localTotal, localCurrency)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                                    <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={loading}>
                                        {loading ? 'Redirecting to Stripe...' : `Pay ${formatPrice(total)} Now`}
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
                                    <h3 style={{ marginBottom: '16px' }}>Order #{(orderInfo.orderId || '').substring(0, 8).toUpperCase()}</h3>
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
                                <div className="summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                                    <span>Subtotal</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Shipping ({shippingLabel})</span>
                                    <span style={{ color: shipping === 0 ? 'var(--success)' : 'inherit', fontWeight: 600 }}>
                                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                                    </span>
                                </div>
                                <div className="summary-row summary-total"><span>Total</span><span>{formatPrice(total)}</span></div>
                                {shipping === 0 ? (
                                    <p className="free-shipping-note" style={{ color: 'var(--success)', marginTop: '8px' }}>✓ Shipping & taxes included</p>
                                ) : (
                                    <p className="free-shipping-note" style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.8rem' }}>📦 Tracked international courier</p>
                                )}
                                <div className="wise-mini-badge" style={{ background: 'rgba(99, 91, 255, 0.1)' }}>
                                    <span className="wise-brand-sm" style={{ color: '#635BFF' }}>Stripe</span>
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
