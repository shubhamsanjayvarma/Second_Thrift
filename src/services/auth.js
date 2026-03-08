import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { auth } from './firebase';

// Google auth provider
const googleProvider = new GoogleAuthProvider();

// Redirect URL after user clicks the verification link in their email
const getVerificationSettings = () => ({
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
});

/**
 * Sign in with Google popup.
 * Google accounts are already verified, so no email check needed.
 */
export const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
};

/**
 * Sign up with email and password.
 * Sends a verification email and signs out immediately —
 * the user must verify before they can log in.
 */
export const signUp = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
        await updateProfile(userCredential.user, { displayName });
    }
    // Send verification email — after clicking the link, user lands on /login
    await sendEmailVerification(userCredential.user, getVerificationSettings());
    // Sign out so the user is not auto-logged-in
    await signOut(auth);
    return userCredential.user;
};

/**
 * Sign in with email and password.
 * If the email is not verified, sign out and throw a custom error.
 */
export const signIn = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
        // Re-send verification email in case they need it again
        await sendEmailVerification(userCredential.user, getVerificationSettings());
        await signOut(auth);
        const err = new Error('Email not verified');
        err.code = 'auth/email-not-verified';
        err.email = email;
        throw err;
    }
    return userCredential.user;
};

/**
 * Resend verification email to the current user (if signed in).
 */
export const resendVerificationEmail = async () => {
    if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser, getVerificationSettings());
    }
};

/**
 * Sign out the current user
 */
export const signOutUser = async () => {
    await signOut(auth);
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
};

/**
 * Admin sign in - bypasses email verification check
 */
export const signInAdmin = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
};

/**
 * Check if user is admin (by email match)
 */
export const isAdminUser = (user) => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'secondthriftt.1@gmail.com';
    return user?.email === adminEmail;
};
