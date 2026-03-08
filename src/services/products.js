import {
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, startAfter, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

const productsRef = collection(db, 'products');

export const getProducts = async (filters = {}, sortField = 'createdAt', sortDir = 'desc', pageSize = 12, lastDoc = null) => {
    let q = query(productsRef);
    const constraints = [];

    if (filters.category) constraints.push(where('category', '==', filters.category));
    if (filters.featured) constraints.push(where('featured', '==', true));
    if (filters.condition) constraints.push(where('condition', '==', filters.condition));

    constraints.push(orderBy(sortField, sortDir));
    constraints.push(limit(pageSize));
    if (lastDoc) constraints.push(startAfter(lastDoc));

    q = query(productsRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllProducts = async () => {
    const snapshot = await getDocs(query(productsRef, orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToAllProducts = (callback) => {
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(products);
    });
};

export const getProductById = async (id) => {
    const docSnap = await getDoc(doc(db, 'products', id));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    return null;
};

export const getProductsByCategory = async (category) => {
    const q = query(productsRef, where('category', '==', category), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFeaturedProducts = async (count = 8) => {
    const q = query(productsRef, where('featured', '==', true), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToFeaturedProducts = (count = 8, callback) => {
    const q = query(productsRef, where('featured', '==', true), limit(count));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(products);
    });
};

export const createProduct = async (data) => {
    const docRef = await addDoc(productsRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updateProduct = async (id, data) => {
    await updateDoc(doc(db, 'products', id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
};

export const deleteProduct = async (id) => {
    await deleteDoc(doc(db, 'products', id));
};

export const searchProducts = async (searchTerm) => {
    const snapshot = await getDocs(query(productsRef, orderBy('name')));
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
};
