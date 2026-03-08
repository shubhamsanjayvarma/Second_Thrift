import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi';
import { signInAdmin, resetPassword } from '../../services/auth';
import { useToast } from '../../components/common/Toast';
import logo from '../../assets/logo-text.png';
import evisuHero from '../../assets/evisu-hero.png';
import '../Auth.css';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'secondthriftt.1@gmail.com';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill in all fields'); return; }

        // Only allow admin email
        if (email !== adminEmail) {
            toast.error('Access denied. Admin only.');
            return;
        }

        setLoading(true);
        try {
            await signInAdmin(email, password);
            toast.success('Welcome, Admin!');
            navigate('/admin');
        } catch (err) {
            console.error('Admin login error:', err.code, err.message);

            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                toast.error('Invalid credentials. Please check your email and password.');
            } else if (err.code === 'auth/wrong-password') {
                toast.error('Wrong password. Use "Forgot password?" to reset.');
            } else if (err.code === 'auth/too-many-requests') {
                toast.error('Too many attempts. Try again later.');
            } else {
                toast.error('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail) { toast.error('Please enter your admin email'); return; }

        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'secondthriftt.1@gmail.com';
        if (resetEmail !== adminEmail) {
            toast.error('This email is not an admin account');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(resetEmail);
            setResetSent(true);
            toast.success('Password reset email sent!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <img src={evisuHero} alt="" className="auth-bg-img" />
            <div className="auth-bg-overlay" />
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-header">
                    <img src={logo} alt="Second Thrift" className="auth-logo" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FiShield style={{ color: 'var(--primary)' }} />
                        <h1 style={{ margin: 0 }}>Admin Panel</h1>
                    </div>
                    <p>{forgotMode ? 'Reset your admin password' : 'Sign in to admin dashboard'}</p>
                </div>

                {!forgotMode ? (
                    <>
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <FiMail className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="Admin email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>

                            <div className="input-group">
                                <FiLock className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <>Sign In <FiArrowRight /></>}
                            </button>
                        </form>

                        <p className="auth-switch" style={{ marginTop: 'var(--space-4)' }}>
                            <button
                                type="button"
                                onClick={() => setForgotMode(true)}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}
                            >
                                Forgot password?
                            </button>
                        </p>
                    </>
                ) : (
                    <>
                        {!resetSent ? (
                            <form onSubmit={handleForgotPassword} className="auth-form">
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                                    Enter your admin email to receive a password reset link.
                                </p>
                                <div className="input-group">
                                    <FiMail className="input-icon" />
                                    <input
                                        type="email"
                                        placeholder="Admin email address"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                                    {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Send Reset Link'}
                                </button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                                <div style={{ fontSize: '48px', marginBottom: 'var(--space-3)' }}><FiMail size={48} style={{ color: 'var(--primary)' }} /></div>
                                <h3 style={{ marginBottom: 'var(--space-2)' }}>Check Your Email</h3>
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    Password reset link sent to<br />
                                    <strong>{resetEmail}</strong>
                                </p>
                            </div>
                        )}

                        <p className="auth-switch" style={{ marginTop: 'var(--space-4)' }}>
                            <button
                                type="button"
                                onClick={() => { setForgotMode(false); setResetSent(false); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}
                            >
                                ← Back to login
                            </button>
                        </p>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default AdminLogin;
