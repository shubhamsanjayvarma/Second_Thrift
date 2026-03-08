import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiPackage, FiGlobe } from 'react-icons/fi';
import evisuAbout from '../assets/evisu-about.png';
import evisuHero from '../assets/evisu-hero.png';
import evisuDesigner from '../assets/evisu-designer.png';
import evisuCollection from '../assets/evisu-collection.png';
import './About.css';

const About = () => (
    <div className="about-page-wrap">
        {/* Hero with full-bleed Evisu image */}
        <section className="about-hero">
            <img src={evisuAbout} alt="" className="about-hero-bg-img" />
            <div className="about-hero-overlay" />
            <div className="about-hero-content container">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="about-hero-label">FIND OUT MORE</p>
                    <h1 className="about-hero-title">
                        ABOUT <span className="plug-accent">Second Thrift</span>
                    </h1>
                    <p className="about-hero-sub">
                        European-based thrift clothing store offering premium pre-loved fashion at wholesale prices
                    </p>
                </motion.div>
            </div>
        </section>

        {/* Story Section with side image */}
        <section className="about-story">
            <div className="container">
                <div className="about-story-grid">
                    <motion.div
                        className="about-story-text"
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <p className="about-story-label">OUR STORY</p>
                        <h2 className="about-story-title">WHO IS BEHIND<br /><span className="plug-accent">Second Thrift?</span></h2>
                        <p className="about-story-desc">Second Thrift is a European-based thrift clothing store offering premium pre-loved fashion at wholesale prices. We believe in sustainable fashion and giving clothes a second life.</p>
                        <p className="about-story-desc">We source the best quality second-hand clothing from across Europe, carefully inspect every piece, and offer them at unbeatable bulk prices.</p>
                    </motion.div>
                    <motion.div
                        className="about-story-image"
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <img src={evisuHero} alt="Second Thrift Story" />
                    </motion.div>
                </div>
            </div>
        </section>

        {/* Full-width banner */}
        <section className="about-banner">
            <img src={evisuCollection} alt="Collection" className="about-banner-img" />
            <div className="about-banner-overlay" />
            <div className="about-banner-content">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="about-banner-sub">PREMIUM QUALITY</p>
                    <h2 className="about-banner-title">CURATED <span className="plug-accent">Vintage</span></h2>
                    <p className="about-banner-desc">Every piece hand-selected for quality and authenticity</p>
                </motion.div>
            </div>
        </section>

        {/* Why Choose Us with image cards */}
        <section className="about-why">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="about-section-heading">WHY CHOOSE <span className="plug-accent">Us?</span></h2>
                </motion.div>
                <div className="about-features-grid">
                    {[
                        { icon: <FiCheckCircle size={24} />, title: 'QUALITY CHECKED', text: 'Every item inspected before shipping', img: evisuDesigner },
                        { icon: <FiPackage size={24} />, title: 'BULK PRICING', text: 'Wholesale deals for smart buyers', img: evisuAbout },
                        { icon: <FiGlobe size={24} />, title: 'EU SHIPPING', text: 'Fast delivery across Europe', img: evisuCollection },
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            className="about-feature-card"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.15, duration: 0.6 }}
                        >
                            <div className="about-feature-img-wrap">
                                <img src={feature.img} alt={feature.title} />
                                <div className="about-feature-img-overlay" />
                            </div>
                            <div className="about-feature-info">
                                <span className="about-feature-icon">{feature.icon}</span>
                                <h3>{feature.title}</h3>
                                <p>{feature.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="about-cta-center">
                    <Link to="/shop" className="about-cta-btn">
                        START SHOPPING <FiArrowRight />
                    </Link>
                </div>
            </div>
        </section>
    </div>
);

export default About;
