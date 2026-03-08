import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const categoriesRef = collection(db, 'categories');

export const getCategories = async () => {
    const q = query(categoriesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createCategory = async (data) => {
    const docRef = await addDoc(categoriesRef, {
        ...data,
        active: true,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
};

export const updateCategory = async (id, data) => {
    await updateDoc(doc(db, 'categories', id), data);
};

export const deleteCategory = async (id) => {
    await deleteDoc(doc(db, 'categories', id));
};

// Default categories for initial setup
export const defaultCategories = [
    { name: 'Tops', slug: 'tops', description: 'T-Shirts, Shirts, Blouses, Sweaters, Hoodies', order: 1, icon: '👕' },
    { name: 'Bottoms', slug: 'bottoms', description: 'Jeans, Trousers, Shorts, Skirts', order: 2, icon: '👖' },
    { name: 'Outerwear', slug: 'outerwear', description: 'Jackets, Coats, Blazers, Vests', order: 3, icon: '🧥' },
    { name: 'Dresses', slug: 'dresses', description: 'Casual, Formal, Maxi, Mini', order: 4, icon: '👗' },
    { name: 'Activewear', slug: 'activewear', description: 'Sportswear, Tracksuits, Yoga', order: 5, icon: '🏃' },
    { name: 'Accessories', slug: 'accessories', description: 'Bags, Belts, Scarves, Hats', order: 6, icon: '👜' },
    { name: 'Footwear', slug: 'footwear', description: 'Sneakers, Boots, Sandals, Formal', order: 7, icon: '👟' },
    { name: 'Vintage', slug: 'vintage', description: '70s, 80s, 90s, 2000s', order: 8, icon: '🎭' },
    { name: 'Designer', slug: 'designer', description: 'Premium & Luxury Brands', order: 9, icon: '✨' },
    { name: 'Bulk Deals', slug: 'bulk-deals', description: 'Mixed Bundles & Wholesale Lots', order: 10, icon: '📦' },
];
