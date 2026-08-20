import useLegacyModule from "../hooks/useLegacyModule";

export default function Index() {
  useLegacyModule(() => import("../legacy/products-data.js"));
  useLegacyModule(() => import("../legacy/auth-ui.js"));
  useLegacyModule(() => import("../legacy/app.js"));

  return (
    <>
      <div id="db-loading-screen" className="db-loading-screen hidden" aria-live="polite" aria-busy="true">
        <div className="db-loading-card">
          <div className="db-loading-spinner" aria-hidden="true"></div>
          <h2>Loading store data...</h2>
          <p id="db-loading-message">Please wait while we connect to the database.</p>
        </div>
      </div>

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
          <nav className="wave-tabs" aria-label="Wave collections">
            <button className="wave-tab scene-stealer active" type="button" data-wave="Scene Stealer">
              Scene Stealer <span className="wave-soon-badge">New</span>
            </button>
            <button className="wave-tab" data-wave="1stDrop">Cold Nights Drop</button>
            <button className="wave-tab" data-wave="UPSIDE DOWN">WAVE: UPSIDE DOWN</button>
            <button className="wave-tab" data-wave="CAIROKEE">WAVE: CAIROKEE</button>
          </nav>
          <div className="header-actions">
            <a className="header-link-btn hidden" id="admin-btn" href="/admin">Admin</a>
            <a className="header-link-btn hidden" id="profile-btn" href="/profile">Edit Profile</a>
            <a className="header-link-btn hidden" id="history-btn" href="/history">My History</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
            <button className="cta" type="button" onClick={() => window.scrollToShop?.()}>Shop Hoodies</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <h1>Soft hoodies, pay when delivered.</h1>
        <p>Pick your favorite fit and pay on delivery. Click Buy now to open the product page with gallery and order form.</p>
      </section>

      <section id="shop" className="grid"></section>

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
