import { useState, useEffect } from 'react';
import { useToast } from '../../components/common/Toast';
import { getSettings, updateSettings, getDefaultSettings, DEFAULT_USA_WEIGHT_TIERS } from '../../services/settings';
import './Admin.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    const updateSocial = (field, value) => {
        setSettings(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [field]: value } }));
    };

    const addShippingRate = () => {
        setSettings(prev => ({
            ...prev,
            shippingRates: [...prev.shippingRates, { country: '', rate: 0 }]
        }));
    };

    const removeShippingRate = (idx) => {
        setSettings(prev => ({
            ...prev,
            shippingRates: prev.shippingRates.filter((_, i) => i !== idx)
        }));
    };

    const updateRegionalShipping = (regionKey, field, value) => {
        const defaultReg = {
            europe: { rate: 0, label: 'Europe (Included / Free)', freeThreshold: 100 },
            usa: { rate: 20.00, label: 'United States (Express Courier)', freeThreshold: 0, weightTiers: DEFAULT_USA_WEIGHT_TIERS },
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
    };

    const resetUsaWeightTiers = () => {
        updateRegionalShipping('usa', 'weightTiers', DEFAULT_USA_WEIGHT_TIERS);
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
                <h3>🌍 Regional Shipping & Rates (Europe vs USA)</h3>
                <div className="settings-form">
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 'var(--space-4)' }}>
                        <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🇺🇸</span> United States Shipping Rates
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            <label>
                                Fallback Flat Rate (€)
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.regionalShipping?.usa?.rate ?? 20.00}
                                    onChange={e => updateRegionalShipping('usa', 'rate', parseFloat(e.target.value) || 0)}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Used if no weight tier matches</span>
                            </label>
                            <label>
                                USA Free Shipping Threshold (€)
                                <input
                                    type="number"
                                    step="1"
                                    placeholder="0 to disable"
                                    value={settings.regionalShipping?.usa?.freeThreshold ?? 0}
                                    onChange={e => updateRegionalShipping('usa', 'freeThreshold', parseFloat(e.target.value) || 0)}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Set 0 to disable free shipping for USA</span>
                            </label>
                        </div>

                        {/* Weight Tiers Table */}
                        <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: 'var(--space-3)' }}>
                                <div>
                                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        ⚖️ USA Weight-Based Shipping Tiers (10 KG, 20 KG, etc.)
                                    </h5>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                        Shipping is computed from total cart weight. Set custom rates for 10 kg, 20 kg bundles, or add any custom weight tiers.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetUsaWeightTiers} title="Reset to standard tiers">
                                        ↺ Reset Defaults
                                    </button>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={addUsaWeightTier}>
                                        + Add Weight Tier
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '130px 120px 1fr 40px', gap: '10px', padding: '0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                                    <span>Max Weight</span>
                                    <span>Rate (€)</span>
                                    <span>Tier Description</span>
                                    <span></span>
                                </div>

                                {getUsaTiers().map((tier, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '130px 120px 1fr 40px', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.1"
                                                value={tier.maxWeight}
                                                onChange={e => updateUsaWeightTier(idx, 'maxWeight', parseFloat(e.target.value) || 0)}
                                                style={{ width: '100%', paddingRight: '28px' }}
                                                placeholder="e.g. 10"
                                            />
                                            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)', pointerEvents: 'none' }}>KG</span>
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={tier.rate}
                                                onChange={e => updateUsaWeightTier(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                style={{ width: '100%', paddingRight: '22px' }}
                                                placeholder="0.00"
                                            />
                                            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>€</span>
                                        </div>

                                        <input
                                            type="text"
                                            value={tier.label || ''}
                                            onChange={e => updateUsaWeightTier(idx, 'label', e.target.value)}
                                            placeholder={`Up to ${tier.maxWeight} KG`}
                                            style={{ width: '100%' }}
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeUsaWeightTier(idx)}
                                            style={{ color: '#ff4444', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title="Delete tier"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                                💡 <em>Orders over {Math.max(...getUsaTiers().map(t => Number(t.maxWeight) || 0))} KG will automatically apply the top tier rate plus a €6/KG excess weight surcharge.</em>
                            </p>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 'var(--space-4)' }}>
                        <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🇪🇺</span> Europe Shipping (Primary Market)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                            <label>
                                Europe Shipping Rate (€)
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.regionalShipping?.europe?.rate ?? 0}
                                    onChange={e => updateRegionalShipping('europe', 'rate', parseFloat(e.target.value) || 0)}
                                />
                            </label>
                            <label>
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

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 'var(--space-4)' }}>
                        <h4 style={{ margin: '0 0 var(--space-3) 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🌐</span> Rest of the World Shipping
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
                            <label>
                                Rest of World Rate (€)
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.regionalShipping?.restOfWorld?.rate ?? 25.00}
                                    onChange={e => updateRegionalShipping('restOfWorld', 'rate', parseFloat(e.target.value) || 0)}
                                />
                            </label>
                            <label>
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

                    <label>Tax Rate (%) <input type="number" value={settings.taxRate} onChange={e => updateField('taxRate', parseFloat(e.target.value))} /></label>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <h4 style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', margin: 0 }}>Specific Country Overrides</h4>
                            <button className="btn btn-ghost btn-sm" onClick={addShippingRate}>+ Add Rate</button>
                        </div>
                        {settings.shippingRates.map((rate, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                                <input value={rate.country} onChange={e => {
                                    const newRates = [...settings.shippingRates];
                                    newRates[idx].country = e.target.value;
                                    updateField('shippingRates', newRates);
                                }} style={{ flex: 1 }} placeholder="Country" />
                                <input type="number" step="0.01" value={rate.rate} onChange={e => {
                                    const newRates = [...settings.shippingRates];
                                    newRates[idx].rate = parseFloat(e.target.value);
                                    updateField('shippingRates', newRates);
                                }} style={{ width: '100px' }} placeholder="€" />
                                <button className="btn btn-ghost btn-sm" onClick={() => removeShippingRate(idx)} style={{ color: '#ff4444', padding: '0.4rem' }}>✕</button>
                            </div>
                        ))}
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
