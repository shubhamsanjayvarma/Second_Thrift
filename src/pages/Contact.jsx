import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiMapPin, FiSend } from 'react-icons/fi';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { useToast } from '../components/common/Toast';
import evisuOuterwear from '../assets/evisu-outerwear.png';
import './About.css';

const Contact = () => {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const toast = useToast();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) {
            toast.error('Please fill in all required fields');
            return;
        }
        toast.success('Message sent! We\'ll get back to you soon.');
        setForm({ name: '', email: '', subject: '', message: '' });
    };

    const contactItems = [
        { icon: <FiMail size={22} />, title: 'Email', value: 'secondthriftt.1@gmail.com', href: 'mailto:secondthriftt.1@gmail.com', isLink: true },
        { icon: <FaWhatsapp size={22} />, title: 'WhatsApp', value: '+91 9909527515', href: 'https://wa.me/919909527515', isLink: true, external: true },
        { icon: <FaInstagram size={22} />, title: 'Instagram', value: '@second._.thriftt', href: 'https://www.instagram.com/second._.thriftt?igsh=MTU5MXd0ZDV3bDVsbA==', isLink: true, external: true },
        { icon: <FiMapPin size={22} />, title: 'Location', value: 'Europe Based', isLink: false },
    ];

    return (
        <div className="contact-page-wrap">
            {/* Hero with full Evisu image */}
            <section className="contact-hero">
                <img src={evisuOuterwear} alt="" className="contact-hero-bg-img" />
                <div className="contact-hero-overlay" />
                <div className="contact-hero-content container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <p className="about-hero-label">GET IN TOUCH</p>
                        <h1 className="about-hero-title">
                            CONTACT <span className="plug-accent">Us</span>
                        </h1>
                        <p className="about-hero-sub">
                            We'd love to hear from you. Reach out anytime.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Content */}
            <section className="contact-content-section">
                <div className="container">
                    <motion.div
                        className="contact-grid"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <div className="contact-info">
                            {contactItems.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    className="contact-item"
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                                >
                                    {item.icon}
                                    <div>
                                        <h4>{item.title}</h4>
                                        {item.isLink ? (
                                            <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.value}</a>
                                        ) : (
                                            <p>{item.value}</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <form className="contact-form" onSubmit={handleSubmit}>
                            <input placeholder="Your name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <input type="email" placeholder="Your email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            <input placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                            <textarea placeholder="Your message *" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={5} />
                            <button type="submit" className="btn"><FiSend /> SEND MESSAGE</button>
                        </form>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
