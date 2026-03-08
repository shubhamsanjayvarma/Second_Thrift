import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './components/common/Toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartSidebar from './components/cart/CartSidebar';
import FloatingContact from './components/common/FloatingContact';
import './styles/index.css';

// Lazy-load pages for performance
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ShippingPage = lazy(() => import('./pages/InfoPages').then(m => ({ default: m.ShippingPage })));
const ReturnsPage = lazy(() => import('./pages/InfoPages').then(m => ({ default: m.ReturnsPage })));
const FAQPage = lazy(() => import('./pages/InfoPages').then(m => ({ default: m.FAQPage })));
const TermsPage = lazy(() => import('./pages/InfoPages').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/InfoPages').then(m => ({ default: m.PrivacyPage })));

// Admin
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));

const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

// Loading spinner
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: 'var(--primary)',
    gap: '12px',
    fontSize: '1.1rem',
  }}>
    <div className="spinner" />
    Loading...
  </div>
);

// Layout wrapper for customer pages
const CustomerLayout = ({ children }) => (
  <>
    <Navbar />
    <CartSidebar />
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </main>
    <Footer />
    <FloatingContact />
  </>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin/login" element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminLogin />
                  </Suspense>
                } />
                <Route path="/admin" element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminLayout />
                  </Suspense>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                  <Route path="products" element={<Suspense fallback={<PageLoader />}><AdminProducts /></Suspense>} />
                  <Route path="orders" element={<Suspense fallback={<PageLoader />}><AdminOrders /></Suspense>} />
                  <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />

                </Route>

                {/* Customer Routes */}
                <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
                <Route path="/shop" element={<CustomerLayout><Shop /></CustomerLayout>} />
                <Route path="/product/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
                <Route path="/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
                <Route path="/login" element={<CustomerLayout><Login /></CustomerLayout>} />
                <Route path="/register" element={<CustomerLayout><Register /></CustomerLayout>} />
                <Route path="/verify-email" element={<CustomerLayout><VerifyEmail /></CustomerLayout>} />
                <Route path="/about" element={<CustomerLayout><About /></CustomerLayout>} />
                <Route path="/contact" element={<CustomerLayout><Contact /></CustomerLayout>} />
                <Route path="/profile" element={<CustomerLayout><Profile /></CustomerLayout>} />
                <Route path="/orders" element={<CustomerLayout><Orders /></CustomerLayout>} />
                <Route path="/wishlist" element={<CustomerLayout><Wishlist /></CustomerLayout>} />
                <Route path="/shipping" element={<CustomerLayout><ShippingPage /></CustomerLayout>} />
                <Route path="/returns" element={<CustomerLayout><ReturnsPage /></CustomerLayout>} />
                <Route path="/faq" element={<CustomerLayout><FAQPage /></CustomerLayout>} />
                <Route path="/terms" element={<CustomerLayout><TermsPage /></CustomerLayout>} />
                <Route path="/privacy" element={<CustomerLayout><PrivacyPage /></CustomerLayout>} />

                {/* 404 */}
                <Route path="*" element={
                  <CustomerLayout>
                    <div style={{ textAlign: 'center', padding: '120px 20px', flex: 1 }}>
                      <h1 style={{ fontSize: '6rem', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>404</h1>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '16px', marginBottom: '32px' }}>Page not found</p>
                      <a href="/" className="btn btn-primary">Go Home</a>
                    </div>
                  </CustomerLayout>
                } />
              </Routes>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
