import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiMail, FiTrash2, FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import { useToast } from '../../components/common/Toast';
import { subscribeToAllUsers } from '../../services/users';
import { subscribeToSubscribers, deleteSubscriber } from '../../services/subscribers';
import './Admin.css';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [subsLoading, setSubsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');
    const toast = useToast();

    // Real-time subscriptions
    useEffect(() => {
        const unsubUsers = subscribeToAllUsers((data) => {
            setUsers(data);
            setUsersLoading(false);
        });

        const unsubSubs = subscribeToSubscribers((data) => {
            setSubscribers(data);
            setSubsLoading(false);
        });

        return () => {
            unsubUsers();
            unsubSubs();
        };
    }, []);

    const handleDeleteSubscriber = async (id) => {
        if (window.confirm('Remove this subscriber?')) {
            try {
                await deleteSubscriber(id);
                toast.success('Subscriber removed');
            } catch (err) {
                console.error(err);
                toast.error('Failed to remove subscriber');
            }
        }
    };

    const formatDate = (dateVal) => {
        if (!dateVal) return 'N/A';
        try {
            if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            return new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return 'N/A'; }
    };

    return (
        <div>
            <div className="admin-page-header">
                <h1 className="admin-page-title">Users & Subscribers</h1>
                <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>● Live updates</span>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    onClick={() => setActiveTab('users')}
                >
                    <FiUsers size={14} /> Registered Users ({users.length})
                </button>
                <button
                    className={`btn ${activeTab === 'subscribers' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                    onClick={() => setActiveTab('subscribers')}
                >
                    <FiMail size={14} /> Newsletter Subscribers ({subscribers.length})
                </button>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {usersLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>Loading users...</div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>
                            <FiUsers size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                            <p>No registered users yet</p>
                            <p style={{ fontSize: '0.75rem' }}>Users will appear here when they register or log in</p>
                        </div>
                    ) : (
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Registered</th>
                                        <th>Last Login</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, idx) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: '0.8rem' }}>
                                                            {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <strong>{user.displayName || 'Unnamed'}</strong>
                                                </div>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>{formatDate(user.createdAt)}</td>
                                            <td>{formatDate(user.lastLogin)}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Subscribers Tab */}
            {activeTab === 'subscribers' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {subsLoading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>Loading subscribers...</div>
                    ) : subscribers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>
                            <FiMail size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                            <p>No newsletter subscribers yet</p>
                        </div>
                    ) : (
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Subscribed On</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscribers.map((sub, idx) => (
                                        <motion.tr
                                            key={sub.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FiMail size={14} style={{ color: 'var(--admin-text-muted)' }} />
                                                    {sub.email}
                                                </div>
                                            </td>
                                            <td>{formatDate(sub.createdAt || sub.subscribedAt)}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSubscriber(sub.id)} style={{ color: '#ff4444' }}>
                                                    <FiTrash2 size={14} /> Remove
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default AdminUsers;
