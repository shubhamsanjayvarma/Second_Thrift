import { db } from './firebase';
import {
    doc,
    setDoc,
    deleteDoc,
    collection,
    getDocs,
    serverTimestamp,
} from 'firebase/firestore';

// Each user gets a wishlist subcollection: users/{uid}/wishlist/{productId}

export const addToWishlist = async (uid, product) => {
    const ref = doc(db, 'users', uid, 'wishlist', product.id);
    await setDoc(ref, {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        brand: product.brand || '',
        category: product.categoryName || product.category || '',
        addedAt: serverTimestamp(),
    });
};

export const removeFromWishlist = async (uid, productId) => {
    const ref = doc(db, 'users', uid, 'wishlist', productId);
    await deleteDoc(ref);
};

export const getWishlist = async (uid) => {
    const snap = await getDocs(collection(db, 'users', uid, 'wishlist'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
