import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const settingsRef = doc(db, 'settings', 'general');

export const getSettings = async () => {
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) return docSnap.data();
    return getDefaultSettings();
};

export const updateSettings = async (data) => {
    await setDoc(settingsRef, data, { merge: true });
};

// Real-time listener for settings
export const subscribeToSettings = (callback) => {
    return onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            callback(getDefaultSettings());
        }
    });
};

export const getDefaultSettings = () => ({
    siteName: 'Second Thrift',
    heroTitle: 'Premium Thrift Fashion',
    heroSubtitle: 'Discover unique pre-loved clothing curated in India for Europe. Bulk deals, vintage finds, and designer pieces at unbeatable prices.',
    heroCTA: 'Shop Now',
    bannerText: 'Free shipping on orders over €100! Use code: THRIFT100',
    bannerActive: true,
    shippingRates: [
        { country: 'Germany', rate: 5.99 },
        { country: 'France', rate: 7.99 },
        { country: 'Netherlands', rate: 6.99 },
        { country: 'Belgium', rate: 6.99 },
        { country: 'Austria', rate: 6.99 },
        { country: 'Poland', rate: 8.99 },
        { country: 'Italy', rate: 8.99 },
        { country: 'Spain', rate: 9.99 },
        { country: 'United Kingdom', rate: 12.99 },
        { country: 'Sweden', rate: 10.99 },
        { country: 'Denmark', rate: 9.99 },
        { country: 'Czech Republic', rate: 8.99 },
        { country: 'Other EU', rate: 14.99 },
    ],
    freeShippingThreshold: 100,
    regionalShipping: {
        europe: { rate: 0, label: 'Europe (Included / Free)', freeThreshold: 100 },
        usa: { rate: 20.00, label: 'United States (Express Courier)', freeThreshold: 150 },
        restOfWorld: { rate: 25.00, label: 'Rest of World (Standard International)', freeThreshold: 200 },
    },
    taxRate: 19,
    ownerWhatsApp: import.meta.env.VITE_OWNER_WHATSAPP || '+491234567890',
    wiseEmail: 'pay@secondthrift.com',
    aboutText: 'Second Thrift is an Indian-based thrift clothing curator shipping premium pre-loved vintage and designer streetwear to Europe. We believe in sustainable fashion and giving clothes a second life.',
    contactEmail: 'secondthriftt39@gmail.com',
    socialLinks: {
        instagram: 'https://www.instagram.com/second._.thriftt?igsh=MTU5MXd0ZDV3bDVsbA==',
        facebook: 'https://facebook.com/secondthrift',
        tiktok: 'https://tiktok.com/@secondthrift',
    },
    currency: 'EUR',
    currencySymbol: '€',
});
