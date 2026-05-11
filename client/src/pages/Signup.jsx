import useLegacyModule from "../hooks/useLegacyModule";

export default function Signup() {
  useLegacyModule(() => import("../legacy/signup.js"));

  return (
    <>
      <header>
        <div className="logo">
          <img src="/img/logo_waves_TRANS2.png" alt="Waves Store logo" />
        </div>
        <div className="header-actions">
          <a className="header-link-btn" href="/">Back to Shop</a>
          <a className="header-link-btn" href="/auth">Login</a>
        </div>
      </header>

      <main className="auth-page auth-signup-page">
        <section className="auth-card auth-card-signup">
          <div className="auth-card-header">
            <h1>Create account</h1>
            <p className="desc">Default account type is user. Admin can only be set by developer in database.</p>
          </div>
          <form id="register-form" className="order-form">
            <label>Full name
              <input name="fullName" required placeholder="First Last" />
            </label>
            <label>Phone
              <input name="phone" id="register-phone" required defaultValue="+216" maxLength={12} placeholder="+216XXXXXXXX" />
            </label>
            <label>Address
              <textarea name="address" required placeholder="Street, city"></textarea>
            </label>
            <label>Password
              <input name="password" id="register-password" type="password" minLength={8} required />
            </label>
            <div id="password-strength" className="password-strength level-low">Security level: low</div>
            <label>Confirm password
              <input name="confirmPassword" type="password" minLength={8} required />
            </label>
            <button className="btn primary" type="submit">Create account</button>
          </form>
          <div className="auth-card-footer">
            <span className="desc">Already have an account?</span>
            <a className="btn secondary" href="/auth">Back to login</a>
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
