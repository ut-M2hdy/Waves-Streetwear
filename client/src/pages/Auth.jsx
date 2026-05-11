import useLegacyModule from "../hooks/useLegacyModule";

export default function Auth() {
  useLegacyModule(() => import("../legacy/auth.js"));

  return (
    <>
      <header>
        <div className="logo">
          <img src="/img/logo_waves_TRANS2.png" alt="Waves Store logo" />
        </div>
        <div className="header-actions">
          <a className="header-link-btn" href="/">Back to Shop</a>
        </div>
      </header>

      <main className="auth-page auth-login-page">
        <section className="auth-card auth-card-login" id="login">
          <div className="auth-card-header">
            <h1>Welcome back</h1>
            <p className="desc">Login to track your orders and manage your profile.</p>
          </div>
          <form id="login-form" className="order-form">
            <label>Phone
              <input name="phone" id="login-phone" required defaultValue="+216" maxLength={12} placeholder="+216XXXXXXXX" />
            </label>
            <label>Password
              <input name="password" type="password" required />
            </label>
            <button className="btn primary" type="submit">Login</button>
          </form>
          <div className="auth-card-footer">
            <span className="desc">New to WAVES?</span>
            <a className="btn secondary" href="/signup">Create account</a>
          </div>
        </section>

        <div id="auth-message" className="confirmation"></div>
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
