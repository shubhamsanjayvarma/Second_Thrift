import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGrid, FiPackage, FiShoppingBag, FiUsers, FiLogOut, FiMenu, FiX, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { signOutUser } from '../../services/auth';
import logo from '../../assets/logo-text.png';
import './Admin.css';

const MOBILE_BP = 1024;

const AdminLayout = () => {
    const { user, isAdmin, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > MOBILE_BP);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BP);

    // Track screen size
    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth <= MOBILE_BP;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Auto-close sidebar on route change (mobile only)
    useEffect(() => {
        if (isMobile) setSidebarOpen(false);
    }, [location.pathname, isMobile]);

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            navigate('/admin/login');
        }
    }, [user, isAdmin, loading, navigate]);

    if (loading) return <div className="admin-loading"><span className="spinner" style={{ width: 20, height: 20 }} /> Loading...</div>;
    if (!user || !isAdmin) return null;

    const navItems = [
        { to: '/admin', icon: <FiGrid />, label: 'Dashboard', exact: true },
        { to: '/admin/products', icon: <FiPackage />, label: 'Products' },
        { to: '/admin/orders', icon: <FiShoppingBag />, label: 'Orders' },
        { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
    ];

    const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="admin-layout admin-theme">
            {/* Mobile overlay backdrop for tablet sidebar */}
            {isMobile && window.innerWidth > 768 && sidebarOpen && (
                <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Desktop / Tablet Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'} hide-on-mobile`}>
                <div className="admin-sidebar-header">
                    <img src={logo} alt="Second Thrift" className="admin-logo" width="640" height="640" loading="eager" decoding="async" />
                    <span className="admin-label">Admin Panel</span>
                </div>
                <nav className="admin-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`admin-nav-link ${isActive(item.to, item.exact) ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <Link to="/" className="admin-nav-link">
                        <FiHome />
                        <span>View Store</span>
                    </Link>
                    <button className="admin-nav-link" onClick={() => signOutUser()}>
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation (Only visible on phones <= 768px) */}
            <nav className="admin-bottom-nav">
                {navItems.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`admin-bottom-link ${isActive(item.to, item.exact) ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <div className="admin-header-left">
                        <button className="admin-menu-toggle hide-on-mobile" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <FiX /> : <FiMenu />}
                        </button>
                        {/* Mobile Header Logo */}
                        <img src={logo} alt="Second Thrift" className="admin-header-logo show-on-mobile" width="640" height="640" loading="eager" decoding="async" />
                    </div>

                    <div className="admin-header-info">
                        <span className="admin-welcome hide-on-mobile">Admin: {user?.email}</span>
                        <div className="admin-header-actions show-on-mobile">
                            <Link to="/" className="admin-icon-btn"><FiHome size={20} /></Link>
                            <button className="admin-icon-btn" onClick={() => signOutUser()}><FiLogOut size={20} /></button>
                        </div>
                    </div>
                </header>
                <div className="admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
