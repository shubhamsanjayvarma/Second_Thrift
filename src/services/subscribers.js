import {
    collection, getDocs, deleteDoc, doc, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

const subscribersRef = collection(db, 'subscribers');

// Real-time listener for all subscribers (admin)
export const subscribeToSubscribers = (callback) => {
    return onSnapshot(subscribersRef, (snapshot) => {
        const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(subs);
    });
};

// One-time fetch
export const getAllSubscribers = async () => {
    const snapshot = await getDocs(subscribersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Delete a subscriber
export const deleteSubscriber = async (id) => {
    await deleteDoc(doc(db, 'subscribers', id));
};

// Get subscriber count
export const getSubscriberCount = async () => {
    const snapshot = await getDocs(subscribersRef);
    return snapshot.size;
};
