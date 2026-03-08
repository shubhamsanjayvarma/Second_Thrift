import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowRight } from 'react-icons/fi';
import logo from '../assets/logo-text.png';
import evisuHero from '../assets/evisu-hero.png';
import './Auth.css';

const VerifyEmail = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email';

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
                    <div className="verify-icon-wrapper">
                        <FiMail size={48} color="var(--primary)" />
                    </div>
                    <h1>Verify Your Email</h1>
                    <p style={{ marginTop: 'var(--space-4)', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                        We have sent you a verification email to{' '}
                        <strong style={{ color: 'var(--primary)' }}>{email}</strong>.
                        <br />
                        Please verify it and log in.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Login <FiArrowRight />
                    </Link>
                </div>

                <p className="auth-switch" style={{ marginTop: 'var(--space-6)' }}>
                    Didn't receive the email? Check your spam folder or{' '}
                    <Link to="/register">try registering again</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default VerifyEmail;
