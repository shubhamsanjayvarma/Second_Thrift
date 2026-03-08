import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiX, FiImage, FiVideo, FiSearch, FiChevronDown, FiTag, FiStar } from 'react-icons/fi';
import { useToast } from '../../components/common/Toast';
import { formatPrice, PRODUCT_CONDITIONS, SIZES, BRANDS, COLORS, MATERIALS, GENDERS, SEASONS, SUBCATEGORIES, PRODUCT_TAGS, VISIBILITY_OPTIONS } from '../../utils/helpers';
import { defaultCategories } from '../../services/categories';
import { subscribeToAllProducts, createProduct, updateProduct, deleteProduct } from '../../services/products';
import { uploadProductMedia } from '../../services/storage';
import SmartMedia from '../../components/common/SmartMedia';
import './Admin.css';

const EMPTY_FORM = {
    name: '', description: '', brand: '', sku: '',
    price: '', comparePrice: '', stock: '', lowStockAlert: '3',
    category: 'tops', subcategory: '', condition: 'good', gender: 'unisex', season: 'all-season',
    sizes: [], colors: [], materials: [],
    tags: [], featured: false, visibility: 'active',
    images: [],
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [mediaFiles, setMediaFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [tagInput, setTagInput] = useState('');
    const [brandSearch, setBrandSearch] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const brandRef = useRef(null);
    const formRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllProducts((data) => { setProducts(data); setLoading(false); });
        return () => unsubscribe();
    }, []);

    // Close brand dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (brandRef.current && !brandRef.current.contains(e.target)) setShowBrandDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const generateSKU = () => `ST-${Date.now().toString(36).toUpperCase()}`;

    const openAdd = () => {
        setEditProduct(null);
        setForm({ ...EMPTY_FORM, sku: generateSKU() });
        setMediaFiles([]);
        setShowForm(true);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const openEdit = (product) => {
        setEditProduct(product);
        setForm({
            ...EMPTY_FORM,
            ...product,
            price: String(product.price || ''),
            comparePrice: String(product.comparePrice || ''),
            stock: String(product.stock || ''),
            lowStockAlert: String(product.lowStockAlert || '3'),
            sizes: product.sizes || [],
            colors: product.colors || [],
            materials: product.materials || [],
            tags: product.tags || [],
            images: product.images || [],
        });
        setMediaFiles([]);
        setShowForm(true);
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const handleSave = async () => {
        if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
        setSaving(true);
        try {
            let newImageUrls = [];
            if (mediaFiles.length > 0) {
                toast.success(`Uploading ${mediaFiles.length} file(s)...`);
                newImageUrls = await Promise.all(mediaFiles.map(f => uploadProductMedia(f)));
            }
            const productData = {
                ...form,
                price: parseFloat(form.price),
                comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
                stock: parseInt(form.stock) || 0,
                lowStockAlert: parseInt(form.lowStockAlert) || 3,
                images: [...(form.images || []), ...newImageUrls],
            };
            if (editProduct) {
                await updateProduct(editProduct.id, productData);
                toast.success('Product updated!');
            } else {
                await createProduct(productData);
                toast.success('Product added!');
            }
            setShowForm(false);
            setMediaFiles([]);
        } catch (err) {
            console.error(err);
            toast.error('Failed to save product');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this product permanently?')) {
            try { await deleteProduct(id); toast.success('Product deleted.'); }
            catch (err) { console.error(err); toast.error('Failed to delete'); }
        }
    };

    const toggleArray = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value],
        }));
    };

    const addTag = (tag) => {
        const t = tag.trim().toLowerCase();
        if (t && !form.tags.includes(t)) setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
        setTagInput('');
    };

    const removeTag = (tag) => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

    const removeMedia = (index) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    const removeNewMedia = (index) => setMediaFiles(prev => prev.filter((_, i) => i !== index));

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredBrands = brandSearch ? BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase())) : BRANDS;

    const subcats = SUBCATEGORIES[form.category] || [];

    return (
        <div>
            {/* Header */}
            <div className="admin-table-header" style={{ background: 'none', border: 'none', padding: '0', marginBottom: 'var(--space-4)' }}>
                <h1 className="admin-page-title" style={{ marginBottom: 0 }}>Products</h1>
                <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Product</button>
            </div>

            {/* Search & Filter Bar */}
            <div className="ap-filter-bar">
                <div className="ap-search-box">
                    <FiSearch size={16} />
                    <input type="text" placeholder="Search products or brands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="ap-filter-select">
                    <option value="all">All Categories</option>
                    {defaultCategories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                </select>
                <div className="ap-product-count">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Products Table */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}></th>
                            <th>Product</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading products...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products found</td></tr>
                        ) : filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td>
                                    {product.images?.[0] ? (
                                        <SmartMedia src={product.images[0]} alt="" className="ap-table-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} videoProps={{ autoPlay: false }} />
                                    ) : <div className="ap-table-thumb ap-no-img"><FiImage size={16} /></div>}
                                </td>
                                <td>
                                    <strong>{product.name}</strong>
                                    {product.featured && <FiStar size={12} style={{ color: '#ECC94B', marginLeft: 6 }} />}
                                </td>
                                <td><span className="ap-brand-badge">{product.brand || '—'}</span></td>
                                <td>{defaultCategories.find(c => c.slug === product.category)?.name || product.category}</td>
                                <td>
                                    <strong>{formatPrice(product.price)}</strong>
                                    {product.comparePrice && <span className="ap-compare-price">{formatPrice(product.comparePrice)}</span>}
                                </td>
                                <td>
                                    <span className={`ap-stock-badge ${(product.stock || 0) <= (product.lowStockAlert || 3) ? 'low' : ''}`}>
                                        {product.stock || 0}
                                    </span>
                                </td>
                                <td>
                                    <span className={`ap-visibility-dot ${product.visibility || 'active'}`}>
                                        {VISIBILITY_OPTIONS.find(v => v.value === (product.visibility || 'active'))?.icon}
                                    </span>
                                </td>
                                <td>
                                    <div className="admin-table-actions">
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(product)}><FiEdit size={14} /></button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(product.id)} style={{ color: 'var(--error)' }}><FiTrash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ==================== ADD / EDIT FORM ==================== */}
            <AnimatePresence>
                {showForm && (
                    <motion.div className="ap-form-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
                        <motion.div className="ap-form-panel" ref={formRef} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()}>
                            {/* Form Header */}
                            <div className="ap-form-header">
                                <h2>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <button className="ap-close-btn" onClick={() => setShowForm(false)}><FiX size={22} /></button>
                            </div>

                            <div className="ap-form-body">
                                {/* ===== SECTION 1: BASIC INFO ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Basic Information</h3>
                                    <div className="ap-field">
                                        <label>Product Name *</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nike Air Max 90 Vintage" />
                                    </div>
                                    <div className="ap-field">
                                        <label>Description</label>
                                        <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the product — condition details, measurements, special features..." />
                                    </div>
                                    <div className="ap-row">
                                        <div className="ap-field" ref={brandRef}>
                                            <label>Brand</label>
                                            <div className="ap-brand-picker">
                                                <div className="ap-brand-trigger" onClick={() => setShowBrandDropdown(!showBrandDropdown)}>
                                                    <span>{form.brand || 'Select brand'}</span>
                                                    <FiChevronDown className={showBrandDropdown ? 'rotate' : ''} />
                                                </div>
                                                {showBrandDropdown && (
                                                    <div className="ap-brand-dropdown">
                                                        <input type="text" placeholder="Search brands..." value={brandSearch} onChange={e => setBrandSearch(e.target.value)} autoFocus className="ap-brand-search" />
                                                        <div className="ap-brand-list">
                                                            {filteredBrands.map(b => (
                                                                <div key={b} className={`ap-brand-option ${form.brand === b ? 'selected' : ''}`} onClick={() => { setForm({ ...form, brand: b }); setShowBrandDropdown(false); setBrandSearch(''); }}>{b}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ap-field">
                                            <label>SKU / Code</label>
                                            <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" />
                                        </div>
                                    </div>
                                </div>

                                {/* ===== SECTION 2: PRICING & STOCK ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Pricing & Stock</h3>
                                    <div className="ap-row">
                                        <div className="ap-field">
                                            <label>Price (€) * <span className="ap-hint">Final price — all inclusive</span></label>
                                            <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                                        </div>
                                        <div className="ap-field">
                                            <label>Compare-at Price (€) <span className="ap-hint">Original / crossed-out price</span></label>
                                            <input type="number" step="0.01" min="0" value={form.comparePrice} onChange={e => setForm({ ...form, comparePrice: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="ap-row">
                                        <div className="ap-field">
                                            <label>Stock Quantity</label>
                                            <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="ap-field">
                                            <label>Low Stock Alert</label>
                                            <input type="number" min="0" value={form.lowStockAlert} onChange={e => setForm({ ...form, lowStockAlert: e.target.value })} placeholder="3" />
                                        </div>
                                    </div>
                                </div>

                                {/* ===== SECTION 3: CLASSIFICATION ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Classification</h3>
                                    <div className="ap-row">
                                        <div className="ap-field">
                                            <label>Category *</label>
                                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subcategory: '' })}>
                                                {defaultCategories.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="ap-field">
                                            <label>Subcategory</label>
                                            <select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })}>
                                                <option value="">Select subcategory</option>
                                                {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ap-row ap-row-3">
                                        <div className="ap-field">
                                            <label>Condition</label>
                                            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                                                {PRODUCT_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="ap-field">
                                            <label>Gender</label>
                                            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="ap-field">
                                            <label>Season</label>
                                            <select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
                                                {SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ===== SECTION 4: SIZES, COLORS, MATERIALS ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Sizes, Colors & Materials</h3>
                                    <div className="ap-field">
                                        <label>Available Sizes</label>
                                        <div className="ap-chip-grid">
                                            {SIZES.map(size => (
                                                <button key={size} type="button" className={`ap-chip ${form.sizes.includes(size) ? 'active' : ''}`} onClick={() => toggleArray('sizes', size)}>{size}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ap-field">
                                        <label>Colors</label>
                                        <div className="ap-color-grid">
                                            {COLORS.map(color => (
                                                <button key={color.name} type="button" className={`ap-color-swatch ${form.colors.includes(color.name) ? 'active' : ''}`} onClick={() => toggleArray('colors', color.name)} title={color.name}>
                                                    <span className="ap-swatch" style={{ background: color.hex }} />
                                                    <span className="ap-color-label">{color.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ap-field">
                                        <label>Material / Fabric</label>
                                        <div className="ap-chip-grid">
                                            {MATERIALS.map(mat => (
                                                <button key={mat} type="button" className={`ap-chip ${form.materials.includes(mat) ? 'active' : ''}`} onClick={() => toggleArray('materials', mat)}>{mat}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ===== SECTION 5: MEDIA UPLOAD ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Images & Videos</h3>
                                    <div className="ap-media-upload">
                                        <div className="ap-upload-zone">
                                            <FiImage size={28} />
                                            <p>Click or drag to upload images & videos</p>
                                            <span>JPG, PNG, WEBP, MP4, MOV — Max 50MB each</span>
                                            <input type="file" accept="image/*,video/*" multiple onChange={(e) => { if (e.target.files) setMediaFiles(prev => [...prev, ...Array.from(e.target.files)]); }} />
                                        </div>
                                    </div>
                                    {/* Preview Grid */}
                                    {(form.images?.length > 0 || mediaFiles.length > 0) && (
                                        <div className="ap-media-grid">
                                            {form.images?.map((url, i) => (
                                                <div key={`existing-${i}`} className="ap-media-item">
                                                    {url.match(/\.(mp4|webm|mov)(\?.*)?$/i) || url.includes('video') ? (
                                                        <video src={url} muted className="ap-media-preview" />
                                                    ) : (
                                                        <SmartMedia src={url} alt="" className="ap-media-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} videoProps={{ autoPlay: false }} />
                                                    )}
                                                    <button className="ap-media-remove" onClick={() => removeMedia(i)}><FiX size={12} /></button>
                                                    {i === 0 && <span className="ap-media-badge">Cover</span>}
                                                </div>
                                            ))}
                                            {mediaFiles.map((file, i) => (
                                                <div key={`new-${i}`} className="ap-media-item ap-media-new">
                                                    {file.type.startsWith('video/') ? (
                                                        <video src={URL.createObjectURL(file)} muted className="ap-media-preview" />
                                                    ) : (
                                                        <img src={URL.createObjectURL(file)} alt="" className="ap-media-preview" />
                                                    )}
                                                    <button className="ap-media-remove" onClick={() => removeNewMedia(i)}><FiX size={12} /></button>
                                                    <span className="ap-media-badge new">New</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ===== SECTION 6: TAGS & VISIBILITY ===== */}
                                <div className="ap-section">
                                    <h3 className="ap-section-title">Tags & Visibility</h3>
                                    <div className="ap-field">
                                        <label>Tags</label>
                                        <div className="ap-tags-input-wrap">
                                            {form.tags.map(tag => (
                                                <span key={tag} className="ap-tag">{tag} <button onClick={() => removeTag(tag)}><FiX size={10} /></button></span>
                                            ))}
                                            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }} placeholder="Type & press Enter..." className="ap-tag-input" />
                                        </div>
                                        <div className="ap-quick-tags">
                                            {PRODUCT_TAGS.filter(t => !form.tags.includes(t)).slice(0, 12).map(tag => (
                                                <button key={tag} type="button" className="ap-quick-tag" onClick={() => addTag(tag)}>+ {tag}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="ap-row">
                                        <div className="ap-field">
                                            <label>Visibility</label>
                                            <div className="ap-visibility-group">
                                                {VISIBILITY_OPTIONS.map(v => (
                                                    <button key={v.value} type="button" className={`ap-visibility-btn ${form.visibility === v.value ? 'active' : ''}`} onClick={() => setForm({ ...form, visibility: v.value })}>
                                                        {v.icon} {v.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="ap-field">
                                            <label>&nbsp;</label>
                                            <label className="ap-checkbox-label">
                                                <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
                                                <FiStar size={14} /> Featured Product
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="ap-form-footer">
                                <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminProducts;
