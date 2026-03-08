import {
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
    query, where, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

const ordersRef = collection(db, 'orders');

export const createOrder = async (orderData) => {
    const docRef = await addDoc(ordersRef, {
        status: 'pending', // Default status unless overridden
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...orderData,
    });
    return docRef.id;
};

export const getOrdersByUser = async (userId) => {
    const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllOrders = async () => {
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Real-time listener for all orders (admin)
export const subscribeToAllOrders = (callback) => {
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    });
};

// Real-time listener for order stats (admin dashboard)
export const subscribeToOrderStats = (callback) => {
    return onSnapshot(ordersRef, (snapshot) => {
        const orders = snapshot.docs.map(doc => doc.data());
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        callback({ totalOrders, totalRevenue, pendingOrders, completedOrders });
    });
};

export const getOrderById = async (id) => {
    const docSnap = await getDoc(doc(db, 'orders', id));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    return null;
};

export const updateOrderStatus = async (id, status, notes = '') => {
    await updateDoc(doc(db, 'orders', id), {
        status,
        notes,
        updatedAt: serverTimestamp(),
    });
};

export const deleteOrder = async (id) => {
    await deleteDoc(doc(db, 'orders', id));
};

export const getOrderStats = async () => {
    const snapshot = await getDocs(ordersRef);
    const orders = snapshot.docs.map(doc => doc.data());

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;

    return { totalOrders, totalRevenue, pendingOrders, completedOrders };
};
