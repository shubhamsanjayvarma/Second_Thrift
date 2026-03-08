import {
    collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const usersRef = collection(db, 'users');

// Save or update user profile (called on login/register)
export const saveUserProfile = async (uid, data) => {
    await setDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

// Real-time listener for all users (admin)
export const subscribeToAllUsers = (callback) => {
    return onSnapshot(usersRef, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(users);
    });
};

// One-time fetch
export const getAllUsers = async () => {
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get user count
export const getUserCount = async () => {
    const snapshot = await getDocs(usersRef);
    return snapshot.size;
};
