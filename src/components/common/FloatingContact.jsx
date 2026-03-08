import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import './FloatingContact.css';

const WHATSAPP_NUMBER = '+919909527515';
const INSTAGRAM_URL = 'https://www.instagram.com/second._.thriftt?igsh=MTU5MXd0ZDV3bDVsbA==';

const FloatingContact = () => {
    const [open, setOpen] = useState(false);

    return (
        <div className="floating-contact">
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="floating-contact-menu"
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <a
                            href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent('Hi! I have a question about Second Thrift.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-contact-item whatsapp"
                        >
                            <FaWhatsapp size={22} />
                            <span>WhatsApp</span>
                        </a>
                        <a
                            href={INSTAGRAM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-contact-item instagram"
                        >
                            <FaInstagram size={22} />
                            <span>Instagram</span>
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                className={`floating-contact-btn ${open ? 'active' : ''}`}
                onClick={() => setOpen(!open)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                {open ? <FiX size={24} /> : <FiMessageCircle size={24} />}
            </motion.button>
        </div>
    );
};

export default FloatingContact;
