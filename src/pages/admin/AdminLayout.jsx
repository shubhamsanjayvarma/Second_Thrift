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
            {/* Mobile overlay backdrop */}
            {isMobile && sidebarOpen && (
                <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="admin-sidebar-header">
                    <img src={logo} alt="Second Thrift" className="admin-logo" />
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

            {/* Main */}
            <main className="admin-main">
                <header className="admin-header">
                    <button className="admin-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <FiX /> : <FiMenu />}
                    </button>
                    <div className="admin-header-info">
                        <span className="admin-welcome">Welcome, Ketan Bhai Suresh Bhai Gorasava</span>
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
