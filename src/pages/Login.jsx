import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { signIn, signInWithGoogle } from '../services/auth';
import { useToast } from '../components/common/Toast';
import logo from '../assets/logo-text.png';
import evisuDesigner from '../assets/evisu-designer.png';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill in all fields'); return; }
        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-not-verified') {
                toast.error('Please verify your email before signing in. A new verification email has been sent.');
                navigate('/verify-email', { state: { email: err.email || email } });
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                toast.error('Email or password is incorrect');
            } else if (err.code === 'auth/too-many-requests') {
                toast.error('Too many failed attempts. Please try again later.');
            } else {
                toast.error('Email or password is incorrect');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <img src={evisuDesigner} alt="" className="auth-bg-img" />
            <div className="auth-bg-overlay" />
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-header">
                    <img src={logo} alt="Second Thrift" className="auth-logo" />
                    <h1>Welcome Back</h1>
                    <p>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <FiMail className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
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
                        <button
                            type="button"
                            className="input-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>

                    <div className="auth-extras">
                        <label className="auth-remember">
                            <input type="checkbox" /> Remember me
                        </label>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <>Sign In <FiArrowRight /></>}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button
                    type="button"
                    className="btn btn-google w-full"
                    onClick={async () => {
                        try {
                            await signInWithGoogle();
                            toast.success('Welcome!');
                            navigate('/');
                        } catch (err) {
                            console.error(err);
                            if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                                toast.error('Google sign-in failed. Please try again.');
                            }
                        }
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.09 24.09 0 0 0 0 21.56l7.98-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                    Continue with Google
                </button>

                <p className="auth-switch">
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
