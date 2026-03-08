import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiTruck, FiRefreshCw, FiHelpCircle, FiFileText, FiShield, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const sections = {
    shipping: {
        title: 'Shipping Information',
        icon: <FiTruck size={28} />,
        content: [
            {
                heading: 'Where do you ship?',
                text: 'We ship across Europe and internationally. We are based in Europe and specialise in European thrift fashion.'
            },
            {
                heading: 'Shipping costs',
                text: 'Shipping costs are included in the product price — no surprises at checkout. For bulk orders, we may offer custom logistics.'
            },
            {
                heading: 'Delivery times',
                text: 'Standard delivery takes 5–10 business days depending on your location. European orders are typically faster (3–7 days). International orders may take up to 14 days.'
            },
            {
                heading: 'Tracking',
                text: 'You will receive a tracking number via WhatsApp or email once your order is shipped. You can track your package at any time.'
            },
            {
                heading: 'Bulk orders',
                text: 'For bulk/wholesale orders, we arrange custom shipping. Contact us via WhatsApp for a quote.'
            },
        ]
    },
    returns: {
        title: 'Returns & Refunds',
        icon: <FiRefreshCw size={28} />,
        content: [
            {
                heading: 'Return policy',
                text: 'We accept returns within 14 days of delivery. Items must be in original, unworn condition with all tags attached.'
            },
            {
                heading: 'How to initiate a return',
                text: 'Contact us via WhatsApp or email with your order number and reason for return. We will provide a return shipping address.'
            },
            {
                heading: 'Refund process',
                text: 'Once we receive and inspect your return, we will issue a refund via the original payment method within 5–7 business days.'
            },
            {
                heading: 'Exchanges',
                text: 'We currently do not offer direct exchanges. Please return the item and place a new order for the desired product.'
            },
            {
                heading: 'Non-returnable items',
                text: 'Bulk deal bundles and mystery boxes are final sale and cannot be returned unless there is a quality issue.'
            },
        ]
    },
    faq: {
        title: 'Frequently Asked Questions',
        icon: <FiHelpCircle size={28} />,
        content: [
            {
                heading: 'What is Second Thrift?',
                text: 'Second Thrift is a premium thrift fashion store offering curated pre-loved clothing from Europe. We specialise in quality vintage, streetwear, and designer pieces at affordable prices.'
            },
            {
                heading: 'Are the clothes used?',
                text: 'Yes, all our items are pre-loved/second-hand. However, every piece is carefully inspected and only high-quality items in good condition are listed. We describe the condition honestly on each product page.'
            },
            {
                heading: 'How do I pay?',
                text: 'We accept payments via Wise (bank transfer, credit card, debit card). After placing your order, you will receive the payment details. Your order is processed once payment is confirmed.'
            },
            {
                heading: 'Can I order in bulk?',
                text: 'Absolutely! We offer bulk deals and wholesale pricing. Check out our Bulk Deals section or contact us for custom bulk orders.'
            },
            {
                heading: 'How do I contact you?',
                text: 'You can reach us via WhatsApp at +91 9909527515, Instagram @second._.thriftt, or email at secondthriftt.1@gmail.com.'
            },
            {
                heading: 'Do you ship internationally?',
                text: 'Yes, we ship across Europe and internationally. Shipping is included in the price for most orders.'
            },
        ]
    },
    terms: {
        title: 'Terms & Conditions',
        icon: <FiFileText size={28} />,
        content: [
            {
                heading: '1. General',
                text: 'By accessing and using the Second Thrift website, you agree to these terms and conditions. We reserve the right to update these terms at any time.'
            },
            {
                heading: '2. Products',
                text: 'All products listed are pre-loved/second-hand items. We describe the condition accurately on each product page. Minor wear consistent with pre-owned items is expected and not grounds for return.'
            },
            {
                heading: '3. Orders & Payment',
                text: 'Orders are confirmed once payment is received via Wise (bank transfer). We reserve the right to cancel any order for any reason. In such cases, a full refund will be issued.'
            },
            {
                heading: '4. Pricing',
                text: 'All prices are listed in EUR (€) and include shipping for standard delivery. Prices are subject to change without notice. Bulk pricing is available for qualifying orders.'
            },
            {
                heading: '5. Returns',
                text: 'Returns are accepted within 14 days of delivery for items in original condition. See our Returns & Refunds page for full details. Bulk deals and mystery boxes are final sale.'
            },
            {
                heading: '6. Limitation of Liability',
                text: 'Second Thrift is not liable for any indirect, incidental, or consequential damages arising from the use of our website or products. Our liability is limited to the purchase price of the product.'
            },
            {
                heading: '7. Intellectual Property',
                text: 'All content on this website (images, text, logos) is the property of Second Thrift and may not be reproduced without permission.'
            },
        ]
    },
    privacy: {
        title: 'Privacy Policy',
        icon: <FiShield size={28} />,
        content: [
            {
                heading: 'Information We Collect',
                text: 'We collect your name, email address, shipping address, and phone number when you create an account or place an order. We also collect browsing behaviour through standard web analytics.'
            },
            {
                heading: 'How We Use Your Data',
                text: 'Your information is used to process orders, communicate about your orders, and improve our services. We do not sell or share your personal data with third parties for marketing purposes.'
            },
            {
                heading: 'Data Storage',
                text: 'Your data is stored securely using Firebase (Google Cloud) and MongoDB Atlas with industry-standard encryption. We retain your data as long as your account is active.'
            },
            {
                heading: 'Communications',
                text: 'We may send you order updates via email and WhatsApp. You can opt out of marketing communications at any time by contacting us.'
            },
            {
                heading: 'Cookies',
                text: 'We use essential cookies for authentication and cart functionality. No third-party advertising cookies are used.'
            },
            {
                heading: 'Your Rights',
                text: 'You have the right to access, correct, or delete your personal data. Contact us at secondthriftt.1@gmail.com to exercise these rights.'
            },
            {
                heading: 'Contact',
                text: 'For privacy-related questions, contact us at secondthriftt.1@gmail.com.'
            },
        ]
    },
};

