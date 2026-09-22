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
    const q = query(ordersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in-memory by createdAt descending
    return orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
    });
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
        const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
        const totalOrders = paidOrders.length;
        const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingOrders = paidOrders.filter(o => o.status === 'pending').length;
        const completedOrders = paidOrders.filter(o => o.status === 'delivered').length;
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

export const updateOrderPaymentStatus = async (id, paymentStatus, stripeSessionId = '') => {
    await updateDoc(doc(db, 'orders', id), {
        paymentStatus,
        ...(stripeSessionId && { stripeSessionId }),
        updatedAt: serverTimestamp(),
    });
};

export const updateOrderShipping = async (id, trackingNumber, serviceCode) => {
    await updateDoc(doc(db, 'orders', id), {
        status: 'shipped',
        shippingCarrier: 'Ship Global',
        trackingNumber,
        shippingServiceCode: serviceCode,
        shippedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
};

export const cancelOrderShipping = async (id, notes = '') => {
    await updateDoc(doc(db, 'orders', id), {
        status: 'payment_received',
        shippingCarrier: null,
        trackingNumber: null,
        shippingServiceCode: null,
        notes: notes || 'Shipping order cancelled',
        updatedAt: serverTimestamp(),
    });
};

export const updateOrderShippingFee = async (id, newShipping) => {
    const docSnap = await getDoc(doc(db, 'orders', id));
    if (!docSnap.exists()) throw new Error('Order not found');
    const orderData = docSnap.data();
    const subtotal = Number(orderData.subtotal || 0);
    const shipping = Math.max(0, Number(newShipping || 0));
    const total = subtotal + shipping;
    await updateDoc(doc(db, 'orders', id), {
        shipping,
        total,
        updatedAt: serverTimestamp(),
    });
    return { shipping, total };
};

export const deleteOrder = async (id) => {
    await deleteDoc(doc(db, 'orders', id));
};

export const getOrderStats = async () => {
    const snapshot = await getDocs(ordersRef);
    const orders = snapshot.docs.map(doc => doc.data());
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');

    const totalOrders = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = paidOrders.filter(o => o.status === 'pending').length;
    const completedOrders = paidOrders.filter(o => o.status === 'delivered').length;

    return { totalOrders, totalRevenue, pendingOrders, completedOrders };
};
