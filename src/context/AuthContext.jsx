import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, isAdminUser } from '../services/auth';
import { saveUserProfile } from '../services/users';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            // Save user profile to Firestore for admin to view
            if (firebaseUser) {
                saveUserProfile(firebaseUser.uid, {
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || '',
                    photoURL: firebaseUser.photoURL || '',
                    lastLogin: new Date().toISOString(),
                    ...(firebaseUser.metadata?.creationTime ? { createdAt: firebaseUser.metadata.creationTime } : {}),
                }).catch(err => console.warn('Failed to save user profile:', err));
            }
        });
        return unsubscribe;
    }, []);

    const isAdmin = user ? isAdminUser(user) : false;

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
