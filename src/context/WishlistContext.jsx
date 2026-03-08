import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { addToWishlist, removeFromWishlist, getWishlist } from '../services/wishlist';

const WishlistContext = createContext(null);

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) throw new Error('useWishlist must be used within WishlistProvider');
    return context;
};

export const WishlistProvider = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load wishlist from Firebase when user logs in
    useEffect(() => {
        if (!user) {
            setItems([]);
            return;
        }
        setLoading(true);
        getWishlist(user.uid)
            .then(setItems)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    const addItem = useCallback(async (product) => {
        if (!user) return;
        // Optimistic update
        setItems(prev => {
            if (prev.some(i => i.productId === product.id || i.id === product.id)) return prev;
            return [...prev, { id: product.id, productId: product.id, name: product.name, price: product.price, image: product.images?.[0] || '', brand: product.brand || '', category: product.categoryName || product.category || '' }];
        });
        try {
            await addToWishlist(user.uid, product);
        } catch (e) {
            console.error('Failed to add to wishlist:', e);
            // Revert on error
            setItems(prev => prev.filter(i => i.productId !== product.id && i.id !== product.id));
        }
    }, [user]);

    const removeItem = useCallback(async (productId) => {
        if (!user) return;
        const backup = items;
        setItems(prev => prev.filter(i => i.productId !== productId && i.id !== productId));
        try {
            await removeFromWishlist(user.uid, productId);
        } catch (e) {
            console.error('Failed to remove from wishlist:', e);
            setItems(backup);
        }
    }, [user, items]);

    const isInWishlist = useCallback((productId) => {
        return items.some(i => i.productId === productId || i.id === productId);
    }, [items]);

    const toggleItem = useCallback(async (product) => {
        if (isInWishlist(product.id)) {
            await removeItem(product.id);
            return false;
        } else {
            await addItem(product);
            return true;
        }
    }, [isInWishlist, removeItem, addItem]);

    return (
        <WishlistContext.Provider value={{
            items,
            loading,
            count: items.length,
            addItem,
            removeItem,
            isInWishlist,
            toggleItem,
        }}>
            {children}
        </WishlistContext.Provider>
    );
};
