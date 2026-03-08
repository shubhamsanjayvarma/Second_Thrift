import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiMail, FiMapPin } from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { FaWhatsapp } from 'react-icons/fa';
import logo from '../../assets/logo-text.png';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-wave"></div>
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <img src={logo} alt="Second Thrift" className="footer-logo" />
                        <p>Discover unique pre-loved clothing from Europe. Sustainable fashion at wholesale prices.</p>
                        <div className="footer-social">
                            <a href="https://www.instagram.com/second._.thriftt?igsh=MTU5MXd0ZDV3bDVsbA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FiInstagram size={20} /></a>
                            <a href="https://facebook.com/secondthrift" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FiFacebook size={20} /></a>
                            <a href="https://tiktok.com/@secondthrift" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><SiTiktok size={18} /></a>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Quick Links</h4>
                        <Link to="/shop">Shop All</Link>
                        <Link to="/shop?category=bulk-deals">Bulk Deals</Link>
                        <Link to="/shop?category=vintage">Vintage</Link>
                        <Link to="/shop?category=designer">Designer</Link>
                        <Link to="/about">About Us</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Customer Service</h4>
                        <Link to="/contact">Contact Us</Link>
                        <Link to="/shipping">Shipping Info</Link>
                        <Link to="/returns">Returns & Refunds</Link>
                        <Link to="/faq">FAQ</Link>
                        <Link to="/terms">Terms & Conditions</Link>
                        <Link to="/privacy">Privacy Policy</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Contact</h4>
                        <div className="footer-contact-item">
                            <FiMail size={16} />
                            <a href="mailto:secondthriftt.1@gmail.com">secondthriftt.1@gmail.com</a>
                        </div>
                        <div className="footer-contact-item">
                            <FaWhatsapp size={16} />
                            <a href="https://wa.me/919909527515" target="_blank" rel="noopener noreferrer">+91 9909527515</a>
                        </div>
                        <div className="footer-contact-item">
                            <FiInstagram size={16} />
                            <a href="https://www.instagram.com/second._.thriftt?igsh=MTU5MXd0ZDV3bDVsbA==" target="_blank" rel="noopener noreferrer">@second._.thriftt</a>
                        </div>
                        <div className="footer-contact-item">
                            <FiMapPin size={16} />
                            <span>Europe Based</span>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Second Thrift. All rights reserved.</p>
                    <div className="footer-payment-methods">
                        <span className="payment-badge">Wise</span>
                        <span className="payment-badge">Bank Transfer</span>
                        <span className="payment-badge">SEPA</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
