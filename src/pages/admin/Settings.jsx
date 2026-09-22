import { useState, useEffect } from 'react';
import { FiSearch, FiEdit2, FiCheck, FiTrash2, FiPlus, FiRotateCcw, FiGlobe, FiPackage, FiMapPin, FiX, FiMail, FiSend } from 'react-icons/fi';
import { useToast } from '../../components/common/Toast';
import { getSettings, updateSettings, getDefaultSettings, DEFAULT_USA_WEIGHT_TIERS, DEFAULT_EXCESS_PER_KG_RATE } from '../../services/settings';
import { ALL_COUNTRIES } from '../../utils/helpers';
import './Admin.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shippingTab, setShippingTab] = useState('country'); // 'country' | 'weight' | 'regional'
    const [countrySearch, setCountrySearch] = useState('');
    const [editingCountryIdx, setEditingCountryIdx] = useState(null);
    const [editingTierIdx, setEditingTierIdx] = useState(null);
    const [showAddCountry, setShowAddCountry] = useState(false);
    const [newCountryName, setNewCountryName] = useState('');
    const [newCountryRate, setNewCountryRate] = useState('10.00');
    const [newCountryFree, setNewCountryFree] = useState('150');
    const [sendingTestEmail, setSendingTestEmail] = useState(false);
    const [testEmailRecipient, setTestEmailRecipient] = useState('');
    const toast = useToast();

    // Load settings from Firebase on mount
    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await getSettings();
                setSettings(data);
            } catch (err) {
                console.error('Failed to load settings:', err);
                setSettings(getDefaultSettings());
                toast.error('Failed to load settings, using defaults');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Save settings to Firebase
    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSettings(settings);
            toast.success('Settings saved to Firebase! Changes are now live on the store.');
        } catch (err) {
            console.error('Failed to save settings:', err);
            toast.error('Failed to save settings: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const updateEmailNotification = (field, value) => {
        setSettings(prev => ({
            ...prev,
            emailNotifications: {
                ...(prev.emailNotifications || {}),
                [field]: value,
            },
        }));
    };

    const handleSendTestEmail = async () => {
        const targetEmail = testEmailRecipient.trim() || settings?.emailNotifications?.adminNotificationEmail || settings?.emailNotifications?.senderEmail || 'secondthriftt39@gmail.com';
        setSendingTestEmail(true);
        try {
            toast.loading(`Sending test email to ${targetEmail}...`, { id: 'test-email-toast' });
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/test-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetEmail,
                    smtpSettings: settings?.emailNotifications || {},
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.simulated) {
                    toast.info(`Email simulated: ${data.message} (Add 16-char Google App Password to send real Gmails)`, { id: 'test-email-toast', duration: 6000 });
                } else {
                    toast.success(`Test email successfully delivered to ${targetEmail}!`, { id: 'test-email-toast' });
                }
            } else {
                toast.error(`Email delivery failed: ${data.error || 'Check SMTP credentials'}`, { id: 'test-email-toast', duration: 6000 });
            }
        } catch (err) {
            console.error('Test email error:', err);
            toast.error(`Error: ${err.message}`, { id: 'test-email-toast' });
        } finally {
            setSendingTestEmail(false);
        }
    };

    const updateSocial = (field, value) => {
        setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }));
    };

    const updateShippingRate = (idx, field, value) => {
        const newRates = [...(settings.shippingRates || [])];
        newRates[idx] = { ...newRates[idx], [field]: value };
        updateField('shippingRates', newRates);
    };

    const removeShippingRate = (idx) => {
        const removed = settings.shippingRates?.[idx]?.country;
        setSettings(prev => ({
            ...prev,
            shippingRates: prev.shippingRates.filter((_, i) => i !== idx)
        }));
        if (editingCountryIdx === idx) setEditingCountryIdx(null);
        toast.info(`Removed shipping rate for ${removed || 'country'}`);
    };

    const handleAddCountryRate = (e) => {
        e.preventDefault();
        const trimmed = newCountryName.trim();
        if (!trimmed) {
            toast.error('Please enter a country name');
            return;
        }
        const currentRates = settings.shippingRates || [];
        if (currentRates.some(r => r.country?.toLowerCase() === trimmed.toLowerCase())) {
            toast.error(`A rate for ${trimmed} already exists. Click the Edit button in the list to change it.`);
            return;
        }
        const newEntry = {
            country: trimmed,
            rate: parseFloat(newCountryRate) || 0,
            freeThreshold: parseFloat(newCountryFree) || 0,
        };
        updateField('shippingRates', [...currentRates, newEntry]);
        setNewCountryName('');
        setNewCountryRate('10.00');
        setNewCountryFree('150');
        setShowAddCountry(false);
        toast.success(`Added shipping rate for ${newEntry.country}`);
    };

    const updateRegionalShipping = (regionKey, field, value) => {
        const defaultReg = {
            europe: { rate: 0, label: 'Europe (Included / Free)', freeThreshold: 100 },
            usa: { rate: 20.00, label: 'United States (Express Courier)', freeThreshold: 0, excessPerKgRate: DEFAULT_EXCESS_PER_KG_RATE, weightTiers: DEFAULT_USA_WEIGHT_TIERS },
            restOfWorld: { rate: 25.00, label: 'Rest of World (Standard International)', freeThreshold: 200 },
        };
        const current = { ...defaultReg, ...(settings.regionalShipping || {}) };
        setSettings(prev => ({
            ...prev,
            regionalShipping: {
                ...current,
                [regionKey]: {
                    ...current[regionKey],
                    [field]: value
                }
            }
        }));
    };

    const getUsaTiers = () => {
        if (settings?.regionalShipping?.usa?.weightTiers && settings.regionalShipping.usa.weightTiers.length > 0) {
            return settings.regionalShipping.usa.weightTiers;
        }
        return DEFAULT_USA_WEIGHT_TIERS;
    };

    const getExcessPerKgRate = () => {
        return settings?.regionalShipping?.usa?.excessPerKgRate ?? DEFAULT_EXCESS_PER_KG_RATE;
    };

    const addUsaWeightTier = () => {
        const tiers = getUsaTiers();
        const lastMax = tiers.length > 0 ? Number(tiers[tiers.length - 1].maxWeight) : 10;
        const nextMax = lastMax + 10;
        const newTier = {
            maxWeight: nextMax,
            rate: 50.00,
            label: `Up to ${nextMax} KG`,
        };
        updateRegionalShipping('usa', 'weightTiers', [...tiers, newTier]);
        setEditingTierIdx(tiers.length);
    };

    const updateUsaWeightTier = (idx, field, value) => {
        const tiers = [...getUsaTiers()];
        tiers[idx] = { ...tiers[idx], [field]: value };
        if (field === 'maxWeight' && (!tiers[idx].label || tiers[idx].label.startsWith('Up to '))) {
            tiers[idx].label = `Up to ${value} KG`;
        }
        updateRegionalShipping('usa', 'weightTiers', tiers);
    };

    const removeUsaWeightTier = (idx) => {
        const tiers = getUsaTiers().filter((_, i) => i !== idx);
        updateRegionalShipping('usa', 'weightTiers', tiers);
        if (editingTierIdx === idx) setEditingTierIdx(null);
    };

    const resetUsaWeightTiers = () => {
        updateRegionalShipping('usa', 'weightTiers', DEFAULT_USA_WEIGHT_TIERS);
        toast.info('Reset weight tiers to defaults');
    };

    if (loading || !settings) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>
                <span className="spinner" style={{ width: 24, height: 24 }} />
                <p style={{ marginTop: '0.75rem' }}>Loading settings from Firebase...</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h1 className="admin-page-title" style={{ marginBottom: 0 }}>Store Settings</h1>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save to Firebase'}
                </button>
            </div>

            <div className="settings-section">
                <h3>Hero Section</h3>
                <div className="settings-form">
                    <label>Hero Title <input value={settings.heroTitle} onChange={e => updateField('heroTitle', e.target.value)} /></label>
                    <label>Hero Subtitle <textarea rows={3} value={settings.heroSubtitle} onChange={e => updateField('heroSubtitle', e.target.value)} /></label>
                    <label>CTA Button Text <input value={settings.heroCTA} onChange={e => updateField('heroCTA', e.target.value)} /></label>
                </div>
            </div>

            <div className="settings-section">
                <h3>📢 Announcement Banner</h3>
                <div className="settings-form">
                    <label>Banner Text <input value={settings.bannerText} onChange={e => updateField('bannerText', e.target.value)} /></label>
                    <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <input type="checkbox" checked={settings.bannerActive} onChange={e => updateField('bannerActive', e.target.checked)} style={{ width: 'auto' }} />
                        Show announcement banner
                    </label>
                </div>
            </div>

            <div className="settings-section">
                <div className="shipping-mgmt-header">
                    <div>
                        <h3 style={{ margin: 0 }}>🚚 Shipping & Delivery Control Center</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            Full admin authority: Edit shipping charges country-wise, weight-wise, or by global region.
                        </p>
                    </div>

                    <div className="shipping-mgmt-tabs">
                        <button
                            type="button"
                            className={`shipping-mgmt-tab ${shippingTab === 'country' ? 'active' : ''}`}
                            onClick={() => setShippingTab('country')}
                        >
                            <FiMapPin size={14} /> Country-Wise Rates ({settings.shippingRates?.length || 0})
                        </button>
                        <button
                            type="button"
                            className={`shipping-mgmt-tab ${shippingTab === 'weight' ? 'active' : ''}`}
                            onClick={() => setShippingTab('weight')}
                        >
                            <FiPackage size={14} /> Weight-Wise Tiers ({getUsaTiers().length})
                        </button>
                        <button
                            type="button"
                            className={`shipping-mgmt-tab ${shippingTab === 'regional' ? 'active' : ''}`}
                            onClick={() => setShippingTab('regional')}
                        >
                            <FiGlobe size={14} /> Regional Defaults
                        </button>
                    </div>
                </div>

                {/* ==================== TAB 1: COUNTRY-WISE RATES ==================== */}
                {shippingTab === 'country' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            <div className="shipping-search-box">
                                <FiSearch className="shipping-search-icon" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search country (e.g. UK, Germany, USA, France, Canada)..."
                                    value={countrySearch}
                                    onChange={e => setCountrySearch(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowAddCountry(!showAddCountry)}
                            >
                                <FiPlus size={14} /> {showAddCountry ? 'Cancel' : 'Add Country Rate'}
                            </button>
                        </div>

                        {/* Add Country Form */}
                        {showAddCountry && (
                            <form onSubmit={handleAddCountryRate} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px', gap: '12px', alignItems: 'flex-end' }}>
                                <label style={{ margin: 0 }}>
                                    Country Name
                                    <input
                                        list="all-countries-list"
                                        placeholder="Type or select country"
                                        value={newCountryName}
                                        onChange={e => setNewCountryName(e.target.value)}
                                        required
                                    />
                                    <datalist id="all-countries-list">
                                        {ALL_COUNTRIES.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </label>
                                <label style={{ margin: 0 }}>
                                    Shipping Charge (€)
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={newCountryRate}
                                        onChange={e => setNewCountryRate(e.target.value)}
                                        required
                                    />
                                </label>
                                <label style={{ margin: 0 }}>
                                    Free Over (€)
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        placeholder="0 to disable"
                                        value={newCountryFree}
                                        onChange={e => setNewCountryFree(e.target.value)}
                                    />
                                </label>
                                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
                                    Save Rate
                                </button>
                            </form>
                        )}

                        {/* Table Column Labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) 130px 140px 140px', gap: '12px', padding: '0 12px 8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                            <span>Country</span>
                            <span>Shipping Charge</span>
                            <span>Free Shipping Over</span>
                            <span style={{ textAlign: 'right' }}>Actions</span>
                        </div>

                        {/* Country Rate Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(settings.shippingRates || [])
                                .filter(r => !countrySearch.trim() || r.country?.toLowerCase().includes(countrySearch.toLowerCase()))
                                .map((rate) => {
                                    const idx = (settings.shippingRates || []).indexOf(rate);
                                    const isEditing = editingCountryIdx === idx;

                                    return (
                                        <div key={rate.country || idx} className={`shipping-rate-row ${isEditing ? 'is-editing' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) 130px 140px 140px', gap: '12px', alignItems: 'center' }}>
                                            {/* Country */}
                                            <div>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={rate.country}
                                                        onChange={e => updateShippingRate(idx, 'country', e.target.value)}
                                                        style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#fff' }}>
                                                        {rate.country}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Shipping Charge */}
                                            <div>
                                                {isEditing ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={rate.rate}
                                                            onChange={e => updateShippingRate(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                            style={{ width: '100%', fontSize: '0.85rem', padding: '6px 20px 6px 8px' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>€</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: rate.rate === 0 ? 'var(--success)' : 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {rate.rate === 0 ? 'FREE (€0.00)' : `€${Number(rate.rate).toFixed(2)}`}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Free Threshold */}
                                            <div>
                                                {isEditing ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={rate.freeThreshold ?? 0}
                                                            onChange={e => updateShippingRate(idx, 'freeThreshold', parseFloat(e.target.value) || 0)}
                                                            placeholder="0 = off"
                                                            style={{ width: '100%', fontSize: '0.85rem', padding: '6px 20px 6px 8px' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>€</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: rate.freeThreshold > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                                        {rate.freeThreshold > 0 ? `Orders > €${rate.freeThreshold}` : 'Disabled'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {isEditing ? (
                                                    <button
                                                        type="button"
                                                        className="btn-save-inline"
                                                        onClick={() => setEditingCountryIdx(null)}
                                                        title="Done editing"
                                                    >
                                                        <FiCheck size={13} /> Done
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-edit-action"
                                                        onClick={() => setEditingCountryIdx(idx)}
                                                        title={`Edit shipping charge for ${rate.country}`}
                                                    >
                                                        <FiEdit2 size={12} /> Edit
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => removeShippingRate(idx)}
                                                    style={{ color: '#ff4444', padding: '0.4rem', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title={`Delete ${rate.country}`}
                                                >
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                            {(settings.shippingRates || []).filter(r => !countrySearch.trim() || r.country?.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                                    No countries matched "{countrySearch}". Click <strong>+ Add Country Rate</strong> above to add it.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== TAB 2: WEIGHT-WISE TIERS ==================== */}
                {shippingTab === 'weight' && (
                    <div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>⚖️</span> Weight-Based Tier Configuration (USA & Heavy Bales)
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                        Package weight is dynamically calculated from cart items (e.g. 10 KG bundle, 20 KG bale).
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetUsaWeightTiers} title="Reset to standard tiers">
                                        <FiRotateCcw size={12} /> Reset Defaults
                                    </button>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={addUsaWeightTier}>
                                        <FiPlus size={14} /> Add Weight Tier
                                    </button>
                                </div>
                            </div>

                            {/* Excess weight surcharge input */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <label style={{ margin: 0 }}>
                                    Excess Weight Surcharge (€ per extra KG)
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={getExcessPerKgRate()}
                                        onChange={e => updateRegionalShipping('usa', 'excessPerKgRate', parseFloat(e.target.value) || 0)}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Applied if order weight exceeds highest tier</span>
                                </label>
                                <label style={{ margin: 0 }}>
                                    USA Fallback Flat Rate (€)
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.regionalShipping?.usa?.rate ?? 20.00}
                                        onChange={e => updateRegionalShipping('usa', 'rate', parseFloat(e.target.value) || 0)}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used if no weight tier matches</span>
                                </label>
                            </div>
                        </div>

                        {/* Weight Tiers Table Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: '130px 130px 1fr 140px', gap: '12px', padding: '0 12px 8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                            <span>Max Weight</span>
                            <span>Shipping Rate</span>
                            <span>Tier Description / Label</span>
                            <span style={{ textAlign: 'right' }}>Actions</span>
                        </div>

                        {/* Weight Tier Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {getUsaTiers().map((tier, idx) => {
                                const isEditing = editingTierIdx === idx;

                                return (
                                    <div key={idx} className={`shipping-rate-row ${isEditing ? 'is-editing' : ''}`} style={{ display: 'grid', gridTemplateColumns: '130px 130px 1fr 140px', gap: '12px', alignItems: 'center' }}>
                                        {/* Max Weight */}
                                        <div>
                                            {isEditing ? (
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0.1"
                                                        value={tier.maxWeight}
                                                        onChange={e => updateUsaWeightTier(idx, 'maxWeight', parseFloat(e.target.value) || 0)}
                                                        style={{ width: '100%', fontSize: '0.85rem', padding: '6px 26px 6px 8px' }}
                                                    />
                                                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)', pointerEvents: 'none' }}>KG</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                                                    {tier.maxWeight} KG
                                                </span>
                                            )}
                                        </div>

                                        {/* Shipping Rate */}
                                        <div>
                                            {isEditing ? (
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={tier.rate}
                                                        onChange={e => updateUsaWeightTier(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                        style={{ width: '100%', fontSize: '0.85rem', padding: '6px 20px 6px 8px' }}
                                                    />
                                                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>€</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    €{Number(tier.rate).toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={tier.label || ''}
                                                    onChange={e => updateUsaWeightTier(idx, 'label', e.target.value)}
                                                    placeholder={`Up to ${tier.maxWeight} KG`}
                                                    style={{ width: '100%', fontSize: '0.85rem', padding: '6px 8px' }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {tier.label || `Up to ${tier.maxWeight} KG`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {isEditing ? (
                                                <button
                                                    type="button"
                                                    className="btn-save-inline"
                                                    onClick={() => setEditingTierIdx(null)}
                                                    title="Done editing"
                                                >
                                                    <FiCheck size={13} /> Done
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-edit-action"
                                                    onClick={() => setEditingTierIdx(idx)}
                                                    title={`Edit ${tier.label}`}
                                                >
                                                    <FiEdit2 size={12} /> Edit
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => removeUsaWeightTier(idx)}
                                                style={{ color: '#ff4444', padding: '0.4rem', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Delete tier"
                                            >
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '14px' }}>
                            💡 <em>Any order exceeding {Math.max(...getUsaTiers().map(t => Number(t.maxWeight) || 0))} KG will automatically apply the top tier rate plus €{getExcessPerKgRate()}/KG for the excess weight.</em>
                        </p>
                    </div>
                )}

                {/* ==================== TAB 3: REGIONAL DEFAULTS ==================== */}
                {shippingTab === 'regional' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Europe */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🇪🇺</span> Europe (Primary Market)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                <label style={{ margin: 0 }}>
                                    Europe Shipping Rate (€)
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.regionalShipping?.europe?.rate ?? 0}
                                        onChange={e => updateRegionalShipping('europe', 'rate', parseFloat(e.target.value) || 0)}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = Free European Delivery</span>
                                </label>
                                <label style={{ margin: 0 }}>
                                    Europe Free Shipping Threshold (€)
                                    <input
                                        type="number"
                                        step="1"
                                        value={settings.regionalShipping?.europe?.freeThreshold ?? (settings.freeShippingThreshold || 100)}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            updateRegionalShipping('europe', 'freeThreshold', val);
                                            updateField('freeShippingThreshold', val);
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* USA */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🇺🇸</span> United States Shipping
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                <label style={{ margin: 0 }}>
                                    USA Base Rate (€)
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.regionalShipping?.usa?.rate ?? 20.00}
                                        onChange={e => updateRegionalShipping('usa', 'rate', parseFloat(e.target.value) || 0)}
                                    />
                                </label>
                                <label style={{ margin: 0 }}>
                                    USA Free Shipping Threshold (€)
                                    <input
                                        type="number"
                                        step="1"
                                        placeholder="0 to disable"
                                        value={settings.regionalShipping?.usa?.freeThreshold ?? 0}
                                        onChange={e => updateRegionalShipping('usa', 'freeThreshold', parseFloat(e.target.value) || 0)}
                                    />
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = Disabled (no free shipping)</span>
                                </label>
                            </div>
                        </div>

                        {/* Rest of World */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🌐</span> Rest of the World
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                <label style={{ margin: 0 }}>
                                    Rest of World Rate (€)
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.regionalShipping?.restOfWorld?.rate ?? 25.00}
                                        onChange={e => updateRegionalShipping('restOfWorld', 'rate', parseFloat(e.target.value) || 0)}
                                    />
                                </label>
                                <label style={{ margin: 0 }}>
                                    Rest of World Free Threshold (€)
                                    <input
                                        type="number"
                                        step="1"
                                        value={settings.regionalShipping?.restOfWorld?.freeThreshold ?? 200}
                                        onChange={e => updateRegionalShipping('restOfWorld', 'freeThreshold', parseFloat(e.target.value) || 0)}
                                    />
                                </label>
                            </div>
                        </div>

                        <label>
                            Tax Rate (%)
                            <input
                                type="number"
                                value={settings.taxRate}
                                onChange={e => updateField('taxRate', parseFloat(e.target.value))}
                            />
                        </label>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0 }}>📧 Customer Order Email Notifications & Invoices</h3>
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: settings.emailNotifications?.enabled !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: settings.emailNotifications?.enabled !== false ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {settings.emailNotifications?.enabled !== false ? '● ACTIVE' : '○ DISABLED'}
                    </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                    Configure automatic email notifications sent to customers upon order placement with invoice details and order summary.
                </p>

                <div className="settings-form">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={settings.emailNotifications?.enabled !== false}
                                onChange={e => updateEmailNotification('enabled', e.target.checked)}
                                style={{ width: 'auto' }}
                            />
                            <span>Enable Order Confirmation Emails</span>
                        </label>

                        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={settings.emailNotifications?.notifyAdmin !== false}
                                onChange={e => updateEmailNotification('notifyAdmin', e.target.checked)}
                                style={{ width: 'auto' }}
                            />
                            <span>Send copy of new orders to Admin</span>
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        <label>
                            Sender Display Name
                            <input
                                value={settings.emailNotifications?.senderName || 'Second Thrift'}
                                onChange={e => updateEmailNotification('senderName', e.target.value)}
                                placeholder="Second Thrift"
                            />
                        </label>

                        <label>
                            Sender Email (From)
                            <input
                                value={settings.emailNotifications?.senderEmail || 'shivamajayverma@gmail.com'}
                                onChange={e => updateEmailNotification('senderEmail', e.target.value)}
                                placeholder="shivamajayverma@gmail.com"
                            />
                        </label>

                        <label>
                            Admin Notification Email
                            <input
                                value={settings.emailNotifications?.adminNotificationEmail || 'shivamajayverma@gmail.com'}
                                onChange={e => updateEmailNotification('adminNotificationEmail', e.target.value)}
                                placeholder="shivamajayverma@gmail.com"
                            />
                        </label>

                        <label>
                            Gmail App Password / SMTP Password
                            <input
                                type="password"
                                value={settings.emailNotifications?.smtpPass || ''}
                                onChange={e => updateEmailNotification('smtpPass', e.target.value)}
                                placeholder="e.g. abcd efgh ijkl mnop"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                💡 16-character Google App Password (from Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords)
                            </span>
                        </label>
                    </div>

                    <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(252, 196, 25, 0.04)', border: '1px solid rgba(252, 196, 25, 0.2)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <FiSend size={15} color="var(--primary)" />
                            <strong style={{ fontSize: '0.88rem', color: '#fff' }}>Test Email Delivery</strong>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                            Send a test order confirmation email to verify your Gmail SMTP connection immediately.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                type="email"
                                style={{ flex: 1, minWidth: '220px', maxWidth: '360px', margin: 0 }}
                                placeholder="Recipient email (defaults to admin)"
                                value={testEmailRecipient}
                                onChange={e => setTestEmailRecipient(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleSendTestEmail}
                                disabled={sendingTestEmail}
                            >
                                {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3>Payment (Wise)</h3>
                <div className="settings-form">
                    <label>Wise Email <input value={settings.wiseEmail} onChange={e => updateField('wiseEmail', e.target.value)} /></label>
                </div>
            </div>

            <div className="settings-section">
                <h3>WhatsApp</h3>
                <div className="settings-form">
                    <label>Owner WhatsApp Number <input value={settings.ownerWhatsApp} onChange={e => updateField('ownerWhatsApp', e.target.value)} placeholder="+491234567890" /></label>
                </div>
            </div>

            <div className="settings-section">
                <h3>About & Contact</h3>
                <div className="settings-form">
                    <label>About Text <textarea rows={4} value={settings.aboutText} onChange={e => updateField('aboutText', e.target.value)} /></label>
                    <label>Contact Email <input value={settings.contactEmail} onChange={e => updateField('contactEmail', e.target.value)} /></label>
                </div>
            </div>

            <div className="settings-section">
                <h3>Social Links</h3>
                <div className="settings-form">
                    <label>Instagram <input value={settings.socialLinks?.instagram || ''} onChange={e => updateSocial('instagram', e.target.value)} /></label>
                    <label>Facebook <input value={settings.socialLinks?.facebook || ''} onChange={e => updateSocial('facebook', e.target.value)} /></label>
                    <label>TikTok <input value={settings.socialLinks?.tiktok || ''} onChange={e => updateSocial('tiktok', e.target.value)} /></label>
                </div>
            </div>

            {/* Sticky save bar at bottom */}
            <div style={{ position: 'sticky', bottom: '1rem', padding: '1rem', background: 'rgba(17,17,24,0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', backdropFilter: 'blur(8px)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Changes save directly to Firebase</span>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;
