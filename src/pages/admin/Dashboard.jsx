import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiShoppingBag, FiDollarSign, FiUsers, FiPackage,
    FiPlus, FiX, FiFileText, FiUserPlus, FiTrash2,
    FiEdit2, FiFolder, FiFile, FiClock, FiMail, FiTrendingUp
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/helpers';
import {
    collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { subscribeToOrderStats } from '../../services/orders';
import { subscribeToAllUsers } from '../../services/users';
import { subscribeToSubscribers } from '../../services/subscribers';
import './Admin.css';

// ───── MODAL COMPONENT ─────
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <motion.div
                className="admin-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="admin-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="admin-modal-top">
                        <h2>{title}</h2>
                        <button className="admin-modal-close" onClick={onClose}><FiX size={20} /></button>
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ───── DASHBOARD ─────
const Dashboard = () => {
    const { user } = useAuth();

    // Live stats
    const [orderStats, setOrderStats] = useState({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0, completedOrders: 0 });
    const [userCount, setUserCount] = useState(0);
    const [subscriberCount, setSubscriberCount] = useState(0);

    // Catalog items (products quick-add)
    const [catalogItems, setCatalogItems] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogForm, setCatalogForm] = useState({ name: '', category: '', price: '', stock: '' });
    const [catalogSaving, setCatalogSaving] = useState(false);

    // Notes
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(true);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: '', content: '' });
    const [noteSaving, setNoteSaving] = useState(false);

    // Team
    const [team, setTeam] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: '', role: '', email: '' });
    const [teamSaving, setTeamSaving] = useState(false);

    // Firestore refs (scoped to admin user)
    const catalogRef = () => collection(db, 'users', user.uid, 'catalogItems');
    const notesRef = () => collection(db, 'users', user.uid, 'notes');
    const teamRef = () => collection(db, 'users', user.uid, 'teamMembers');

    // ── LIVE SUBSCRIPTIONS ──
    useEffect(() => {
        if (!user) return;

        // Live order stats
        const unsubOrders = subscribeToOrderStats(setOrderStats);

        // Live user count
        const unsubUsers = subscribeToAllUsers((users) => setUserCount(users.length));

        // Live subscriber count
        const unsubSubs = subscribeToSubscribers((subs) => setSubscriberCount(subs.length));

        // Load user-scoped data
        loadCatalog();
        loadNotes();
        loadTeam();

        return () => {
            unsubOrders();
            unsubUsers();
            unsubSubs();
        };
    }, [user]);

    const loadCatalog = async () => {
        setCatalogLoading(true);
        try {
            const q = query(catalogRef(), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setCatalogItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.warn(e); }
        setCatalogLoading(false);
    };

    const loadNotes = async () => {
        setNotesLoading(true);
        try {
            const q = query(notesRef(), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.warn(e); }
        setNotesLoading(false);
    };

    const loadTeam = async () => {
        setTeamLoading(true);
        try {
            const q = query(teamRef(), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setTeam(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.warn(e); }
        setTeamLoading(false);
    };

    // ── SAVE HANDLERS ──
    const saveCatalogItem = async () => {
        if (!catalogForm.name.trim()) return;
        setCatalogSaving(true);
        try {
            const docRef = await addDoc(catalogRef(), {
                name: catalogForm.name.trim(),
                category: catalogForm.category.trim(),
                price: parseFloat(catalogForm.price) || 0,
                stock: parseInt(catalogForm.stock) || 0,
                createdAt: serverTimestamp(),
            });
            setCatalogItems(prev => [{ id: docRef.id, ...catalogForm, price: parseFloat(catalogForm.price) || 0, stock: parseInt(catalogForm.stock) || 0, createdAt: new Date() }, ...prev]);
            setCatalogForm({ name: '', category: '', price: '', stock: '' });
            setShowCatalogModal(false);
        } catch (e) { console.error(e); }
        setCatalogSaving(false);
    };

    const saveNote = async () => {
        if (!noteForm.title.trim()) return;
        setNoteSaving(true);
        try {
            const docRef = await addDoc(notesRef(), {
                title: noteForm.title.trim(),
                content: noteForm.content.trim(),
                createdAt: serverTimestamp(),
            });
            setNotes(prev => [{ id: docRef.id, ...noteForm, createdAt: new Date() }, ...prev]);
            setNoteForm({ title: '', content: '' });
            setShowNoteModal(false);
        } catch (e) { console.error(e); }
        setNoteSaving(false);
    };

    const saveTeamMember = async () => {
        if (!teamForm.name.trim()) return;
        setTeamSaving(true);
        try {
            const docRef = await addDoc(teamRef(), {
                name: teamForm.name.trim(),
                role: teamForm.role.trim(),
                email: teamForm.email.trim(),
                createdAt: serverTimestamp(),
            });
            setTeam(prev => [{ id: docRef.id, ...teamForm, createdAt: new Date() }, ...prev]);
            setTeamForm({ name: '', role: '', email: '' });
            setShowTeamModal(false);
        } catch (e) { console.error(e); }
        setTeamSaving(false);
    };

    // ── DELETE HANDLERS ──
    const deleteCatalogItem = async (id) => {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'catalogItems', id));
            setCatalogItems(prev => prev.filter(i => i.id !== id));
        } catch (e) { console.error(e); }
    };

    const deleteNote = async (id) => {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (e) { console.error(e); }
    };

    const deleteTeamMember = async (id) => {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'teamMembers', id));
            setTeam(prev => prev.filter(t => t.id !== id));
        } catch (e) { console.error(e); }
    };

    // ── HELPERS ──
    const LoadingState = () => (
        <div className="dash-empty"><span className="spinner" style={{ width: 20, height: 20 }} /> Loading...</div>
    );

    const EmptyState = ({ icon, text }) => (
        <div className="dash-empty">{icon} {text}</div>
    );

    return (
        <div>
            <h1 className="admin-page-title">Dashboard</h1>

            {/* ── STAT CARDS (6 cards — all real-time) ── */}
            <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                {[
                    { label: 'Total Orders', value: orderStats.totalOrders },
                    { label: 'Revenue', value: formatPrice(orderStats.totalRevenue) },
                    { label: 'Pending', value: orderStats.pendingOrders },
                    { label: 'Delivered', value: orderStats.completedOrders },
                    { label: 'Users', value: userCount },
                    { label: 'Subscribers', value: subscriberCount },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        className="admin-stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                    >
                        <h4>{stat.label}</h4>
                        <div className="admin-stat-value">{stat.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* ── THREE SECTION GRID ── */}
            <div className="dash-sections-grid">

                {/* ─── CATALOG / QUICK PRODUCTS ─── */}
                <motion.div className="dash-section-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="dash-section-header">
                        <h3><FiPackage /> Quick Catalog</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCatalogModal(true)}>
                            <FiPlus size={14} /> Add Item
                        </button>
                    </div>
                    <div className="dash-section-body">
                        {catalogLoading ? <LoadingState /> : catalogItems.length === 0 ? (
                            <EmptyState icon={<FiPackage />} text="No catalog items yet" />
                        ) : (
                            <div className="dash-item-list">
                                {catalogItems.map(item => (
                                    <div key={item.id} className="dash-item">
                                        <div className="dash-item-icon catalog-icon"><FiFile size={16} /></div>
                                        <div className="dash-item-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.category || 'Uncategorized'} · Stock: {item.stock} · {formatPrice(item.price)}</span>
                                        </div>
                                        <button className="dash-item-delete" onClick={() => deleteCatalogItem(item.id)}><FiTrash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="dash-section-footer">
                        <span>{catalogItems.length} item{catalogItems.length !== 1 ? 's' : ''}</span>
                    </div>
                </motion.div>

                {/* ─── ADMIN NOTES ─── */}
                <motion.div className="dash-section-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="dash-section-header">
                        <h3><FiFileText /> Admin Notes</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowNoteModal(true)}>
                            <FiPlus size={14} /> New Note
                        </button>
                    </div>
                    <div className="dash-section-body">
                        {notesLoading ? <LoadingState /> : notes.length === 0 ? (
                            <EmptyState icon={<FiFileText />} text="No notes yet" />
                        ) : (
                            <div className="dash-item-list">
                                {notes.map(note => (
                                    <div key={note.id} className="dash-item">
                                        <div className="dash-item-icon note-icon"><FiFileText size={16} /></div>
                                        <div className="dash-item-info">
                                            <strong>{note.title}</strong>
                                            <span>{note.content ? (note.content.length > 60 ? note.content.substring(0, 60) + '…' : note.content) : 'No content'}</span>
                                        </div>
                                        <button className="dash-item-delete" onClick={() => deleteNote(note.id)}><FiTrash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="dash-section-footer">
                        <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                    </div>
                </motion.div>

                {/* ─── TEAM MEMBERS ─── */}
                <motion.div className="dash-section-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <div className="dash-section-header">
                        <h3><FiUsers /> Team Members</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowTeamModal(true)}>
                            <FiPlus size={14} /> Add Member
                        </button>
                    </div>
                    <div className="dash-section-body">
                        {teamLoading ? <LoadingState /> : team.length === 0 ? (
                            <EmptyState icon={<FiUsers />} text="No team members yet" />
                        ) : (
                            <div className="dash-item-list">
                                {team.map(member => (
                                    <div key={member.id} className="dash-item">
                                        <div className="dash-item-icon team-icon">
                                            {member.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="dash-item-info">
                                            <strong>{member.name}</strong>
                                            <span>{member.role || 'No role'}{member.email ? ` · ${member.email}` : ''}</span>
                                        </div>
                                        <button className="dash-item-delete" onClick={() => deleteTeamMember(member.id)}><FiTrash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="dash-section-footer">
                        <span>{team.length} member{team.length !== 1 ? 's' : ''}</span>
                    </div>
                </motion.div>
            </div>

            {/* ════════════ MODALS ════════════ */}

            {/* Add Catalog Item */}
            <Modal isOpen={showCatalogModal} onClose={() => setShowCatalogModal(false)} title="Add Catalog Item">
                <div className="admin-modal-form">
                    <label>
                        Product Name *
                        <input placeholder="e.g. Vintage Denim Jacket" value={catalogForm.name} onChange={e => setCatalogForm({ ...catalogForm, name: e.target.value })} />
                    </label>
                    <label>
                        Category
                        <input placeholder="e.g. Outerwear, Tops, Bottoms" value={catalogForm.category} onChange={e => setCatalogForm({ ...catalogForm, category: e.target.value })} />
                    </label>
                    <div className="form-row">
                        <label>
                            Price (€)
                            <input type="number" placeholder="0.00" min="0" step="0.01" value={catalogForm.price} onChange={e => setCatalogForm({ ...catalogForm, price: e.target.value })} />
                        </label>
                        <label>
                            Stock
                            <input type="number" placeholder="0" min="0" value={catalogForm.stock} onChange={e => setCatalogForm({ ...catalogForm, stock: e.target.value })} />
                        </label>
                    </div>
                    <div className="admin-modal-actions">
                        <button className="btn btn-ghost" onClick={() => setShowCatalogModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveCatalogItem} disabled={catalogSaving || !catalogForm.name.trim()}>
                            {catalogSaving ? 'Saving...' : 'Add Item'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* New Note */}
            <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="New Note">
                <div className="admin-modal-form">
                    <label>
                        Title *
                        <input placeholder="e.g. Restock reminder, Supplier contact" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} />
                    </label>
                    <label>
                        Content
                        <textarea rows={4} placeholder="Write your note here..." value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} />
                    </label>
                    <div className="admin-modal-actions">
                        <button className="btn btn-ghost" onClick={() => setShowNoteModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveNote} disabled={noteSaving || !noteForm.title.trim()}>
                            {noteSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Team Member */}
            <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title="Add Team Member">
                <div className="admin-modal-form">
                    <label>
                        Name *
                        <input placeholder="e.g. John Doe" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                    </label>
                    <label>
                        Role
                        <input placeholder="e.g. Store Manager, Packaging, Customer Support" value={teamForm.role} onChange={e => setTeamForm({ ...teamForm, role: e.target.value })} />
                    </label>
                    <label>
                        Email
                        <input type="email" placeholder="e.g. john@secondthrift.com" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} />
                    </label>
                    <div className="admin-modal-actions">
                        <button className="btn btn-ghost" onClick={() => setShowTeamModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveTeamMember} disabled={teamSaving || !teamForm.name.trim()}>
                            {teamSaving ? 'Saving...' : 'Add Member'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
