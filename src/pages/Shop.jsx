import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFilter, FiGrid, FiList, FiX } from 'react-icons/fi';
import ProductCard from '../components/product/ProductCard';
import { defaultCategories } from '../services/categories';
import { PRODUCT_CONDITIONS, SIZES } from '../utils/helpers';
import { subscribeToAllProducts } from '../services/products';
import { useToast } from '../components/common/Toast';
import evisuLatest from '../assets/evisu-latest.png';
import './Shop.css';

const Shop = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllProducts((data) => {
            setProducts(data);
            setFilteredProducts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        condition: '',
        priceRange: '',
        search: searchParams.get('search') || '',
    });

    useEffect(() => {
        const cat = searchParams.get('category') || '';
        const search = searchParams.get('search') || '';
        setFilters(prev => ({ ...prev, category: cat, search: search }));
    }, [searchParams]);

    useEffect(() => {
        let filtered = [...products];

        // Only show active/visible products on the storefront
        filtered = filtered.filter(p => !p.visibility || p.visibility === 'active');

        if (filters.category) {
            filtered = filtered.filter(p => p.category === filters.category);
        }
        if (filters.condition) {
            filtered = filtered.filter(p => p.condition === filters.condition);
        }
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.name?.toLowerCase().includes(term) ||
                p.categoryName?.toLowerCase().includes(term) ||
                p.brand?.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term) ||
                p.tags?.some(t => t.toLowerCase().includes(term))
            );
        }
        if (filters.priceRange) {
            const [min, max] = filters.priceRange.split('-').map(Number);
            filtered = filtered.filter(p => p.price >= min && (!max || p.price <= max));
        }

        switch (sortBy) {
            case 'price-low': filtered.sort((a, b) => a.price - b.price); break;
            case 'price-high': filtered.sort((a, b) => b.price - a.price); break;
            case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
            default: break;
        }

        setFilteredProducts(filtered);
    }, [products, filters, sortBy]);

    const clearFilters = () => {
        setFilters({ category: '', condition: '', priceRange: '', search: '' });
        setSearchParams({});
    };

    const activeCategoryName = defaultCategories.find(c => c.slug === filters.category)?.name;
    const hasActiveFilters = filters.category || filters.condition || filters.priceRange || filters.search;

    return (
        <div className="shop-page">
            <div className="shop-header">
                <img src={evisuLatest} alt="" className="shop-hero-bg-img" />
                <div className="shop-hero-overlay" />
                <div className="container shop-header-content">
                    <h1>{activeCategoryName || 'Shop All'}</h1>
                    {filters.search && <p className="shop-search-info">Search results for: "{filters.search}"</p>}
                </div>
            </div>

            <div className="container">
                <div className="shop-toolbar">
                    <div className="shop-toolbar-left">
                        <button className="btn btn-ghost" onClick={() => setShowFilters(!showFilters)}>
                            <FiFilter size={16} /> Filters
                        </button>
                        <span className="shop-count">{filteredProducts.length} products</span>
                        {hasActiveFilters && (
                            <button className="shop-clear-filters" onClick={clearFilters}>
                                <FiX size={14} /> Clear filters
                            </button>
                        )}
                    </div>
                    <div className="shop-toolbar-right">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name A-Z</option>
                        </select>
                        <div className="view-toggle">
                            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                                <FiGrid size={18} />
                            </button>
                            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                                <FiList size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="shop-layout">
                    {/* Filters Sidebar */}
                    <motion.aside
                        className={`shop-filters ${showFilters ? 'show' : ''}`}
                        initial={false}
                        animate={{ width: showFilters ? 260 : 0, opacity: showFilters ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="filter-group">
                            <h4>Category</h4>
                            {defaultCategories.map(cat => (
                                <label key={cat.slug} className="filter-option">
                                    <input
                                        type="radio"
                                        name="category"
                                        checked={filters.category === cat.slug}
                                        onChange={() => setFilters(prev => ({ ...prev, category: cat.slug }))}
                                    />
                                    <span>{cat.icon} {cat.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="filter-group">
                            <h4>Condition</h4>
                            {PRODUCT_CONDITIONS.map(cond => (
                                <label key={cond.value} className="filter-option">
                                    <input
                                        type="radio"
                                        name="condition"
                                        checked={filters.condition === cond.value}
                                        onChange={() => setFilters(prev => ({ ...prev, condition: cond.value }))}
                                    />
                                    <span>{cond.label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="filter-group">
                            <h4>Price Range</h4>
                            {[
                                { label: 'Under €25', value: '0-25' },
                                { label: '€25 - €50', value: '25-50' },
                                { label: '€50 - €100', value: '50-100' },
                                { label: 'Over €100', value: '100-' },
                            ].map(range => (
                                <label key={range.value} className="filter-option">
                                    <input
                                        type="radio"
                                        name="price"
                                        checked={filters.priceRange === range.value}
                                        onChange={() => setFilters(prev => ({ ...prev, priceRange: range.value }))}
                                    />
                                    <span>{range.label}</span>
                                </label>
                            ))}
                        </div>
                    </motion.aside>

                    {/* Products Grid */}
                    <div className="shop-products">
                        {filteredProducts.length === 0 ? (
                            <div className="shop-empty">
                                <p>No products found.</p>
                                <button className="btn btn-outline" onClick={clearFilters}>Clear Filters</button>
                            </div>
                        ) : (
                            <div className={`grid ${viewMode === 'grid' ? 'grid-3' : 'grid-1'}`}>
                                {filteredProducts.map((product, idx) => (
                                    <ProductCard key={product.id} product={product} index={idx} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Shop;
