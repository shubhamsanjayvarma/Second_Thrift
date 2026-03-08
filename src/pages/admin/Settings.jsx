import { useState, useEffect } from 'react';
import { useToast } from '../../components/common/Toast';
import { getSettings, updateSettings, getDefaultSettings } from '../../services/settings';
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
                <h3>Shipping</h3>
                <div className="settings-form">
                    <label>Free Shipping Threshold (€) <input type="number" value={settings.freeShippingThreshold} onChange={e => updateField('freeShippingThreshold', parseFloat(e.target.value))} /></label>
                    <label>Tax Rate (%) <input type="number" value={settings.taxRate} onChange={e => updateField('taxRate', parseFloat(e.target.value))} /></label>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <h4 style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', margin: 0 }}>Shipping Rates by Country</h4>
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
