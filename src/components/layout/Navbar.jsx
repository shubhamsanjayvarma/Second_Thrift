import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { FiShoppingBag, FiUser, FiMenu, FiX, FiSearch, FiHeart, FiLogOut, FiSettings } from 'react-icons/fi';
import logo from '../../assets/logo-text.png';
import './Navbar.css';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const { cartCount, toggleCart } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setSearchOpen(false);
    }, [location]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
            setSearchQuery('');
        }
    };

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/shop', label: 'Shop' },
        { to: '/shop?category=bulk-deals', label: 'Bulk Deals' },
        { to: '/shop?category=vintage', label: 'Vintage' },
        { to: '/about', label: 'About' },
        { to: '/contact', label: 'Contact' },
    ];

    return (
        <>
            <motion.nav
                className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div className="navbar-inner container-wide">
                    <Link to="/" className="navbar-logo">
                        <img src={logo} alt="Second Thrift" />
                    </Link>

                    <div className={`navbar-links ${mobileOpen ? 'active' : ''}`}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="navbar-mobile-actions">
                            {user ? (
                                <>
                                    <Link to="/orders" className="navbar-link">Orders</Link>
                                    <Link to="/wishlist" className="navbar-link">Wishlist</Link>
                                    <button className="navbar-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => { import('../../services/auth').then(m => m.signOutUser()); }}>Logout</button>
                                </>
                            ) : (
                                <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
                            )}
                        </div>
                    </div>

                    <div className="navbar-actions">
                        <button className="navbar-action-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
                            <FiSearch size={20} />
                        </button>

                        {user && (
                            <Link to="/wishlist" className="navbar-action-btn" aria-label="Wishlist">
                                <FiHeart size={20} />
                            </Link>
                        )}

                        <button className="navbar-action-btn cart-btn" onClick={toggleCart} aria-label="Cart">
                            <FiShoppingBag size={20} />
                            {cartCount > 0 && (
                                <motion.span
                                    className="cart-badge"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    key={cartCount}
                                >
                                    {cartCount}
                                </motion.span>
                            )}
                        </button>

                        {user ? (
                            <div className="navbar-user-menu">
                                <button className="navbar-action-btn user-btn">
                                    <FiUser size={20} />
                                </button>
                                <div className="user-dropdown">
                                    <Link to="/orders"><FiShoppingBag size={16} /> Orders</Link>
                                    <button onClick={() => { import('../../services/auth').then(m => m.signOutUser()); }}>
                                        <FiLogOut size={16} /> Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link to="/login" className="btn btn-primary btn-sm navbar-login-btn">Login</Link>
                        )}

                        <button className="navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
                            {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <AnimatePresence>
                    {searchOpen && (
                        <motion.div
                            className="navbar-search"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <form onSubmit={handleSearch} className="container">
                                <input
                                    type="text"
                                    placeholder="Search for thrift clothing..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" className="btn btn-primary">Search</button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="navbar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
