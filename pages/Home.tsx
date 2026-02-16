import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="home-root">
      <link rel="stylesheet" href="/styles.css" />

      <nav className="nav">
        <div className="nav__header">
          <div className="nav__logo">
            <a href="/" className="logo">KIND</a>
          </div>
          <button id="menu-btn" className="nav__menu__btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className="hamburger" />
            <span className="hamburger" />
            <span className="hamburger" />
          </button>
        </div>

        <ul className={`nav__links ${menuOpen ? 'open' : ''}`}>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#providers">Providers</a></li>
          <li><a href="#testimonials">Testimonials</a></li>
          <li><Link to="/register" className="nav__cta">Register</Link></li>
          <li><Link to="/login" className="nav__cta">Sign in</Link></li>
        </ul>
      </nav>

      <section className="hero">
        <div className="hero__content section__container" id="home">
          <h1>Book Plumbers, Electricians &amp;<br />More in One Click — <span>KIND</span></h1>
          <p>Your trusted local service partner. Search, connect, and book verified professionals near you.</p>
        </div>
      </section>

      <section className="steps" id="about">
        <div className="section__container steps__container">
          <h2 className="section__header">Get Help in <span>4 Easy Steps</span></h2>
          <p className="section__description">Find trusted professionals quickly and easily.</p>
          <div className="steps__grid">
            <div className="steps__card">
              <span className="steps__icon">🔍</span>
              <h4>Search for a Service</h4>
              <p>Enter what you need and where...</p>
            </div>
            <div className="steps__card">
              <span className="steps__icon">💬</span>
              <h4>Chat &amp; Book</h4>
              <p>Connect with providers, discuss your needs...</p>
            </div>
            <div className="steps__card">
              <span className="steps__icon">🛠️</span>
              <h4>Get the Job Done</h4>
              <p>Professionals arrive on time...</p>
            </div>
            <div className="steps__card final-step">
              <span className="steps__icon">✅</span>
              <h4>Leave a Review</h4>
              <p>Help others find great service pros by sharing your experience.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section__container services__container" id="services">
        <h2 className="section__header">Popular <span>Services</span></h2>
        <p className="section__description">Quickly find trusted plumbers, electricians, carpenters, and more near you.</p>
        <div className="services__grid">
          <div className="service__card"><div className="service__image"><img src="/assets/plumber.jpg" alt="Plumbing" /></div><div className="service__content"><h4>Plumbing</h4></div></div>
          <div className="service__card"><div className="service__image"><img src="/assets/electrician.jpg" alt="Electrician" /></div><div className="service__content"><h4>Electrician</h4></div></div>
          <div className="service__card"><div className="service__image"><img src="/assets/carpenter.jpg" alt="Carpentry" /></div><div className="service__content"><h4>Carpentry</h4></div></div>
          <div className="service__card"><div className="service__image"><img src="/assets/painter.jpg" alt="Painting" /></div><div className="service__content"><h4>Painting</h4></div></div>
          <div className="service__card"><div className="service__image"><img src="/assets/pexels-rezwan-1216544.jpg" alt="Cleaning" /></div><div className="service__content"><h4>Cleaning</h4></div></div>
          <div className="service__card"><div className="service__image"><img src="/assets/ac_repair.jpg" alt="AC Repair" /></div><div className="service__content"><h4>AC Repair</h4></div></div>
        </div>
      </section>

      <section className="section__container providers__container" id="providers">
        <h2 className="section__header">Search Results</h2>
        <p className="section__description">Trusted experts ready to help you today.</p>
      </section>

      <section className="section__container trust__container">
        <h2 className="section__header"><span>Safe &amp; Secure</span> Every Step of the Way</h2>
        <p className="section__description">We verify all our providers to ensure high-quality service and your peace of mind.</p>
        <div className="trust__grid">
          <div className="trust__card"><span className="trust__icon">🛡️</span><h4>Verified Profiles</h4><p>All providers go through identity and background checks.</p></div>
          <div className="trust__card"><span className="trust__icon">💳</span><h4>Secure Payments</h4><p>Pay safely through our platform. No cash required.</p></div>
          <div className="trust__card"><span className="trust__icon">📞</span><h4>24x7 Support</h4><p>We're here if anything goes wrong — anytime, anywhere.</p></div>
        </div>
      </section>

      <footer className="footer">
        <div className="section__container footer__container">
          <div className="footer__content">
            <div className="footer__col footer__brand">
              <div className="footer__logo"><a href="#" className="logo">KIND</a></div>
              <p className="footer__description">Your trusted local service partner. Search, connect, and book verified professionals near you.</p>
            </div>
            <div className="footer__col">
              <h4 className="footer__title">Quick Links</h4>
              <ul className="footer__links"><li><a href="#">Home</a></li><li><a href="#">About Us</a></li><li><a href="#">Services</a></li><li><a href="#">Providers</a></li><li><a href="#">Contact Us</a></li></ul>
            </div>
            <div className="footer__col">
              <h4 className="footer__title">Follow Us</h4>
              <ul className="footer__links"><li><a href="#">Facebook</a></li><li><a href="#">Instagram</a></li><li><a href="#">LinkedIn</a></li><li><a href="#">Twitter</a></li><li><a href="#">YouTube</a></li></ul>
            </div>
            <div className="footer__col">
              <h4 className="footer__title">Contact Us</h4>
              <ul className="footer__links"><li><a href="#"><span>📞</span> +265 991 600 735</a></li><li><a href="#"><span>📍</span> Lilongwe, Malawi</a></li><li><a href="#"><span>✉️</span> support@kind.com</a></li></ul>
            </div>
          </div>
        </div>
        <div className="footer__bottom">Copyright © 2025 KIND. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Home;
