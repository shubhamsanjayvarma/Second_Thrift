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

export const DEFAULT_EXCESS_PER_KG_RATE = 6.00;

export const DEFAULT_USA_WEIGHT_TIERS = [
    { maxWeight: 2, rate: 20.00, label: 'Up to 2 KG' },
    { maxWeight: 5, rate: 35.00, label: 'Up to 5 KG' },
    { maxWeight: 10, rate: 60.00, label: 'Up to 10 KG' },
    { maxWeight: 20, rate: 110.00, label: 'Up to 20 KG' },
    { maxWeight: 30, rate: 160.00, label: 'Up to 30 KG' },
];

export const getDefaultSettings = () => ({
    siteName: 'Second Thrift',
    heroTitle: 'Premium Thrift Fashion',
    heroSubtitle: 'Discover unique pre-loved clothing curated in India for Europe. Bulk deals, vintage finds, and designer pieces at unbeatable prices.',
    heroCTA: 'Shop Now',
    bannerText: 'Free shipping on orders over €100! Use code: THRIFT100',
    bannerActive: true,
    shippingRates: [
        { country: 'Germany', rate: 0, freeThreshold: 100 },
        { country: 'France', rate: 0, freeThreshold: 100 },
        { country: 'Netherlands', rate: 0, freeThreshold: 100 },
        { country: 'Belgium', rate: 0, freeThreshold: 100 },
        { country: 'Austria', rate: 0, freeThreshold: 100 },
        { country: 'Italy', rate: 0, freeThreshold: 100 },
        { country: 'Spain', rate: 0, freeThreshold: 100 },
        { country: 'Poland', rate: 0, freeThreshold: 100 },
        { country: 'United Kingdom', rate: 12.99, freeThreshold: 150 },
        { country: 'United States', rate: 20.00, freeThreshold: 0 },
        { country: 'Canada', rate: 25.00, freeThreshold: 180 },
        { country: 'Australia', rate: 30.00, freeThreshold: 220 },
        { country: 'Sweden', rate: 0, freeThreshold: 100 },
        { country: 'Denmark', rate: 0, freeThreshold: 100 },
    ],
    freeShippingThreshold: 100,
    regionalShipping: {
        europe: { rate: 0, label: 'Europe (Included / Free)', freeThreshold: 100 },
        usa: {
            rate: 20.00,
            label: 'United States (Express Courier)',
            freeThreshold: 0,
            excessPerKgRate: DEFAULT_EXCESS_PER_KG_RATE,
            weightTiers: DEFAULT_USA_WEIGHT_TIERS,
        },
        restOfWorld: { rate: 25.00, label: 'Rest of World (Standard International)', freeThreshold: 200 },
    },
    weightShipping: {
        enabled: true,
        excessPerKgRate: DEFAULT_EXCESS_PER_KG_RATE,
        tiers: DEFAULT_USA_WEIGHT_TIERS,
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
    emailNotifications: {
        enabled: true,
        senderName: 'Second Thrift',
        senderEmail: 'secondthriftt.1@gmail.com',
        notifyCustomer: true,
        notifyAdmin: true,
        adminNotificationEmail: 'secondthriftt.1@gmail.com',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: 'secondthriftt.1@gmail.com',
        smtpPass: 'eubhcazxqndcmzpd',
    },
    currency: 'EUR',
    currencySymbol: '€',
});