const pageStyle = {
    paddingTop: '120px',
    paddingBottom: '80px',
    minHeight: '100vh',
};

const headerStyle = {
    textAlign: 'center',
    marginBottom: '3rem',
};

const iconWrapStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    background: 'rgba(56, 189, 248, 0.1)',
    color: 'var(--primary)',
    marginBottom: '1rem',
};

const titleStyle = {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '2.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#fff',
    marginBottom: '0.5rem',
};

const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '2rem',
    marginBottom: '1.5rem',
};

const headingStyle = {
    fontFamily: "'Oswald', sans-serif",
    fontSize: '1.15rem',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.75rem',
};

const textStyle = {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.7',
};

const InfoPage = ({ type }) => {
    const data = sections[type];
    if (!data) return null;

    return (
        <div style={pageStyle}>
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <motion.div
                    style={headerStyle}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={iconWrapStyle}>{data.icon}</div>
                    <h1 style={titleStyle}>{data.title}</h1>
                    <p style={{ ...textStyle, maxWidth: '500px', margin: '0 auto' }}>
                        Last updated: March 2026
                    </p>
                </motion.div>

                {data.content.map((item, i) => (
                    <motion.div
                        key={i}
                        style={cardStyle}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                    >
                        <h3 style={headingStyle}>{item.heading}</h3>
                        <p style={textStyle}>{item.text}</p>
                    </motion.div>
                ))}

                <motion.div
                    style={{ ...cardStyle, textAlign: 'center', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.15)' }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <h3 style={{ ...headingStyle, marginBottom: '1rem' }}>Still have questions?</h3>
                    <p style={{ ...textStyle, marginBottom: '1.5rem' }}>We're happy to help — reach out to us anytime.</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="https://wa.me/919909527515" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <FaWhatsapp size={16} /> WhatsApp
                        </a>
                        <a href="mailto:secondthriftt.1@gmail.com" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <FiMail size={16} /> Email Us
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export const ShippingPage = () => <InfoPage type="shipping" />;
export const ReturnsPage = () => <InfoPage type="returns" />;
export const FAQPage = () => <InfoPage type="faq" />;
export const TermsPage = () => <InfoPage type="terms" />;
export const PrivacyPage = () => <InfoPage type="privacy" />;

export default InfoPage;
