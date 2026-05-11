import useLegacyModule from "../hooks/useLegacyModule";

export default function Profile() {
  useLegacyModule(() => import("../legacy/auth-ui.js"));
  useLegacyModule(() => import("@root/profile.js"));

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
            <a className="header-link-btn hidden" id="history-btn" href="/history">My History</a>
            <a className="header-link-btn" href="/">Back to Shop</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
          </div>
        </div>
      </header>

      <main className="auth-page">
        <section className="auth-card">
          <h1>Edit contact</h1>
          <form id="profile-contact-form" className="order-form">
            <label>Phone
              <input id="profile-phone" name="phone" required defaultValue="+216" maxLength={12} placeholder="+216XXXXXXXX" readOnly />
            </label>
            <label>Address
              <textarea id="profile-address" name="address" required readOnly></textarea>
            </label>
            <label id="profile-password-wrap" className="hidden">Password confirmation
              <input id="profile-contact-password" name="password" type="password" disabled />
            </label>
            <div className="btn-row">
              <button id="profile-edit-btn" className="btn" type="button">Edit</button>
              <button id="profile-save-btn" className="btn primary hidden" type="submit">Save contact info</button>
            </div>
          </form>
        </section>

        <section className="auth-card">
          <h1>Change password</h1>
          <form id="profile-password-form" className="order-form">
            <label>Old password
              <input name="oldPassword" type="password" required />
            </label>
            <label>New password
              <input id="new-password" name="newPassword" type="password" minLength={8} required />
            </label>
            <div id="new-password-strength" className="password-strength level-low">Security level: low</div>
            <label>Confirm new password
              <input name="confirmNewPassword" type="password" minLength={8} required />
            </label>
            <button className="btn primary" type="submit">Change password</button>
          </form>
        </section>

        <div id="profile-message" className="confirmation"></div>
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
