import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};

const CART_STORAGE_KEY = 'secondthrift_cart';

const initialState = {
    items: [],
    isOpen: false,
};

const cartReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_ITEM': {
            const existing = state.items.find(
                i => i.id === action.payload.id && i.size === action.payload.size
            );
            if (existing) {
                return {
                    ...state,
                    items: state.items.map(i =>
                        i.id === action.payload.id && i.size === action.payload.size
                            ? { ...i, quantity: i.quantity + action.payload.quantity }
                            : i
                    ),
                };
            }
            return { ...state, items: [...state.items, action.payload] };
        }
        case 'REMOVE_ITEM':
            return {
                ...state,
                items: state.items.filter(
                    i => !(i.id === action.payload.id && i.size === action.payload.size)
                ),
            };
        case 'UPDATE_QUANTITY':
            return {
                ...state,
                items: state.items.map(i =>
                    i.id === action.payload.id && i.size === action.payload.size
                        ? { ...i, quantity: Math.max(1, action.payload.quantity) }
                        : i
                ),
            };
        case 'CLEAR_CART':
            return { ...state, items: [] };
        case 'TOGGLE_CART':
            return { ...state, isOpen: !state.isOpen };
        case 'SET_CART_OPEN':
            return { ...state, isOpen: action.payload };
        case 'LOAD_CART':
            return { ...state, items: action.payload };
        default:
            return state;
    }
};

export const CartProvider = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // Load cart from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            if (saved) {
                dispatch({ type: 'LOAD_CART', payload: JSON.parse(saved) });
            }
        } catch (e) {
            console.error('Failed to load cart:', e);
        }
    }, []);

    // Save cart to localStorage
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    }, [state.items]);

    const addItem = (product, quantity = 1, size = 'One Size') => {
        dispatch({
            type: 'ADD_ITEM',
            payload: {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.images?.[0] || '',
                size,
                quantity,
            },
        });
    };

    const removeItem = (id, size) => dispatch({ type: 'REMOVE_ITEM', payload: { id, size } });
    const updateQuantity = (id, size, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, size, quantity } });
    const clearCart = () => dispatch({ type: 'CLEAR_CART' });
    const toggleCart = () => dispatch({ type: 'TOGGLE_CART' });
    const setCartOpen = (open) => dispatch({ type: 'SET_CART_OPEN', payload: open });

    const cartCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{
            items: state.items,
            isOpen: state.isOpen,
            cartCount,
            subtotal,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            toggleCart,
            setCartOpen,
        }}>
            {children}
        </CartContext.Provider>
    );
};
