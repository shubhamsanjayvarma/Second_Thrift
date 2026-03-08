import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiArrowRight } from 'react-icons/fi';
import { signUp, signInWithGoogle } from '../services/auth';
import { useToast } from '../components/common/Toast';
import logo from '../assets/logo-text.png';
import evisuCollection from '../assets/evisu-collection.png';
import './Auth.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !password) { toast.error('Please fill in all fields'); return; }
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setLoading(true);
        try {
            await signUp(email, password, name);
            toast.success('Verification email sent! Please check your inbox.');
            navigate('/verify-email', { state: { email } });
        } catch (err) {
            console.error(err);
            // Show exact error message as requested
            if (err.code === 'auth/email-already-in-use') {
                toast.error('User already exists. Please sign in');
            } else if (err.code === 'auth/invalid-email') {
                toast.error('Please enter a valid email address');
            } else if (err.code === 'auth/weak-password') {
                toast.error('Password must be at least 6 characters');
            } else {
                toast.error('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <img src={evisuCollection} alt="" className="auth-bg-img" />
            <div className="auth-bg-overlay" />
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="auth-header">
                    <img src={logo} alt="Second Thrift" className="auth-logo" />
                    <h1>Create Account</h1>
                    <p>Join Second Thrift today</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <FiUser className="input-icon" />
                        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="input-group">
                        <FiMail className="input-icon" />
                        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                        <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                    </div>

                    <label className="auth-terms">
                        <input type="checkbox" required />
                        <span>I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link></span>
                    </label>

                    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <>Create Account <FiArrowRight /></>}
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
                            toast.success('Welcome to Second Thrift!');
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
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;
