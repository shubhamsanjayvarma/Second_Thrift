import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLogOut, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../services/auth';
import { useToast } from '../components/common/Toast';
import evisuOuterwear from '../assets/evisu-outerwear.png';
import './Profile.css';

const Profile = () => {
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOutUser();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (err) {
            toast.error('Failed to log out');
        }
    };

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="profile-page">
            <img src={evisuOuterwear} alt="" className="profile-bg-img" />
            <div className="profile-bg-overlay" />
            <div className="container">
                <motion.div
                    className="profile-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="profile-avatar">
                        <FiUser size={48} />
                    </div>

                    <h1>{user.displayName || 'User'}</h1>


                    <div className="profile-info">
                        <div className="profile-info-item">
                            <FiMail size={18} />
                            <div>
                                <span className="profile-label">Email</span>
                                <span className="profile-value">{user.email}</span>
                            </div>
                        </div>
                        <div className="profile-info-item">
                            <FiUser size={18} />
                            <div>
                                <span className="profile-label">Display Name</span>
                                <span className="profile-value">{user.displayName || 'Not set'}</span>
                            </div>
                        </div>
                        <div className="profile-info-item">
                            <FiShield size={18} />
                            <div>
                                <span className="profile-label">Account ID</span>
                                <span className="profile-value" style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>{user.uid}</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button className="btn btn-ghost" onClick={handleLogout}>
                            <FiLogOut /> Logout
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;
