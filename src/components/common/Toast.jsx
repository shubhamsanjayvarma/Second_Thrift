import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';
import './Toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const info = (msg) => addToast(msg, 'info');
    const warning = (msg) => addToast(msg, 'warning');

    const icons = { success: FiCheck, error: FiAlertCircle, info: FiInfo, warning: FiAlertCircle };

    return (
        <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
            {children}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map(toast => {
                        const Icon = icons[toast.type] || FiInfo;
                        return (
                            <motion.div
                                key={toast.id}
                                className={`toast toast-${toast.type}`}
                                initial={{ opacity: 0, y: -20, x: 50 }}
                                animate={{ opacity: 1, y: 0, x: 0 }}
                                exit={{ opacity: 0, x: 100 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Icon size={18} />
                                <span>{toast.message}</span>
                                <button onClick={() => removeToast(toast.id)} className="toast-close">
                                    <FiX size={14} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
