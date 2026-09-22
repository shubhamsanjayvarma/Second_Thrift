import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiX, FiImage, FiVideo, FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight, FiTag, FiStar, FiPackage, FiTarget, FiTruck, FiGlobe } from 'react-icons/fi';
import { useToast } from '../../components/common/Toast';
import { formatPrice, PRODUCT_CONDITIONS, SIZES, BRANDS, COLORS, MATERIALS, GENDERS, SEASONS, SUBCATEGORIES, PRODUCT_TAGS, VISIBILITY_OPTIONS, GRADES, WAIST_SIZES, CURRENCIES, isYouTubeUrl, isVideoUrl, getProductPieceCount } from '../../utils/helpers';
import { defaultCategories } from '../../services/categories';
import { subscribeToAllProducts, createProduct, updateProduct, deleteProduct } from '../../services/products';
import { uploadProductMedia } from '../../services/storage';
import SmartMedia from '../../components/common/SmartMedia';
import './Admin.css';

const STEP_LABELS = ['Type', 'Details', 'Pricing', 'Media', 'Publish'];

const EMPTY_FORM = {
    name: '', description: '', brand: '', sku: '',
    price: '', comparePrice: '', stock: '', lowStockAlert: '3',
    piecesCount: '', // Pack/bundle pieces count (e.g. 35 for 35x jeans)
    category: 'jeans', subcategory: '', condition: 'good', gender: 'unisex', season: 'all-season',
    sizes: [], colors: [], materials: [],
    tags: [], featured: false, visibility: 'active',
    images: [],
    productType: 'exact',
    grade: '',
    currency: 'EUR',
    sizeRangeMin: '',
    sizeRangeMax: '',
    minQty: '1',
    bulkPrices: [],
    weight: '',
    dimensions: { length: '', breadth: '', height: '' },
    shippingType: 'custom', // 'custom' | 'free'
    shippingPriceEurope: '0', // custom EU shipping rate (0 = Free)
    shippingPriceUsa: '',    // custom USA shipping rate
    shippingPriceRow: '',    // custom Rest of World shipping rate
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [mediaItems, setMediaItems] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [tagInput, setTagInput] = useState('');
    const [youtubeInput, setYoutubeInput] = useState('');
    const [brandSearch, setBrandSearch] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const brandRef = useRef(null);
    const formRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllProducts((data) => { setProducts(data); setLoading(false); });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handler = (e) => { if (brandRef.current && !brandRef.current.contains(e.target)) setShowBrandDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const generateSKU = () => `ST-${Date.now().toString(36).toUpperCase()}`;

    const closeForm = () => {
        mediaItems.forEach(item => { if (item.type === 'file' && item.preview) URL.revokeObjectURL(item.preview); });
        setMediaItems([]);
        setDraggedIndex(null);
        setShowForm(false);
        setWizardStep(0);
    };

    const openAdd = () => {
        setEditProduct(null);
        setForm({ ...EMPTY_FORM, sku: generateSKU() });
        setMediaItems([]);
        setWizardStep(0);
        setShowForm(true);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const openEdit = (product) => {
        setEditProduct(product);
        setForm({
            ...EMPTY_FORM, ...product,
            price: String(product.price || ''),
            comparePrice: String(product.comparePrice || ''),
            stock: String(product.stock || ''),
            lowStockAlert: String(product.lowStockAlert || '3'),
            piecesCount: product.piecesCount !== undefined && product.piecesCount !== null ? String(product.piecesCount) : '',
            minQty: String(product.minQty || '1'),
            weight: String(product.weight || ''),
            shippingType: product.shippingType === 'free' || product.isFreeShipping ? 'free' : 'custom',
            shippingPriceEurope: product.shippingPriceEurope !== undefined && product.shippingPriceEurope !== null ? String(product.shippingPriceEurope) : '0',
            shippingPriceUsa: product.shippingPriceUsa !== undefined && product.shippingPriceUsa !== null ? String(product.shippingPriceUsa) : '',
            shippingPriceRow: product.shippingPriceRow !== undefined && product.shippingPriceRow !== null ? String(product.shippingPriceRow) : '',
            sizes: product.sizes || [], colors: product.colors || [], materials: product.materials || [],
            tags: product.tags || [], images: product.images || [],
            bulkPrices: product.bulkPrices || [],
            dimensions: product.dimensions || { length: '', breadth: '', height: '' },
            productType: product.productType || 'exact',
            grade: product.grade || '', currency: product.currency || 'EUR',
            sizeRangeMin: product.sizeRangeMin || '', sizeRangeMax: product.sizeRangeMax || '',
        });
        setMediaItems(product.images?.map((url, i) => ({ id: `existing-${i}-${url}`, type: 'url', value: url })) || []);
        setWizardStep(0);
        setShowForm(true);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const handleSave = async () => {
        const parsedPrice = parseFloat(form.price);
        if (!form.name || isNaN(parsedPrice)) { toast.error('Name and a valid price are required'); return; }
        setSaving(true);
        try {
            toast.success('Saving product media...');
            const uploadedUrls = await Promise.all(
                mediaItems.map(async (item, index) => {
                    if (item.type === 'file') {
                        return await uploadProductMedia(item.file, form.name || 'product', index);
                    }
                    return item.value;
                })
            );
            const images = uploadedUrls.filter(Boolean);

            const stockValue = parseInt(form.stock);
            const lowStockValue = parseInt(form.lowStockAlert);
            const minQtyValue = parseInt(form.minQty);
            const weightValue = parseFloat(form.weight);
            const piecesCountValue = form.piecesCount ? parseInt(form.piecesCount, 10) : null;
            const autoDetectedPieces = getProductPieceCount(form);

            const shippingPriceEuropeVal = form.shippingPriceEurope !== '' && !isNaN(parseFloat(form.shippingPriceEurope)) ? parseFloat(form.shippingPriceEurope) : null;
            const shippingPriceUsaVal = form.shippingPriceUsa !== '' && !isNaN(parseFloat(form.shippingPriceUsa)) ? parseFloat(form.shippingPriceUsa) : null;
            const shippingPriceRowVal = form.shippingPriceRow !== '' && !isNaN(parseFloat(form.shippingPriceRow)) ? parseFloat(form.shippingPriceRow) : null;

            const productData = {
                ...form,
                price: parsedPrice,
                comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
                stock: isNaN(stockValue) ? 0 : stockValue,
                lowStockAlert: isNaN(lowStockValue) ? 3 : lowStockValue,
                piecesCount: !isNaN(piecesCountValue) && piecesCountValue > 1 ? piecesCountValue : (autoDetectedPieces || null),
                minQty: isNaN(minQtyValue) ? 1 : minQtyValue,
                weight: isNaN(weightValue) ? null : weightValue,
                shippingType: form.shippingType || 'default',
                shippingPriceEurope: form.shippingType === 'free' ? 0 : (form.shippingType === 'custom' ? (shippingPriceEuropeVal ?? 0) : null),
                shippingPriceUsa: form.shippingType === 'free' ? 0 : (form.shippingType === 'custom' ? shippingPriceUsaVal : null),
                shippingPriceRow: form.shippingType === 'free' ? 0 : (form.shippingType === 'custom' ? shippingPriceRowVal : null),
                isFreeShipping: form.shippingType === 'free',
                dimensions: {
                    length: form.dimensions.length ? parseFloat(form.dimensions.length) : null,
                    breadth: form.dimensions.breadth ? parseFloat(form.dimensions.breadth) : null,
                    height: form.dimensions.height ? parseFloat(form.dimensions.height) : null,
                },
                bulkPrices: (form.bulkPrices || []).filter(t => t.minQty && t.price).map(t => ({ minQty: parseInt(t.minQty), price: parseFloat(t.price) })),
                images,
            };
            if (editProduct) { await updateProduct(editProduct.id, productData); toast.success('Product updated!'); }
            else { await createProduct(productData); toast.success('Product added!'); }
            setShowForm(false); setWizardStep(0);
            mediaItems.forEach(item => { if (item.type === 'file' && item.preview) URL.revokeObjectURL(item.preview); });
            setMediaItems([]);
        } catch (err) { console.error(err); toast.error(err.message || 'Failed to save product/media'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this product?')) return;
        try { toast.loading('Deleting...', { id: 'delete-toast' }); await deleteProduct(id); toast.success('Product permanently deleted.', { id: 'delete-toast' }); }
        catch (err) { console.error(err); toast.error(err.message || 'Failed to delete product', { id: 'delete-toast' }); }
    };

    const toggleArray = (field, value) => {
        setForm(prev => {
            const arr = prev[field] || [];
            return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });
    };
    const addTag = (tag) => {
        const tags = tag.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        setForm(prev => { const cur = prev.tags || []; const n = tags.filter(t => !cur.includes(t)); return n.length ? { ...prev, tags: [...cur, ...n] } : prev; });
        setTagInput('');
    };
    const removeTag = (tag) => setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
    const removeMediaItem = (id) => { setMediaItems(prev => { const item = prev.find(i => i.id === id); if (item?.type === 'file' && item.preview) URL.revokeObjectURL(item.preview); return prev.filter(i => i.id !== id); }); };
    const setAsCover = (index) => { setMediaItems(prev => { const next = [...prev]; const [item] = next.splice(index, 1); next.unshift(item); return next; }); };
    const handleDragStart = (e, index) => { if (e.target.tagName === 'BUTTON' || e.target.closest('button')) { e.preventDefault(); return; } setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, index) => { e.preventDefault(); if (draggedIndex === null || draggedIndex === index) return; setMediaItems(prev => { const next = [...prev]; const [d] = next.splice(draggedIndex, 1); next.splice(index, 0, d); return next; }); setDraggedIndex(index); };
    const handleDragEnd = () => setDraggedIndex(null);
    const addYoutubeLink = () => { const link = youtubeInput.trim(); if (!link) return; if (!isYouTubeUrl(link)) { toast.error('Please enter a valid YouTube link'); return; } setMediaItems(prev => [...prev, { id: `youtube-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: 'url', value: link }]); setYoutubeInput(''); toast.success('YouTube link added'); };

    const addPricingTier = () => setForm(prev => ({ ...prev, bulkPrices: [...(prev.bulkPrices || []), { minQty: '', price: '' }] }));
    const updatePricingTier = (index, field, value) => { setForm(prev => { const tiers = [...(prev.bulkPrices || [])]; tiers[index] = { ...tiers[index], [field]: value }; return { ...prev, bulkPrices: tiers }; }); };
    const removePricingTier = (index) => setForm(prev => ({ ...prev, bulkPrices: (prev.bulkPrices || []).filter((_, i) => i !== index) }));

    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
    });
    const filteredBrands = brandSearch ? BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase())) : BRANDS;
    const subcats = SUBCATEGORIES[form.category] || [];
    const selectedGrade = GRADES.find(g => g.value === form.grade);
    const currencySymbol = CURRENCIES.find(c => c.code === form.currency)?.symbol || '\u20ac';

    const canAdvance = (step) => { if (step === 1) return form.name.trim().length > 0; if (step === 2) return form.price && !isNaN(parseFloat(form.price)); return true; };
    const nextStep = () => { if (!canAdvance(wizardStep)) { if (wizardStep === 1) toast.error('Product name is required'); if (wizardStep === 2) toast.error('A valid price is required'); return; } if (wizardStep < STEP_LABELS.length - 1) setWizardStep(wizardStep + 1); };
    const prevStep = () => { if (wizardStep > 0) setWizardStep(wizardStep - 1); };

    /* ===== STEP RENDERERS ===== */

    const renderStep0 = () => (
        <div className="wiz-step-content">
            <h3 className="wiz-step-title">What type of product is this?</h3>
            <div className="wiz-type-cards">
                <div className={`wiz-type-card ${form.productType === 'exact' ? 'active' : ''}`} onClick={() => setForm({ ...form, productType: 'exact' })}>
                    <FiTarget size={36} className="wiz-type-icon" />
                    <strong>Exact Product</strong>
                    <p>Images/Videos show the exact pieces the buyer will receive</p>
                </div>
                <div className={`wiz-type-card ${form.productType === 'representative' ? 'active' : ''}`} onClick={() => setForm({ ...form, productType: 'representative' })}>
                    <FiPackage size={36} className="wiz-type-icon" />
                    <strong>Representative Product</strong>
                    <p>Images/Videos show a fair representation of the pieces the buyer will receive</p>
                </div>
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div className="wiz-step-content">
            <h3 className="wiz-step-title">Product Details</h3>
            <div className="ap-section">
                <div className="ap-field"><label>Product Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Carhartt Jeans Bundle - Grade A" /></div>
                <div className="ap-field"><label>Description *</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Enter a description for your products. Give as much detail as you can." /></div>
            </div>
            <div className="ap-section">
                <div className="ap-row">
                    <div className="ap-field" ref={brandRef}>
                        <label>Brand</label>
                        <div className="ap-brand-picker">
                            <div className="ap-brand-trigger" onClick={() => setShowBrandDropdown(!showBrandDropdown)}><span>{form.brand || 'Select brand'}</span><FiChevronDown className={showBrandDropdown ? 'rotate' : ''} /></div>
                            {showBrandDropdown && (<div className="ap-brand-dropdown"><input type="text" placeholder="Search brands..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} autoFocus className="ap-brand-search" /><div className="ap-brand-list">{filteredBrands.map(b => (<div key={b} className={`ap-brand-option ${form.brand === b ? 'selected' : ''}`} onClick={() => { setForm({ ...form, brand: b }); setShowBrandDropdown(false); setBrandSearch(''); }}>{b}</div>))}{brandSearch && !filteredBrands.some(b => b.toLowerCase() === brandSearch.toLowerCase()) && (<div className="ap-brand-option" onClick={() => { setForm({ ...form, brand: brandSearch }); setShowBrandDropdown(false); setBrandSearch(''); }}><span style={{ color: 'var(--primary)' }}>+ Add "{brandSearch}"</span></div>)}</div></div>)}
                        </div>
                    </div>
                    <div className="ap-field"><label>SKU / Code</label><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" /></div>
                </div>
            </div>
            <div className="ap-section">
                <div className="ap-row"><div className="ap-field"><label>Category *</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: '' })}>{defaultCategories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}</select></div><div className="ap-field"><label>Subcategory</label><select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}><option value="">Select subcategory</option>{subcats.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                <div className="ap-row ap-row-3"><div className="ap-field"><label>Condition</label><select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>{PRODUCT_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div><div className="ap-field"><label>Gender</label><select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>{GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div><div className="ap-field"><label>Season</label><select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>{SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div></div>
            </div>
            <div className="ap-section">
                <h3 className="ap-section-title">Grading</h3>
                <div className="wiz-grade-grid">{GRADES.map(g => (<button key={g.value} type="button" className={`wiz-grade-chip ${form.grade === g.value ? 'active' : ''}`} onClick={() => setForm({ ...form, grade: form.grade === g.value ? '' : g.value })}>{g.icon} {g.label}</button>))}</div>
                {selectedGrade && (<div className="wiz-grade-description"><strong>{selectedGrade.title}</strong><p>{selectedGrade.description}</p></div>)}
            </div>
            <div className="ap-section">
                <h3 className="ap-section-title">Size Range</h3>
                <div className="ap-field"><label>Available Sizes (letter)</label><div className="ap-chip-grid">{SIZES.map(size => (<button key={size} type="button" className={`ap-chip ${form.sizes.includes(size) ? 'active' : ''}`} onClick={() => toggleArray('sizes', size)}>{size}</button>))}</div></div>
                <div className="wiz-size-range"><span className="wiz-size-range-tag">Waist</span><select value={form.sizeRangeMin} onChange={e => setForm({ ...form, sizeRangeMin: e.target.value })}><option value="">Min</option>{WAIST_SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select><span className="wiz-size-range-sep">\u2013</span><select value={form.sizeRangeMax} onChange={e => setForm({ ...form, sizeRangeMax: e.target.value })}><option value="">Max</option>{WAIST_SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
        </div>
    );

    const renderStep2 = () => {
        const autoDetectedPieces = getProductPieceCount(form);
        const effectivePieces = form.piecesCount ? parseInt(form.piecesCount, 10) : autoDetectedPieces;
        const basePriceVal = parseFloat(form.price);
        const calculatedUnitPrice = effectivePieces > 1 && !isNaN(basePriceVal) && basePriceVal > 0 
            ? (basePriceVal / effectivePieces).toFixed(2) 
            : null;

        return (
        <div className="wiz-step-content">
            <h3 className="wiz-step-title">Inventory & Pricing</h3>
            <div className="ap-section">
                <h3 className="ap-section-title">Add inventory</h3>
                <div className="ap-field"><label>Total available units *</label><div className="wiz-input-suffix"><input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" /><span className="wiz-suffix">pieces</span></div></div>
                <div className="ap-field"><label>Low Stock Alert</label><input type="number" min="0" value={form.lowStockAlert} onChange={e => setForm({ ...form, lowStockAlert: e.target.value })} placeholder="3" /></div>
            </div>
            <div className="ap-section">
                <div className="wiz-pricing-header"><h3 className="ap-section-title">Add pricing</h3><select className="wiz-currency-select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol}</option>)}</select></div>
                <div className="wiz-pricing-row"><span className="wiz-pricing-row-num">1</span><div className="wiz-pricing-field"><label>Minimum quantity</label><div className="wiz-input-suffix"><input type="number" min="1" value={form.minQty} onChange={e => setForm({ ...form, minQty: e.target.value })} placeholder="1" /><span className="wiz-suffix">pcs</span></div></div><div className="wiz-pricing-field"><label>Price</label><div className="wiz-input-prefix"><span className="wiz-prefix">{currencySymbol}</span><input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" /></div></div></div>
                <div className="ap-field" style={{ marginTop: '8px' }}><label>Compare-at Price <span className="ap-hint">Original / crossed-out price</span></label><div className="wiz-input-prefix"><span className="wiz-prefix">{currencySymbol}</span><input type="number" step="0.01" min="0" value={form.comparePrice} onChange={e => setForm({ ...form, comparePrice: e.target.value })} placeholder="0" /></div></div>
                
                {/* Pack / Bundle Piece Count */}
                <div className="ap-field" style={{ marginTop: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📦</span> Bundle / Pack Piece Count <span className="ap-hint">For bulk packs & jeans bundles</span>
                    </label>
                    <div className="wiz-input-suffix">
                        <input
                            type="number"
                            min="1"
                            value={form.piecesCount}
                            onChange={e => setForm({ ...form, piecesCount: e.target.value })}
                            placeholder={autoDetectedPieces ? `Auto-detected from name: ${autoDetectedPieces} pcs` : 'e.g. 35 (or auto-detected from name)'}
                        />
                        <span className="wiz-suffix">pieces</span>
                    </div>
                    <span style={{ fontSize: '11px', color: calculatedUnitPrice ? '#fcc419' : 'var(--text-muted)' }}>
                        {calculatedUnitPrice ? (
                            `✓ Active: Pack of ${effectivePieces} for ${currencySymbol}${basePriceVal.toFixed(2)} (${currencySymbol}${calculatedUnitPrice} / piece displayed to customers)`
                        ) : (
                            'Automatically calculates & displays per-piece unit price (e.g. "Pack of 35 for €1,050 (€30.00 / jeans)") to customers.'
                        )}
                    </span>
                </div>
            </div>
            <div className="ap-section">
                <h3 className="ap-section-title">Add pricing tiers</h3>
                {(form.bulkPrices || []).map((tier, i) => { const basePrice = parseFloat(form.price); const tierPrice = parseFloat(tier.price); const err = !isNaN(basePrice) && !isNaN(tierPrice) && tierPrice > basePrice; return (
                    <div key={i} className="wiz-pricing-row"><span className="wiz-pricing-row-num">{i + 2}</span><div className="wiz-pricing-field"><label>Quantity</label><div className="wiz-input-suffix"><input type="number" min="1" value={tier.minQty} onChange={e => updatePricingTier(i, 'minQty', e.target.value)} placeholder="0" /><span className="wiz-suffix">pcs</span></div></div><div className={`wiz-pricing-field ${err ? 'wiz-field-error' : ''}`}><label>Price</label><div className="wiz-input-prefix"><span className="wiz-prefix">{currencySymbol}</span><input type="number" step="0.01" min="0" value={tier.price} onChange={e => updatePricingTier(i, 'price', e.target.value)} placeholder="0" /></div>{err && <span className="wiz-field-error-msg">Price exceeds base price</span>}</div><button type="button" className="wiz-tier-delete" onClick={() => removePricingTier(i)} title="Remove tier"><FiTrash2 size={16} /></button></div>
                ); })}
                <button type="button" className="wiz-add-tier-btn" onClick={addPricingTier}><FiPlus size={16} /> Add a pricing tier</button>
            </div>

            {/* Product Shipping Pricing */}
            <div className="ap-section">
                <h3 className="ap-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiTruck size={18} /> Shipping Pricing for this Product
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '-4px 0 12px 0' }}>
                    Set shipping charges for this specific product across different regions.
                </p>

                <div className="ap-shipping-mode-cards">
                    <div
                        className={`ap-shipping-mode-card ${form.shippingType === 'custom' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, shippingType: 'custom' })}
                    >
                        <div className="ap-shipping-mode-header">
                            <span>✏️</span> Custom Shipping Rates
                        </div>
                        <p className="ap-shipping-mode-desc">
                            Set specific shipping charges for Europe, USA, or Rest of World for this product.
                        </p>
                    </div>

                    <div
                        className={`ap-shipping-mode-card ${form.shippingType === 'free' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, shippingType: 'free' })}
                    >
                        <div className="ap-shipping-mode-header">
                            <span>🎁</span> 100% Free Shipping
                        </div>
                        <p className="ap-shipping-mode-desc">
                            Free worldwide delivery for this product (promotion / special offer).
                        </p>
                    </div>
                </div>

                {form.shippingType === 'custom' && (
                    <div className="ap-shipping-inputs-grid">
                        <div className="ap-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>⚖️ Custom Weight (KG)</label>
                            <div className="wiz-input-suffix">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g. 10.0"
                                    value={form.weight}
                                    onChange={e => setForm({ ...form, weight: e.target.value })}
                                />
                                <span className="wiz-suffix">KG</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custom parcel or bale weight</span>
                        </div>

                        <div className="ap-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>🇪🇺 Europe Shipping (€)</label>
                            <div className="wiz-input-prefix">
                                <span className="wiz-prefix">€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00 (0 = Free)"
                                    value={form.shippingPriceEurope}
                                    onChange={e => setForm({ ...form, shippingPriceEurope: e.target.value })}
                                />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = Free European Delivery</span>
                        </div>

                        <div className="ap-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>🇺🇸 USA Shipping (€)</label>
                            <div className="wiz-input-prefix">
                                <span className="wiz-prefix">€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 45.00"
                                    value={form.shippingPriceUsa}
                                    onChange={e => setForm({ ...form, shippingPriceUsa: e.target.value })}
                                />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Specific shipping charge for USA</span>
                        </div>

                        <div className="ap-field" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.78rem' }}>🌐 Rest of World (€)</label>
                            <div className="wiz-input-prefix">
                                <span className="wiz-prefix">€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 30.00"
                                    value={form.shippingPriceRow}
                                    onChange={e => setForm({ ...form, shippingPriceRow: e.target.value })}
                                />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>International</span>
                        </div>
                    </div>
                )}

                {form.shippingType === 'free' && (
                    <div style={{ marginTop: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '14px', borderRadius: '10px' }}>
                        <div className="ap-field" style={{ margin: 0, maxWidth: '240px' }}>
                            <label style={{ fontSize: '0.78rem' }}>⚖️ Custom Weight (KG)</label>
                            <div className="wiz-input-suffix">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g. 10.0"
                                    value={form.weight}
                                    onChange={e => setForm({ ...form, weight: e.target.value })}
                                />
                                <span className="wiz-suffix">KG</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custom parcel or bale weight</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };

    const renderStep3 = () => (
        <div className="wiz-step-content">
            <h3 className="wiz-step-title">Images & Videos</h3>
            <div className="ap-section">
                <div className="ap-media-upload"><div className="ap-upload-zone"><FiImage size={28} /><p>Click or drag to upload images & videos</p><span>JPG, PNG, WEBP, MP4 - Max 10MB each</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={(e) => { if (e.target.files) { const files = Array.from(e.target.files); const newItems = files.map(file => ({ id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: 'file', value: file, preview: URL.createObjectURL(file) })); setMediaItems(prev => [...prev, ...newItems]); } }} /></div></div>
                <div className="ap-youtube-upload" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}><input type="text" placeholder="Paste YouTube Video Link here..." value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--surface-color)', color: 'var(--text-color)' }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addYoutubeLink(); } }} /><button type="button" className="btn btn-secondary" onClick={addYoutubeLink} style={{ padding: '0 20px', whiteSpace: 'nowrap' }}>Add Link</button></div>
                {mediaItems.length > 0 && (<div className="ap-media-grid">{mediaItems.map((item, i) => { const isCover = i === 0; return (<motion.div key={item.id} layout className={`ap-media-item ${item.type === 'file' ? 'ap-media-new' : ''}`} style={{ position: 'relative', cursor: draggedIndex === i ? 'grabbing' : 'grab', opacity: draggedIndex === i ? 0.4 : 1, transition: draggedIndex === i ? 'none' : 'opacity 0.2s, transform 0.2s' }} draggable onDragStart={(e) => handleDragStart(e, i)} onDragOver={(e) => handleDragOver(e, i)} onDragEnd={handleDragEnd}>{item.type === 'url' ? (<><SmartMedia src={item.value} alt="" className="ap-media-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} videoProps={{ autoPlay: false }} isThumbnail={true} />{(isVideoUrl(item.value) || isYouTubeUrl(item.value)) && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#fff', fontSize: '24px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>▶</div>)}</>) : (item.value.type.startsWith('video/') ? (<video src={item.preview} muted className="ap-media-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<img src={item.preview} alt="" className="ap-media-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />))}{!isCover && (<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '6px', zIndex: 10 }}><button type="button" onClick={() => setAsCover(i)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', cursor: 'pointer', padding: '3px 10px', borderRadius: '4px', fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', lineHeight: 1 }} title="Set as Cover">Set Cover</button></div>)}<button type="button" className="ap-media-remove" onClick={() => removeMediaItem(item.id)}><FiX size={12} /></button>{isCover && <span className="ap-media-badge" style={{ position: 'absolute', top: '4px', left: '4px', bottom: 'auto' }}>Cover</span>}{item.type === 'file' && <span className="ap-media-badge new" style={{ position: 'absolute', top: '4px', left: isCover ? '55px' : '4px', bottom: 'auto' }}>New</span>}</motion.div>); })}</div>)}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="wiz-step-content">
            <h3 className="wiz-step-title">Details & Publish</h3>
            <div className="ap-section"><h3 className="ap-section-title">Colors</h3><div className="ap-color-grid">{COLORS.map(color => (<button key={color.name} type="button" className={`ap-color-swatch ${form.colors.includes(color.name) ? 'active' : ''}`} onClick={() => toggleArray('colors', color.name)} title={color.name}><span className="ap-swatch" style={{ background: color.hex }} /><span className="ap-color-label">{color.name}</span></button>))}</div></div>
            <div className="ap-section"><h3 className="ap-section-title">Material / Fabric</h3><div className="ap-chip-grid">{MATERIALS.map(mat => (<button key={mat} type="button" className={`ap-chip ${form.materials.includes(mat) ? 'active' : ''}`} onClick={() => toggleArray('materials', mat)}>{mat}</button>))}</div></div>
            
            <div className="ap-section">
                <h3 className="ap-section-title">Shipping & Parcel Details</h3>
                
                {/* Shipping Mode & Rates */}
                <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Shipping Price & Weight</label>
                    <div className="ap-shipping-mode-cards" style={{ marginTop: '6px' }}>
                        <div
                            className={`ap-shipping-mode-card ${form.shippingType === 'custom' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, shippingType: 'custom' })}
                        >
                            <div className="ap-shipping-mode-header"><span>✏️</span> Custom Rates</div>
                            <p className="ap-shipping-mode-desc">Set specific rates and weight for this product</p>
                        </div>
                        <div
                            className={`ap-shipping-mode-card ${form.shippingType === 'free' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, shippingType: 'free' })}
                        >
                            <div className="ap-shipping-mode-header"><span>🎁</span> Free Shipping</div>
                            <p className="ap-shipping-mode-desc">Worldwide free delivery</p>
                        </div>
                    </div>

                    {form.shippingType === 'custom' && (
                        <div className="ap-shipping-inputs-grid">
                            <div className="ap-field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.78rem' }}>⚖️ Custom Weight (KG)</label>
                                <div className="wiz-input-suffix">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="e.g. 10.0"
                                        value={form.weight}
                                        onChange={e => setForm({ ...form, weight: e.target.value })}
                                    />
                                    <span className="wiz-suffix">KG</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custom parcel or bale weight</span>
                            </div>

                            <div className="ap-field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.78rem' }}>🇪🇺 Europe (€)</label>
                                <div className="wiz-input-prefix">
                                    <span className="wiz-prefix">€</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.shippingPriceEurope}
                                        onChange={e => setForm({ ...form, shippingPriceEurope: e.target.value })}
                                    />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = Free Delivery</span>
                            </div>

                            <div className="ap-field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.78rem' }}>🇺🇸 USA (€)</label>
                                <div className="wiz-input-prefix">
                                    <span className="wiz-prefix">€</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 45.00"
                                        value={form.shippingPriceUsa}
                                        onChange={e => setForm({ ...form, shippingPriceUsa: e.target.value })}
                                    />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>USA Shipping</span>
                            </div>

                            <div className="ap-field" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.78rem' }}>🌐 Rest of World (€)</label>
                                <div className="wiz-input-prefix">
                                    <span className="wiz-prefix">€</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 30.00"
                                        value={form.shippingPriceRow}
                                        onChange={e => setForm({ ...form, shippingPriceRow: e.target.value })}
                                    />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>International</span>
                            </div>
                        </div>
                    )}

                    {form.shippingType === 'free' && (
                        <div style={{ marginTop: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '14px', borderRadius: '10px' }}>
                            <div className="ap-field" style={{ margin: 0, maxWidth: '240px' }}>
                                <label style={{ fontSize: '0.78rem' }}>⚖️ Custom Weight (KG)</label>
                                <div className="wiz-input-suffix">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="e.g. 10.0"
                                        value={form.weight}
                                        onChange={e => setForm({ ...form, weight: e.target.value })}
                                    />
                                    <span className="wiz-suffix">KG</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Custom parcel or bale weight</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ap-row ap-row-3" style={{ marginTop: '12px' }}>
                    <div className="ap-field"><label>Length (cm)</label><input type="number" min="0" value={form.dimensions.length} onChange={e => setForm({ ...form, dimensions: { ...form.dimensions, length: e.target.value } })} placeholder="0" /></div>
                    <div className="ap-field"><label>Breadth (cm)</label><input type="number" min="0" value={form.dimensions.breadth} onChange={e => setForm({ ...form, dimensions: { ...form.dimensions, breadth: e.target.value } })} placeholder="0" /></div>
                    <div className="ap-field"><label>Height (cm)</label><input type="number" min="0" value={form.dimensions.height} onChange={e => setForm({ ...form, dimensions: { ...form.dimensions, height: e.target.value } })} placeholder="0" /></div>
                </div>
            </div>
            <div className="ap-section"><h3 className="ap-section-title">Tags</h3><div className="ap-field"><div className="ap-tags-input-wrap">{form.tags.map(tag => (<span key={tag} className="ap-tag">{tag} <button onClick={() => removeTag(tag)}><FiX size={10} /></button></span>))}<input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }} placeholder="Type & press Enter..." className="ap-tag-input" /></div><div className="ap-quick-tags">{PRODUCT_TAGS.filter(t => !form.tags.includes(t)).slice(0, 12).map(tag => (<button key={tag} type="button" className="ap-quick-tag" onClick={() => addTag(tag)}>+ {tag}</button>))}</div></div></div>
            <div className="ap-section"><h3 className="ap-section-title">Visibility</h3><div className="ap-row"><div className="ap-field"><div className="ap-visibility-group">{VISIBILITY_OPTIONS.map(v => (<button key={v.value} type="button" className={`ap-visibility-btn ${form.visibility === v.value ? 'active' : ''}`} onClick={() => setForm({ ...form, visibility: v.value })}>{v.icon} {v.label}</button>))}</div></div><div className="ap-field"><label className="ap-checkbox-label"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /><FiStar size={14} /> Featured Product</label></div></div></div>
        </div>
    );

    const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

    return (
        <div>
            <div className="admin-table-header" style={{ background: 'none', border: 'none', padding: '0', marginBottom: 'var(--space-4)' }}><h1 className="admin-page-title" style={{ marginBottom: 0 }}>Products</h1><button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Product</button></div>
            <div className="ap-filter-bar"><div className="ap-search-box"><FiSearch size={16} /><input type="text" placeholder="Search products or brands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="ap-filter-select"><option value="all">All Categories</option>{defaultCategories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}</select><div className="ap-product-count">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</div></div>

            <div className="admin-table-container"><table className="admin-table"><thead><tr><th style={{ width: '50px' }}></th><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Shipping</th><th>Stock</th><th>Grade</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                {loading ? (<tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading products...</td></tr>
                ) : filteredProducts.length === 0 ? (<tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products found</td></tr>
                ) : filteredProducts.map(product => (
                    <tr key={product.id} className="ap-product-row">
                        <td className="ap-td-img">{product.images?.[0] ? (<SmartMedia src={product.images[0]} alt="" className="ap-table-thumb" style={{ objectFit: 'cover' }} videoProps={{ autoPlay: false }} />) : <div className="ap-table-thumb ap-no-img"><FiImage size={16} /></div>}</td>
                        <td className="ap-td-name"><strong>{product.name}</strong>{product.featured && <FiStar size={12} style={{ color: '#ECC94B', marginLeft: 6 }} />}</td>
                        <td className="ap-td-brand"><span className="ap-brand-badge">{product.brand || '—'}</span></td>
                        <td className="ap-td-category">{defaultCategories.find(c => c.slug === product.category)?.name || product.category}</td>
                        <td className="ap-td-price"><strong>{formatPrice(product.price, product.currency)}</strong>{product.comparePrice && <span className="ap-compare-price">{formatPrice(product.comparePrice, product.currency)}</span>}</td>
                        <td className="ap-td-shipping">
                            {product.shippingType === 'free' || product.isFreeShipping ? (
                                <span className="ap-shipping-table-badge free">🎁 Free</span>
                            ) : (
                                <span className="ap-shipping-table-badge custom" title={`EU: €${product.shippingPriceEurope ?? 0} | USA: €${product.shippingPriceUsa ?? '0'}`}>
                                    ✈️ {product.shippingPriceUsa !== null && product.shippingPriceUsa !== undefined && product.shippingPriceUsa !== '' ? `USA €${product.shippingPriceUsa}` : 'Custom'}
                                </span>
                            )}
                        </td>
                        <td className="ap-td-stock"><span className={`ap-stock-badge ${(product.stock || 0) <= (product.lowStockAlert || 3) ? 'low' : ''}`}>{product.stock || 0}</span></td>
                        <td className="ap-td-grade">{product.grade ? <span className="wiz-grade-table-badge">{product.grade}</span> : '—'}</td>
                        <td className="ap-td-status"><span className={`ap-visibility-dot ${product.visibility || 'active'}`}>{VISIBILITY_OPTIONS.find(v => v.value === (product.visibility || 'active'))?.icon}</span></td>
                        <td className="ap-td-actions"><div className="admin-table-actions"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}><FiEdit size={14} /></button><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(product.id)} style={{ color: 'var(--error)' }}><FiTrash2 size={14} /></button></div></td>
                    </tr>
                ))}
            </tbody></table></div>

            <AnimatePresence>{showForm && (
                <motion.div className="ap-form-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeForm}>
                    <motion.div className="ap-form-panel" ref={formRef} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()}>
                        <div className="ap-form-header"><h2>{editProduct ? 'Edit Product' : 'Upload Product'}</h2><button className="ap-close-btn" onClick={closeForm}><FiX size={22} /></button></div>
                        <div className="wiz-stepper">{STEP_LABELS.map((label, i) => (<div key={i} className={`wiz-stepper-item ${i < wizardStep ? 'completed' : ''} ${i === wizardStep ? 'active' : ''}`}>{i > 0 && <div className={`wiz-stepper-line ${i <= wizardStep ? 'active' : ''}`} />}<div className="wiz-stepper-dot" onClick={() => { if (i <= wizardStep || canAdvance(wizardStep)) setWizardStep(i); }} /></div>))}</div>
                        <div className="ap-form-body"><AnimatePresence mode="wait"><motion.div key={wizardStep} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>{stepRenderers[wizardStep]()}</motion.div></AnimatePresence></div>
                        <div className="wiz-footer"><button type="button" className="btn btn-ghost wiz-back-btn" onClick={wizardStep === 0 ? closeForm : prevStep}><FiChevronLeft size={18} />{wizardStep === 0 ? 'Cancel' : 'Back'}</button>{wizardStep < STEP_LABELS.length - 1 ? (<button type="button" className="btn wiz-next-btn" onClick={nextStep}>Next page <FiChevronRight size={18} /></button>) : (<button className="btn wiz-next-btn wiz-publish-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Publish Product'}</button>)}</div>
                    </motion.div>
                </motion.div>
            )}</AnimatePresence>
        </div>
    );
};

export default AdminProducts;
