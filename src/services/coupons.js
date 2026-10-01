import {
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp, onSnapshot, increment, arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

const couponsRef = collection(db, 'coupons');

/**
 * Normalizes a coupon code to uppercase, trimmed, and without spaces.
 */
export const normalizeCouponCode = (code) => {
    return (code || '').trim().toUpperCase().replace(/\s+/g, '');
};

/**
 * Subscribes to all coupons in real-time (for Admin panel).
 */
export const subscribeToCoupons = (callback) => {
    return onSnapshot(couponsRef, (snapshot) => {
        const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // In-memory sort by createdAt descending
        coupons.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
        });
        callback(coupons);
    }, (error) => {
        console.error('Error subscribing to coupons:', error);
        callback([]);
    });
};

/**
 * Fetches all coupons once.
 */
export const getAllCoupons = async () => {
    try {
        const snapshot = await getDocs(couponsRef);
        const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return coupons.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
        });
    } catch (err) {
        console.error('Error fetching coupons:', err);
        return [];
    }
};

/**
 * Finds an active or existing coupon by code.
 */
export const getCouponByCode = async (code) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) return null;

    const q = query(couponsRef, where('code', '==', normalized));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Creates a new coupon with validation.
 */
export const createCoupon = async (couponData) => {
    const code = normalizeCouponCode(couponData.code);
    if (!code) {
        throw new Error('Coupon code is required');
    }

    // Check if code already exists
    const existing = await getCouponByCode(code);
    if (existing) {
        throw new Error(`A coupon with code "${code}" already exists.`);
    }

    const value = parseFloat(couponData.value);
    if (isNaN(value) || value <= 0) {
        throw new Error('Please enter a valid discount value greater than 0');
    }

    if (couponData.type === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
    }

    const newCoupon = {
        code,
        description: (couponData.description || '').trim(),
        type: couponData.type || 'percentage', // 'percentage' | 'fixed' | 'shipping'
        value,
        maxDiscountAmount: couponData.maxDiscountAmount ? parseFloat(couponData.maxDiscountAmount) : null,
        minOrderValue: couponData.minOrderValue ? parseFloat(couponData.minOrderValue) : 0,
        minQuantity: couponData.minQuantity ? parseInt(couponData.minQuantity, 10) : 0,
        startDate: couponData.startDate ? new Date(couponData.startDate).toISOString() : null,
        expiryDate: couponData.expiryDate ? new Date(couponData.expiryDate).toISOString() : null,
        usageLimit: couponData.usageLimit ? parseInt(couponData.usageLimit, 10) : null,
        usedCount: 0,
        perUserLimit: couponData.perUserLimit ? parseInt(couponData.perUserLimit, 10) : 1,
        applicableCategories: Array.isArray(couponData.applicableCategories) ? couponData.applicableCategories : [],
        applicableProducts: Array.isArray(couponData.applicableProducts) ? couponData.applicableProducts : [],
        redeemedBy: [],
        isActive: couponData.isActive !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(couponsRef, newCoupon);
    return docRef.id;
};

/**
 * Updates an existing coupon.
 */
export const updateCoupon = async (id, couponData) => {
    const docRef = doc(db, 'coupons', id);
    const code = normalizeCouponCode(couponData.code);

    if (code) {
        // If code changed, check uniqueness
        const existing = await getCouponByCode(code);
        if (existing && existing.id !== id) {
            throw new Error(`Coupon code "${code}" is already in use by another coupon.`);
        }
    }

    const updates = {
        updatedAt: serverTimestamp(),
    };

    if (code) updates.code = code;
    if (couponData.description !== undefined) updates.description = (couponData.description || '').trim();
    if (couponData.type) updates.type = couponData.type;
    if (couponData.value !== undefined) updates.value = parseFloat(couponData.value);
    if (couponData.maxDiscountAmount !== undefined) {
        updates.maxDiscountAmount = couponData.maxDiscountAmount ? parseFloat(couponData.maxDiscountAmount) : null;
    }
    if (couponData.minOrderValue !== undefined) {
        updates.minOrderValue = couponData.minOrderValue ? parseFloat(couponData.minOrderValue) : 0;
    }
    if (couponData.minQuantity !== undefined) {
        updates.minQuantity = couponData.minQuantity ? parseInt(couponData.minQuantity, 10) : 0;
    }
    if (couponData.startDate !== undefined) {
        updates.startDate = couponData.startDate ? new Date(couponData.startDate).toISOString() : null;
    }
    if (couponData.expiryDate !== undefined) {
        updates.expiryDate = couponData.expiryDate ? new Date(couponData.expiryDate).toISOString() : null;
    }
    if (couponData.usageLimit !== undefined) {
        updates.usageLimit = couponData.usageLimit ? parseInt(couponData.usageLimit, 10) : null;
    }
    if (couponData.perUserLimit !== undefined) {
        updates.perUserLimit = couponData.perUserLimit ? parseInt(couponData.perUserLimit, 10) : 1;
    }
    if (couponData.applicableCategories !== undefined) {
        updates.applicableCategories = couponData.applicableCategories;
    }
    if (couponData.isActive !== undefined) {
        updates.isActive = Boolean(couponData.isActive);
    }

    await updateDoc(docRef, updates);
    return true;
};

/**
 * Toggles coupon status (active/paused).
 */
export const toggleCouponStatus = async (id, currentStatus) => {
    const docRef = doc(db, 'coupons', id);
    await updateDoc(docRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Permanently deletes a coupon.
 */
export const deleteCoupon = async (id) => {
    const docRef = doc(db, 'coupons', id);
    await deleteDoc(docRef);
    return true;
};

/**
 * Pure calculation helper: computes discount based on coupon rules.
 */
export const calculateCouponDiscount = (coupon, { cartItems = [], subtotal = 0, shipping = 0 }) => {
    if (!coupon || !coupon.isActive) return 0;

    let eligibleSubtotal = subtotal;

    // If categories are specified, calculate subtotal only from eligible items
    if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
        const eligibleItems = cartItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            return coupon.applicableCategories.some(c => c.toLowerCase() === cat);
        });
        eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    }

    if (eligibleSubtotal <= 0 && coupon.type !== 'shipping') {
        return 0;
    }

    let discount = 0;

    if (coupon.type === 'percentage') {
        discount = (eligibleSubtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
            discount = Math.min(discount, Number(coupon.maxDiscountAmount));
        }
    } else if (coupon.type === 'fixed') {
        discount = Math.min(Number(coupon.value), eligibleSubtotal);
    } else if (coupon.type === 'shipping') {
        discount = Number(shipping) || 0;
    }

    // Never return negative or NaN, round to 2 decimals
    return Math.max(0, Math.round(discount * 100) / 100);
};

