import useLegacyModule from "../hooks/useLegacyModule";

export default function Privacy() {
  useLegacyModule(() => import("../legacy/auth-ui.js"));

  return (
    <>
      <header>
        <div className="header-top">
          <div className="logo">
            <img src="/img/logo_waves_TRANS2.png" alt="Waves Store logo" />
          </div>
          <button className="mobile-menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">
            <span></span>
          </button>
        </div>
        <div className="mobile-menu">
          <div className="header-actions">
            <a className="header-link-btn hidden" id="admin-btn" href="/admin">Admin</a>
            <a className="header-link-btn hidden" id="profile-btn" href="/profile">Edit Profile</a>
            <a className="header-link-btn hidden" id="history-btn" href="/history">My History</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
            <button className="cta" type="button" onClick={() => { window.location.href = "/"; }}>Back to Shop</button>
          </div>
        </div>
      </header>

      <main className="product-page">
        <section className="order-card">
          <h1>Privacy Policy</h1>
          <p className="desc"><strong>Last updated:</strong> March 30, 2026</p>

          <p className="desc">Welcome to <strong>WAVES</strong>. Your privacy is important to us, and we are committed to protecting your personal information while you browse and shop our handmade hoodie collection.</p>

          <p className="desc">This Privacy Policy explains how we collect, use, and protect your information when you use our website.</p>

          <h2>1. Information We Collect</h2>
          <p className="desc">When you use our website, we may collect the following types of information:</p>

          <h3>a) Personal Information</h3>
          <ul>
            <li>Full name</li>
            <li>Phone number</li>
            <li>Delivery address (within Tunisia)</li>
          </ul>

          <h3>b) Order Information</h3>
          <ul>
            <li>Products ordered (handmade hoodies)</li>
            <li>Order details (size, color, custom requests)</li>
          </ul>

          <h3>c) Technical Information</h3>
          <ul>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device information</li>
            <li>Pages visited and time spent on the site</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p className="desc">We use your information to:</p>
          <ul>
            <li>Process and deliver your orders across Tunisia</li>
            <li>Contact you regarding your order (confirmation, delivery updates, issues)</li>
            <li>Improve our website and customer experience</li>
            <li>Ensure security and prevent fraud</li>
          </ul>

          <h2>3. Delivery Information</h2>
          <p className="desc">We deliver handmade hoodies to all regions in Tunisia.</p>
          <ul>
            <li>Delivery fee: <strong>9 DT</strong></li>
            <li>Delivery times may vary depending on your location</li>
            <li>Your phone number and address are used strictly for delivery purposes</li>
          </ul>

          <h2>4. Sharing Your Information</h2>
          <p className="desc">We respect your privacy.</p>
          <p className="desc">We do <strong>not sell, rent, or trade</strong> your personal information.</p>
          <p className="desc">Your information may only be shared with:</p>
          <ul>
            <li>Delivery services (to complete your order)</li>
            <li>Technical providers (to maintain the website)</li>
          </ul>
          <p className="desc">All parties are required to handle your data securely and only for necessary purposes.</p>

          <h2>5. Data Security</h2>
          <p className="desc">We take reasonable measures to protect your personal data, including:</p>
          <ul>
            <li>Secure systems and limited access</li>
            <li>Protection against unauthorized use</li>
          </ul>
          <p className="desc">However, no system is completely secure, and we cannot guarantee absolute protection.</p>

          <h2>6. Cookies</h2>
          <p className="desc">Our website may use cookies to:</p>
          <ul>
            <li>Improve your browsing experience</li>
            <li>Understand website usage</li>
            <li>Remember your preferences</li>
          </ul>
          <p className="desc">You can disable cookies in your browser settings if you prefer.</p>

          <h2>7. Your Rights</h2>
          <p className="desc">You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of incorrect information</li>
            <li>Request deletion of your data (when applicable)</li>
          </ul>
          <p className="desc">To make any request, contact us through our social media platforms.</p>

          <h2>8. Data Retention</h2>
          <p className="desc">We keep your information only as long as necessary to:</p>
          <ul>
            <li>Complete your orders</li>
            <li>Provide customer support</li>
            <li>Meet legal requirements</li>
          </ul>

          <h2>9. Changes to This Policy</h2>
          <p className="desc">We may update this Privacy Policy at any time. Any changes will be posted on this page with an updated date.</p>

          <h2>10. Contact Us</h2>
          <p className="desc">For any questions or requests, you can contact <strong>WAVES</strong> through:</p>
          <ul>
            <li>TikTok: <a href="https://www.tiktok.com/@waves_streetwear" target="_blank" rel="noopener noreferrer">https://www.tiktok.com/@waves_streetwear</a></li>
            <li>Instagram: <a href="https://www.instagram.com/waves__streetwear/" target="_blank" rel="noopener noreferrer">https://www.instagram.com/waves__streetwear/</a></li>
            <li>Facebook: <a href="https://www.facebook.com/profile.php?id=61580095130092&locale=ar_AR" target="_blank" rel="noopener noreferrer">https://www.facebook.com/profile.php?id=61580095130092&locale=ar_AR</a></li>
          </ul>

          <p className="desc"><strong>By using our website, you agree to this Privacy Policy.</strong></p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-left">
          <div>© 2026, Waves Streetwear</div>
          <div className="contact-links">
            <span>Contact us:</span>
            <a className="contact-link" href="https://www.instagram.com/waves__streetwear/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a className="contact-link" href="https://www.tiktok.com/@waves_streetwear" target="_blank" rel="noopener noreferrer">TikTok</a>
            <a className="contact-link" href="https://www.facebook.com/profile.php?id=61580095130092&locale=ar_AR" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          <div className="developer-credit">
            Developed by <span className="developer-link">Mehdi Makhlouf</span>
          </div>
        </div>
        <a className="footer-link" href="/privacy">Privacy policy</a>
      </footer>
    </>
  );
}
