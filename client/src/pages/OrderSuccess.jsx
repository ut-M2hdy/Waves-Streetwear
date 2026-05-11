import useLegacyModule from "../hooks/useLegacyModule";

export default function OrderSuccess() {
  useLegacyModule(() => import("../legacy/auth-ui.js"));
  useLegacyModule(() => import("@root/order-success.js"));

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
            <a className="header-link-btn hidden" id="profile-btn" href="/profile">Edit Profile</a>
            <a className="header-link-btn" href="/">Back to Shop</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
          </div>
        </div>
      </header>

      <main className="product-page success-page">
        <section className="order-card success-card">
          <h1>Order passed successfully ✅</h1>
          <p className="desc" id="success-main-text">Thank you for your order.</p>
          <p className="desc">We will call you for confirmation soon.</p>
          <p className="desc">
            If you want to cancel the order, contact us on:
            <a className="contact-inline-link" href="https://www.instagram.com/waves__streetwear/" target="_blank" rel="noopener noreferrer">our Instagram</a>
          </p>

          <div className="btn-row success-actions">
            <a className="btn primary" href="/">Continue shopping</a>
            <a className="btn hidden" id="status-btn" href="/history">See orders status</a>
          </div>
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