/**
 * Comprehensive Validation Engine:
 * Validates a coupon against cart, user, dates, and limits.
 * Returns { valid: true, coupon, discountAmount, message } or { valid: false, error: '...' }
 */
export const validateCoupon = async (code, {
    cartItems = [],
    subtotal = 0,
    shipping = 0,
    userEmail = '',
    totalQuantity = 0,
}) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) {
        return { valid: false, error: 'Please enter a coupon code' };
    }

    const coupon = await getCouponByCode(normalized);
    if (!coupon) {
        return { valid: false, error: `Coupon code "${normalized}" is invalid or does not exist.` };
    }

    // 1. Active status check
    if (!coupon.isActive) {
        return { valid: false, error: `Coupon "${normalized}" is currently disabled or inactive.` };
    }

    const now = new Date();

    // 2. Start Date check (Scheduled for future)
    if (coupon.startDate) {
        const start = new Date(coupon.startDate);
        if (now < start) {
            return {
                valid: false,
                error: `Coupon "${normalized}" will become active on ${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`
            };
        }
    }

    // 3. Expiry Date check
    if (coupon.expiryDate) {
        const expiry = new Date(coupon.expiryDate);
        if (now > expiry) {
            return {
                valid: false,
                error: `Coupon "${normalized}" expired on ${expiry.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`
            };
        }
    }

    // 4. Overall Usage Limit check
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
        return {
            valid: false,
            error: `Coupon "${normalized}" has reached its maximum redemption limit.`
        };
    }

    // 5. Per-User Usage Limit check (if user email provided)
    if (userEmail && coupon.perUserLimit && Array.isArray(coupon.redeemedBy)) {
        const normalizedEmail = userEmail.trim().toLowerCase();
        const userRedemptions = coupon.redeemedBy.filter(r => (r.email || '').trim().toLowerCase() === normalizedEmail).length;
        if (userRedemptions >= coupon.perUserLimit) {
            return {
                valid: false,
                error: `You have already used coupon "${normalized}" the maximum allowed times (${coupon.perUserLimit}).`
            };
        }
    }

    // 6. Minimum Order Value check
    if (coupon.minOrderValue && coupon.minOrderValue > 0) {
        if (subtotal < coupon.minOrderValue) {
            return {
                valid: false,
                error: `Coupon "${normalized}" requires a minimum order subtotal of €${coupon.minOrderValue.toFixed(2)} (Current: €${subtotal.toFixed(2)}).`
            };
        }
    }

    // 7. Minimum Quantity check
    const itemsCount = totalQuantity > 0 ? totalQuantity : cartItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    if (coupon.minQuantity && coupon.minQuantity > 0) {
        if (itemsCount < coupon.minQuantity) {
            return {
                valid: false,
                error: `Coupon "${normalized}" requires at least ${coupon.minQuantity} items in your cart (Current: ${itemsCount}).`
            };
        }
    }

    // 8. Applicable Categories check
    if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
        const hasQualifyingItem = cartItems.some(item => {
            const cat = (item.category || '').toLowerCase();
            return coupon.applicableCategories.some(c => c.toLowerCase() === cat);
        });
        if (!hasQualifyingItem) {
            return {
                valid: false,
                error: `Coupon "${normalized}" applies only to products in: ${coupon.applicableCategories.join(', ')}.`
            };
        }
    }

    // 9. Calculate discount amount
    const discountAmount = calculateCouponDiscount(coupon, { cartItems, subtotal, shipping });

    if (discountAmount <= 0) {
        return {
            valid: false,
            error: `Coupon "${normalized}" provides zero discount on the items in your cart.`
        };
    }

    let discountLabel = '';
    if (coupon.type === 'percentage') {
        discountLabel = `${coupon.value}% OFF${coupon.maxDiscountAmount ? ` (Max €${coupon.maxDiscountAmount})` : ''}`;
    } else if (coupon.type === 'fixed') {
        discountLabel = `€${coupon.value.toFixed(2)} Flat Discount`;
    } else if (coupon.type === 'shipping') {
        discountLabel = 'Free Shipping Applied';
    }

    return {
        valid: true,
        coupon,
        discountAmount,
        discountType: coupon.type,
        discountLabel,
        message: `Coupon "${coupon.code}" applied! You save €${discountAmount.toFixed(2)} (${discountLabel}).`,
    };
};

/**
 * Records coupon redemption in Firestore when an order is completed/paid.
 */
export const recordCouponUsage = async (couponId, { orderId, userEmail, discountAmount }) => {
    if (!couponId) return;
    try {
        const docRef = doc(db, 'coupons', couponId);
        await updateDoc(docRef, {
            usedCount: increment(1),
            redeemedBy: arrayUnion({
                orderId: orderId || '',
                email: (userEmail || '').trim().toLowerCase(),
                discountAmount: Number(discountAmount || 0),
                redeemedAt: new Date().toISOString(),
            }),
            updatedAt: serverTimestamp(),
        });
        console.log(`🎟️ Recorded redemption for coupon ${couponId} by ${userEmail}`);
    } catch (err) {
        console.error('Failed to record coupon redemption:', err);
    }
};
