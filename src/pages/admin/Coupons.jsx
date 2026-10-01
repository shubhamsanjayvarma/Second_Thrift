import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiTag, FiPlus, FiTrash2, FiEdit2, FiCopy, FiCheck, FiSearch,
    FiCalendar, FiPercent, FiDollarSign, FiTruck, FiAlertCircle, FiX,
    FiClock, FiTrendingUp, FiShoppingBag, FiLayers
} from 'react-icons/fi';
import { useToast } from '../../components/common/Toast';
import {
    subscribeToCoupons, createCoupon, updateCoupon,
    deleteCoupon, toggleCouponStatus
} from '../../services/coupons';
import './Admin.css';

const PREDEFINED_CATEGORIES = [
    { slug: 'jeans', label: 'Jeans & Denim' },
    { slug: 'shorts', label: 'Shorts' },
    { slug: 'outerwear', label: 'Outerwear & Jackets' },
    { slug: 'hip-hop', label: 'Hip Hop & Streetwear' },
    { slug: 'vintage', label: 'Vintage Collections' },
    { slug: 'bulk-deals', label: 'Bulk & Bales' },
    { slug: 'designer', label: 'Designer & Archive' },
];

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [copiedCode, setCopiedCode] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [saving, setSaving] = useState(false);

    const toast = useToast();

    // Form state
    const [form, setForm] = useState({
        code: '',
        description: '',
        type: 'percentage',
        value: '',
        maxDiscountAmount: '',
        minOrderValue: '',
        minQuantity: '',
        startDate: '',
        expiryDate: '',
        usageLimit: '',
        perUserLimit: '1',
        applicableCategories: [],
        isActive: true,
    });

    useEffect(() => {
        const unsubscribe = subscribeToCoupons((data) => {
            setCoupons(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setForm({
            code: '',
            description: '',
            type: 'percentage',
            value: '',
            maxDiscountAmount: '',
            minOrderValue: '',
            minQuantity: '',
            startDate: '',
            expiryDate: '',
            usageLimit: '',
            perUserLimit: '1',
            applicableCategories: [],
            isActive: true,
        });
        setEditingCoupon(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code || '',
            description: coupon.description || '',
            type: coupon.type || 'percentage',
            value: coupon.value !== undefined ? String(coupon.value) : '',
            maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '',
            minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : '',
            minQuantity: coupon.minQuantity ? String(coupon.minQuantity) : '',
            startDate: coupon.startDate ? coupon.startDate.slice(0, 16) : '',
            expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 16) : '',
            usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
            perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : '1',
            applicableCategories: Array.isArray(coupon.applicableCategories) ? coupon.applicableCategories : [],
            isActive: coupon.isActive !== false,
        });
        setShowModal(true);
    };

    const generateRandomCode = (prefix = 'THRIFT') => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setForm(prev => ({ ...prev, code: `${prefix}${code}` }));
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success(`Coupon code "${code}" copied!`);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleToggleStatus = async (coupon) => {
        try {
            await toggleCouponStatus(coupon.id, coupon.isActive);
            toast.success(`Coupon "${coupon.code}" ${coupon.isActive ? 'paused' : 'activated'}.`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (coupon) => {
        if (!window.confirm(`Are you sure you want to permanently delete coupon "${coupon.code}"?`)) {
            return;
        }
        try {
            await deleteCoupon(coupon.id);
            toast.success(`Coupon "${coupon.code}" deleted.`);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to delete coupon');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const codeTrimmed = (form.code || '').trim().toUpperCase();
        if (!codeTrimmed) {
            toast.error('Please enter a coupon code');
            return;
        }

        const val = parseFloat(form.value);
        if (form.type !== 'shipping' && (isNaN(val) || val <= 0)) {
            toast.error('Please enter a valid discount value greater than 0');
            return;
        }

        if (form.type === 'percentage' && val > 100) {
            toast.error('Percentage discount cannot exceed 100%');
            return;
        }

        if (form.startDate && form.expiryDate && new Date(form.startDate) >= new Date(form.expiryDate)) {
            toast.error('Expiry date must be after the start date');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                code: codeTrimmed,
                description: form.description,
                type: form.type,
                value: form.type === 'shipping' ? 0 : val,
                maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
                minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : 0,
                minQuantity: form.minQuantity ? parseInt(form.minQuantity, 10) : 0,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
                usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
                perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit, 10) : 1,
                applicableCategories: form.applicableCategories,
                isActive: form.isActive,
            };

            if (editingCoupon) {
                await updateCoupon(editingCoupon.id, payload);
                toast.success(`Coupon "${codeTrimmed}" updated successfully!`);
            } else {
                await createCoupon(payload);
                toast.success(`Coupon "${codeTrimmed}" created successfully!`);
            }

            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error('Save coupon error:', err);
            toast.error(err.message || 'Failed to save coupon');
        } finally {
            setSaving(false);
        }
    };

    const toggleCategory = (slug) => {
        setForm(prev => {
            const current = prev.applicableCategories || [];
            if (current.includes(slug)) {
                return { ...prev, applicableCategories: current.filter(s => s !== slug) };
            } else {
                return { ...prev, applicableCategories: [...current, slug] };
            }
        });
    };

    // Calculate coupon operational status
    const getCouponStatus = (coupon) => {
        if (!coupon.isActive) return { label: 'Paused', color: 'gray', badge: 'inactive' };

        const now = new Date();
        if (coupon.startDate && now < new Date(coupon.startDate)) {
            return { label: 'Scheduled', color: 'blue', badge: 'scheduled' };
        }
        if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
            return { label: 'Expired', color: 'red', badge: 'expired' };
        }
        if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
            return { label: 'Limit Reached', color: 'orange', badge: 'limit' };
        }
        return { label: 'Active', color: 'green', badge: 'active' };
    };

    // Metrics calculations
    const totalCoupons = coupons.length;
    const activeCouponsCount = coupons.filter(c => getCouponStatus(c).badge === 'active').length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const totalSavedEst = coupons.reduce((sum, c) => {
        if (Array.isArray(c.redeemedBy)) {
            return sum + c.redeemedBy.reduce((sub, r) => sub + (Number(r.discountAmount) || 0), 0);
        }
        return sum;
    }, 0);

    // Filtering
    const filteredCoupons = coupons.filter(coupon => {
        const status = getCouponStatus(coupon).badge;
        const matchesSearch = (coupon.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (coupon.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesType = typeFilter === 'all' || coupon.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="admin-page">
            {/* Page Header */}
            <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiTag /> Discount Coupons & Promo Codes
                    </h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                        Create limited-time percentage deals, fixed cash discounts, and free shipping promotions.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FiPlus size={16} /> Create Coupon
                </button>
            </div>

            {/* Metrics Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Total Coupons</span>
                        <FiTag />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem' }}>{totalCoupons}</div>
                </div>

                <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#10b981', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Active Now</span>
                        <FiClock />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', marginTop: '0.4rem' }}>{activeCouponsCount}</div>
                </div>

                <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#3b82f6', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Total Uses</span>
                        <FiShoppingBag />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.4rem' }}>{totalRedemptions}</div>
                </div>

                <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f59e0b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Discounts Given</span>
                        <FiTrendingUp />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.4rem' }}>
                        €{totalSavedEst.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--admin-surface)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
                    <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by code or description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="expired">Expired</option>
                        <option value="limit">Limit Reached</option>
                        <option value="inactive">Paused</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--admin-border)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                    >
                        <option value="all">All Types</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Cash (€)</option>
                        <option value="shipping">Free Shipping</option>
                    </select>
                </div>
            </div>

            {/* Coupons List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                    Loading coupons...
                </div>
            ) : filteredCoupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--admin-surface)', borderRadius: '12px', border: '1px dashed var(--admin-border)' }}>
                    <FiTag size={40} style={{ color: 'var(--admin-text-muted)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>No coupons found</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', maxWidth: '400px', margin: '0 auto 1rem auto' }}>
                        {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                            ? 'No coupons match your filter criteria. Try resetting filters.'
                            : 'You have not created any discount coupons yet. Create your first promotional code to boost conversions!'}
                    </p>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <FiPlus size={16} /> Create Coupon
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filteredCoupons.map((coupon) => {
                        const status = getCouponStatus(coupon);
                        const usageRatio = coupon.usageLimit ? (coupon.usedCount || 0) / coupon.usageLimit : 0;

                        return (
                            <motion.div
                                key={coupon.id}
                                layout
                                style={{
                                    background: 'var(--admin-surface)',
                                    border: '1px solid var(--admin-border)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                            >
                                <div>
                                    {/* Card Header: Code + Status Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontFamily: 'monospace',
                                                fontSize: '1.15rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.08em',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                color: '#fff',
                                            }}>
                                                {coupon.code}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(coupon.code)}
                                                title="Copy code"
                                                style={{ background: 'none', border: 'none', color: copiedCode === coupon.code ? '#10b981' : 'var(--admin-text-muted)', cursor: 'pointer', padding: '4px' }}
                                            >
                                                {copiedCode === coupon.code ? <FiCheck size={16} /> : <FiCopy size={16} />}
                                            </button>
                                        </div>

                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            background: status.badge === 'active' ? 'rgba(16, 185, 129, 0.15)' :
                                                status.badge === 'scheduled' ? 'rgba(59, 130, 246, 0.15)' :
                                                status.badge === 'expired' ? 'rgba(239, 68, 68, 0.15)' :
                                                status.badge === 'limit' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.08)',
                                            color: status.badge === 'active' ? '#10b981' :
                                                status.badge === 'scheduled' ? '#60a5fa' :
                                                status.badge === 'expired' ? '#f87171' :
                                                status.badge === 'limit' ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                                            border: `1px solid ${
                                                status.badge === 'active' ? 'rgba(16, 185, 129, 0.3)' :
                                                status.badge === 'scheduled' ? 'rgba(59, 130, 246, 0.3)' :
                                                status.badge === 'expired' ? 'rgba(239, 68, 68, 0.3)' :
                                                status.badge === 'limit' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.1)'
                                            }`,
                                        }}>
                                            ● {status.label}
                                        </span>
                                    </div>

                                    {/* Discount Value Highlight */}
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.4rem' }}>
                                        {coupon.type === 'percentage' && `${coupon.value}% OFF`}
                                        {coupon.type === 'fixed' && `€${Number(coupon.value).toFixed(2)} OFF`}
                                        {coupon.type === 'shipping' && `🚚 FREE SHIPPING`}
                                        {coupon.type === 'percentage' && coupon.maxDiscountAmount && (
                                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--admin-text-muted)', marginLeft: '6px' }}>
                                                (Up to €{coupon.maxDiscountAmount})
                                            </span>
                                        )}
                                    </div>

                                    {coupon.description && (
                                        <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '0.9rem', lineHeight: '1.4' }}>
                                            {coupon.description}
                                        </p>
                                    )}

                                    {/* Conditions & Details */}
                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '1rem' }}>
                                        {coupon.minOrderValue > 0 && (
                                            <div>🛒 Minimum Order: <strong>€{coupon.minOrderValue.toFixed(2)}</strong></div>
                                        )}
                                        {coupon.minQuantity > 0 && (
                                            <div>📦 Minimum Quantity: <strong>{coupon.minQuantity} items</strong></div>
                                        )}
                                        {coupon.expiryDate && (
                                            <div>
                                                ⏳ Expires: <strong>{new Date(coupon.expiryDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                                            </div>
                                        )}
                                        {coupon.startDate && new Date(coupon.startDate) > new Date() && (
                                            <div>
                                                📅 Starts: <strong>{new Date(coupon.startDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                                            </div>
                                        )}
                                        {Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                                <span>Target:</span>
                                                {coupon.applicableCategories.map(cat => (
                                                    <span key={cat} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Usage Limit Bar */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                                            <span>Redemptions</span>
                                            <span>
                                                <strong>{coupon.usedCount || 0}</strong> {coupon.usageLimit ? `/ ${coupon.usageLimit} uses` : 'uses (Unlimited)'}
                                            </span>
                                        </div>
                                        {coupon.usageLimit && (
                                            <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, usageRatio * 100)}%`,
                                                        background: usageRatio >= 1 ? '#ef4444' : '#10b981',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className={`btn ${coupon.isActive ? 'btn-ghost' : 'btn-outline'} btn-sm`}
                                        onClick={() => handleToggleStatus(coupon)}
                                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    >
                                        {coupon.isActive ? 'Pause' : 'Activate'}
                                    </button>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => openEditModal(coupon)}
                                            title="Edit Coupon"
                                            style={{ padding: '6px 8px' }}
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleDelete(coupon)}
                                            title="Delete Coupon"
                                            style={{ padding: '6px 8px', color: '#ef4444' }}
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Coupon Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="admin-modal-overlay" style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem',
                        overflowY: 'auto',
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                background: '#12131a',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '14px',
                                maxWidth: '620px',
                                width: '100%',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <FiTag /> {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: '4px' }}
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Modal Body Form */}
                            <form onSubmit={handleSave} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Coupon Code & Random Generator */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                        Coupon Code *
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. VINTAGE20, THRIFT10, FREESHIP"
                                            value={form.code}
                                            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid var(--admin-border)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontFamily: 'monospace',
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.05em',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => generateRandomCode()}
                                            style={{ whiteSpace: 'nowrap', padding: '0 12px' }}
                                        >
                                            🎲 Random Code
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                        Description / Promotional Note
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 20% off on all vintage jeans & jackets for weekend drop"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                                    />
                                </div>

                                {/* Discount Type Selection */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                                        Discount Type *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className={`btn ${form.type === 'percentage' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setForm({ ...form, type: 'percentage' })}
                                            style={{ padding: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                        >
                                            <FiPercent size={18} />
                                            <span>Percentage (%)</span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn ${form.type === 'fixed' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setForm({ ...form, type: 'fixed' })}
                                            style={{ padding: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                        >
                                            <FiDollarSign size={18} />
                                            <span>Fixed Amount (€)</span>
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn ${form.type === 'shipping' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setForm({ ...form, type: 'shipping', value: '0' })}
                                            style={{ padding: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                        >
                                            <FiTruck size={18} />
                                            <span>Free Shipping</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Discount Value & Optional Cap */}
                                {form.type !== 'shipping' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: form.type === 'percentage' ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                                {form.type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Cash Amount (€) *'}
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="0.01"
                                                step="0.01"
                                                max={form.type === 'percentage' ? '100' : '10000'}
                                                placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 15.00'}
                                                value={form.value}
                                                onChange={e => setForm({ ...form, value: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}
                                            />
                                        </div>

                                        {form.type === 'percentage' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                                    Max Discount Cap (€) (Optional)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    placeholder="e.g. 50.00 (Leave empty for no cap)"
                                                    value={form.maxDiscountAmount}
                                                    onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })}
                                                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Minimum Spend & Quantity Requirements */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Minimum Cart Subtotal (€)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g. 75.00 (0 = no minimum)"
                                            value={form.minOrderValue}
                                            onChange={e => setForm({ ...form, minOrderValue: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Minimum Cart Quantity (Items)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 2 (0 = no minimum)"
                                            value={form.minQuantity}
                                            onChange={e => setForm({ ...form, minQuantity: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Schedule & Expiry Timestamps */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Start Date & Time (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.startDate}
                                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Expiry Date & Time (Optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.expiryDate}
                                            onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Usage Limits */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Total Usage Limit (Overall)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g. 50 (Empty = Unlimited)"
                                            value={form.usageLimit}
                                            onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '6px' }}>
                                            Uses Allowed Per Customer
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="1 (Default: 1 use per customer)"
                                            value={form.perUserLimit}
                                            onChange={e => setForm({ ...form, perUserLimit: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--admin-border)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Applicable Categories Filter */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                                        Restrict to Specific Categories (Leave unselected for ALL store items)
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {PREDEFINED_CATEGORIES.map(cat => {
                                            const selected = form.applicableCategories?.includes(cat.slug);
                                            return (
                                                <button
                                                    key={cat.slug}
                                                    type="button"
                                                    onClick={() => toggleCategory(cat.slug)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        background: selected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                                                        color: selected ? '#f59e0b' : 'rgba(255,255,255,0.7)',
                                                        border: `1px solid ${selected ? 'rgba(245, 158, 11, 0.5)' : 'var(--admin-border)'}`,
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {selected ? '✓ ' : ''}{cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
                                    <input
                                        type="checkbox"
                                        id="modal-is-active"
                                        checked={form.isActive}
                                        onChange={e => setForm({ ...form, isActive: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="modal-is-active" style={{ fontSize: '0.85rem', color: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                                        Activate coupon immediately
                                    </label>
                                </div>

                                {/* Modal Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                        style={{ minWidth: '130px' }}
                                    >
                                        {saving ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="spinner" style={{ width: 14, height: 14 }} /> Saving...
                                            </span>
                                        ) : (
                                            editingCoupon ? 'Update Coupon' : 'Create Coupon'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminCoupons;
