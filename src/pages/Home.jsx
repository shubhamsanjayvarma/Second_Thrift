import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTruck, FiShield, FiRefreshCw, FiPackage, FiChevronDown, FiStar, FiInstagram } from 'react-icons/fi';
import ProductCard from '../components/product/ProductCard';
import { defaultCategories } from '../services/categories';
import { subscribeToFeaturedProducts } from '../services/products';
import evisuHero from '../assets/evisu-hero.png';
import evisuLatest from '../assets/evisu-latest.png';
import evisuDesigner from '../assets/evisu-designer.png';
import evisuOuterwear from '../assets/evisu-outerwear.png';
import evisuCollection from '../assets/evisu-collection.png';
import evisuAbout from '../assets/evisu-about.png';
import catTops from '../assets/cat-tops.png';
import catBottoms from '../assets/cat-bottoms.png';
import catOuterwear from '../assets/cat-outerwear.png';
import catDresses from '../assets/cat-dresses.png';
import catActivewear from '../assets/cat-activewear.png';
import catAccessories from '../assets/cat-accessories.png';
import catFootwear from '../assets/cat-footwear.png';
import { useToast } from '../components/common/Toast';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './Home.css';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const { success, error } = useToast();


    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToFeaturedProducts(8, (data) => {
            setProducts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email.trim() || isSubscribing) return;
        setIsSubscribing(true);
        try {
            await addDoc(collection(db, 'subscribers'), {
                email: email.trim(),
                createdAt: serverTimestamp(),
                status: 'active'
            });
            success('Successfully subscribed!');
            setEmail('');
        } catch (err) {
            console.error('Subscription error:', err);
            error('Failed to subscribe. Please try again.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const faqs = [
        { q: 'How long does shipping take?', a: 'We ship across Europe. Standard delivery takes 3-7 business days depending on your location.' },
        { q: 'Are returns possible?', a: 'Yes! We offer a 30-day return policy. Contact us via email and we will guide you through the process.' },
        { q: 'Is there free shipping?', a: 'Yes! All our prices are all-inclusive — shipping and taxes are already included in the displayed price. No surprises at checkout.' },
        { q: 'What payment methods do you accept?', a: 'We accept credit/debit cards (Visa, Mastercard), bank transfers via Wise, and more. Available options are shown at checkout.' },
    ];

    const testimonials = [
        { name: 'Priya S.', text: 'Amazing quality! I was skeptical about buying thrift online but the pieces arrived in perfect condition. Will definitely order again.', rating: 5 },
        { name: 'Rahul M.', text: 'Best thrift store I have found online. The bulk deals are incredible value. Got a whole wardrobe refresh for a fraction of the price.', rating: 5 },
        { name: 'Ananya K.', text: 'Fast shipping and great customer support. They even sent a handwritten thank you note. Such a personal touch!', rating: 5 },
        { name: 'Dev P.', text: 'The vintage collection is fire. Found some rare pieces that I could never find anywhere else. 10/10 recommend.', rating: 5 },
    ];

    const categoryBanners = [
        { slug: 'tops', label: 'LATEST DROP', sublabel: 'NEW ARRIVALS', img: evisuLatest },
        { slug: 'bottoms', label: 'PREMIUM DENIM', sublabel: 'DESIGNER JEANS', img: evisuDesigner },
        { slug: 'outerwear', label: 'EVERYDAY LAYERS', sublabel: 'OUTERWEAR', img: evisuOuterwear },
        { slug: 'dresses', label: 'COLLECTION', sublabel: 'FULL COLLECTION', img: evisuCollection },
    ];

    const categoryImages = [
        { slug: 'tops', name: 'TOPS', img: catTops },
        { slug: 'bottoms', name: 'BOTTOMS', img: catBottoms },
        { slug: 'outerwear', name: 'OUTERWEAR', img: catOuterwear },
        { slug: 'dresses', name: 'DRESSES', img: catDresses },
        { slug: 'activewear', name: 'ACTIVEWEAR', img: catActivewear },
        { slug: 'accessories', name: 'ACCESSORIES', img: catAccessories },
        { slug: 'footwear', name: 'FOOTWEAR', img: catFootwear },
        { slug: 'vintage', name: 'VINTAGE', img: evisuCollection },
    ];

    return (
        <div className="home-42plug">
            {/* ========== HERO SECTION (Sticky - stays behind content) ========== */}
            <section className="plug-hero">
                <div className="plug-hero-bg">
                    <img src={evisuHero} alt="" className="plug-hero-bg-img" />
                    <div className="plug-hero-overlay" />
                </div>
                <div className="plug-hero-content">
                    <motion.p
                        className="plug-hero-tagline"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                    >
                        Where vintage exclusivity meets street
                    </motion.p>
                    <motion.h1
                        className="plug-hero-title"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        SECOND <span className="plug-accent">Thrift</span>
                    </motion.h1>
                    <motion.p
                        className="plug-hero-sub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                    >
                        SELECTED BY SECOND THRIFT
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                    >
                        <Link to="/shop" className="plug-hero-btn">
                            EXPLORE NOW!
                        </Link>
                    </motion.div>
                </div>
                <motion.div
                    className="plug-scroll-indicator"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <FiChevronDown size={24} />
                </motion.div>
            </section>

            {/* ========== CONTENT SECTIONS (Slide over hero) ========== */}
            <div className="plug-content-sections">

            {/* ========== SCROLL PROMPT ========== */}
            <section className="plug-scroll-section">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="plug-scroll-label">SCROLL DOWN FOR</p>
                    <h2 className="plug-scroll-title">OUR <span className="plug-accent">Catalogue</span></h2>
                </motion.div>
            </section>

            {/* ========== CATEGORY BANNERS (Mosaic with Images) ========== */}
            <section className="plug-categories">
                <motion.div
                    className="plug-cat-hero"
                    initial={{ opacity: 0, y: 60 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <Link to="/shop" className="plug-cat-card plug-cat-full">
                        <img src={categoryBanners[0].img} alt={categoryBanners[0].label} className="plug-cat-img" />
                        <div className="plug-cat-overlay" />
                        <div className="plug-cat-text">
                            <span className="plug-cat-sublabel">{categoryBanners[0].sublabel}</span>
                            <h3 className="plug-cat-title">{categoryBanners[0].label}</h3>
                        </div>
                    </Link>
                </motion.div>
                <div className="plug-cat-grid">
                    {categoryBanners.slice(1).map((cat, idx) => (
                        <motion.div
                            key={cat.slug}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: idx * 0.15 }}
                        >
                            <Link to={`/shop?category=${cat.slug}`} className="plug-cat-card">
                                <img src={cat.img} alt={cat.label} className="plug-cat-img" />
                                <div className="plug-cat-overlay" />
                                <div className="plug-cat-text">
                                    <span className="plug-cat-sublabel">{cat.sublabel}</span>
                                    <h3 className="plug-cat-title">{cat.label}</h3>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ========== BROWSE BY CATEGORY (Image Cards) ========== */}
            <section className="plug-icon-categories">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="plug-section-heading">SHOP BY <span className="plug-accent">Category</span></h2>
                    </motion.div>
                    <div className="plug-img-cat-grid">
                        {categoryImages.map((cat, idx) => (
                            <motion.div
                                key={cat.slug}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.08, duration: 0.5 }}
                            >
                                <Link to={`/shop?category=${cat.slug}`} className="plug-img-cat-card">
                                    <img src={cat.img} alt={cat.name} className="plug-img-cat-photo" />
                                    <div className="plug-img-cat-overlay" />
                                    <div className="plug-img-cat-content">
                                        <h3 className="plug-img-cat-name">{cat.name}</h3>
                                        <span className="plug-img-cat-arrow"><FiArrowRight /></span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== ABOUT / BEHIND SECOND THRIFT ========== */}
            <section className="plug-about">
                <div className="container">
                    <div className="plug-about-grid">
                        <motion.div
                            className="plug-about-text"
                            initial={{ opacity: 0, x: -40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <p className="plug-about-label">FIND OUT.</p>
                            <h2 className="plug-about-title">WHO IS BEHIND<br />SECOND THRIFT?</h2>
                            <p className="plug-about-desc">We are passionate about bringing the best vintage and designer streetwear from Europe to you. Every piece is hand-picked for quality and style.</p>
                            <Link to="/about" className="plug-about-btn">BEHIND SECOND THRIFT</Link>
                        </motion.div>
                        <motion.div
                            className="plug-about-image"
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <img src={evisuAbout} alt="Behind Second Thrift" className="plug-about-img" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ========== FULL-WIDTH EVISU BANNER ========== */}
            <section className="plug-evisu-banner">
                <img src={evisuCollection} alt="Evisu Collection" className="plug-evisu-banner-img" />
                <div className="plug-evisu-banner-overlay" />
                <div className="plug-evisu-banner-content">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <p className="plug-evisu-banner-sub">EXCLUSIVE COLLECTION</p>
                        <h2 className="plug-evisu-banner-title">PREMIUM VINTAGE<br /><span className="plug-accent">Denim</span></h2>
                        <Link to="/shop" className="plug-hero-btn">SHOP THE COLLECTION</Link>
                    </motion.div>
                </div>
            </section>

            {/* ========== FEATURED PRODUCTS ========== */}
            <section className="plug-featured">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="plug-section-heading plug-heading-light">
                            <span className="plug-accent">Featured</span> PRODUCTS
                        </h2>
                        <p className="plug-section-sub">Hand-picked deals you don't want to miss</p>
                    </motion.div>
                    <div className="grid grid-4">
                        {products.slice(0, 8).map((product, idx) => (
                            <ProductCard key={product.id} product={product} index={idx} />
                        ))}
                    </div>
                    <div className="plug-cta-center">
                        <Link to="/shop" className="plug-ghost-btn">
                            VIEW ALL PRODUCTS <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ========== COMMUNITY / INSTAGRAM ========== */}
            <section className="plug-community">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h4 className="plug-community-label">BECOME PART OF OUR COMMUNITY</h4>
                        <h2 className="plug-community-title">GET INSPIRED<br />AND FOLLOW US ON INSTAGRAM!</h2>
                    </motion.div>
                    {/* Instagram Image Row */}
                    <div className="plug-insta-grid">
                        {[evisuHero, evisuLatest, evisuDesigner, evisuOuterwear, evisuAbout, evisuCollection].map((img, idx) => (
                            <motion.a
                                key={idx}
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="plug-insta-item"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.08 }}
                                whileHover={{ scale: 1.05 }}
                            >
                                <img src={img} alt={`Instagram ${idx + 1}`} />
                                <div className="plug-insta-hover">
                                    <FiInstagram size={24} />
                                </div>
                            </motion.a>
                        ))}
                    </div>
                    <div className="plug-cta-center" style={{ marginTop: '2rem' }}>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="plug-insta-link">
                            <FiInstagram size={20} /> @SECONDTHRIFT
                        </a>
                    </div>
                </div>
            </section>

            {/* ========== TESTIMONIALS ========== */}
            <section className="plug-testimonials">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="plug-section-heading plug-heading-light">YOUR TRUST IS OUR <span className="plug-accent">Standard!</span></h2>
                        <div className="plug-stars-row">
                            {[...Array(5)].map((_, i) => <FiStar key={i} className="plug-star-filled" size={20} />)}
                            <span className="plug-rating-text">/ 5 based on 500+ customers</span>
                        </div>
                    </motion.div>
                    <div className="plug-testimonial-grid">
                        {testimonials.map((t, idx) => (
                            <motion.div
                                key={idx}
                                className="plug-testimonial-card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="plug-testimonial-stars">
                                    {[...Array(t.rating)].map((_, i) => <FiStar key={i} size={14} />)}
                                </div>
                                <p className="plug-testimonial-text">"{t.text}"</p>
                                <p className="plug-testimonial-name">{t.name}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== FAQ ========== */}
            <section className="plug-faq">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="plug-section-heading">FAQ</h2>
                    </motion.div>
                    <div className="plug-faq-list">
                        {faqs.map((faq, idx) => (
                            <motion.div
                                key={idx}
                                className={`plug-faq-item ${openFaq === idx ? 'open' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.08 }}
                            >
                                <button className="plug-faq-question" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                                    {faq.q}
                                    <FiChevronDown className={`plug-faq-chevron ${openFaq === idx ? 'rotated' : ''}`} />
                                </button>
                                <div className="plug-faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== TRUST BADGES ========== */}
            <section className="plug-trust">
                <div className="container">
                    <div className="plug-trust-grid">
                        {[
                            { icon: <FiTruck size={28} />, title: 'European Shipping', desc: 'Fast delivery across all EU countries' },
                            { icon: <FiShield size={28} />, title: 'Quality Checked', desc: 'Every item inspected before shipping' },
                            { icon: <FiRefreshCw size={28} />, title: 'Easy Returns', desc: '30-day return policy' },
                            { icon: <FiPackage size={28} />, title: 'Bulk Pricing', desc: 'Save more when you buy more' },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                className="plug-trust-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="plug-trust-icon">{item.icon}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== NEWSLETTER ========== */}
            <section className="plug-newsletter">
                <div className="container">
                    <motion.div
                        className="plug-newsletter-card"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="plug-newsletter-label">BECOME PART OF SECOND THRIFT</h3>
                        <p className="plug-newsletter-desc">Early Access, News, Special Offers & More</p>
                        <form className="plug-newsletter-form" onSubmit={handleSubscribe}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubscribing}
                                required
                            />
                            <button type="submit" disabled={isSubscribing}>
                                {isSubscribing ? 'SUBSCRIBING...' : 'SUBSCRIBE'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </section>

            {/* ========== BOTTOM BAR ========== */}
            <section className="plug-bottom-bar">
                <span>SECOND THRIFT — WHERE VINTAGE EXCLUSIVITY MEETS STREET</span>
            </section>
            </div>{/* end plug-content-sections */}
        </div>
    );
};

export default Home;
