import useLegacyModule from "../hooks/useLegacyModule";

export default function Product() {
  useLegacyModule(() => import("../legacy/products-data.js"));
  useLegacyModule(() => import("../legacy/auth-ui.js"));
  useLegacyModule(() => import("../legacy/product.js"));

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
            <a className="header-link-btn" href="/">Back to Shop</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
          </div>
        </div>
      </header>

      <main className="product-page">
        <section className="product-main">
          <div id="product-gallery" className="product-gallery"></div>

          <aside className="order-card">
            <h1 id="product-name"></h1>
            <div className="price product-price" id="product-price"></div>
            <p className="desc" id="product-desc"></p>
            <label className="color-picker-label product-color">
              Color
              <div id="product-color-swatches" className="color-swatches"></div>
            </label>

            <form id="order-form" className="order-form">
              <label>Size
                <div className="size-swatches">
                  <button type="button" className="size-dot" data-size="S">S</button>
                  <button type="button" className="size-dot active" data-size="M">M</button>
                  <button type="button" className="size-dot" data-size="L">L</button>
                  <button type="button" className="size-dot" data-size="XL">XL</button>
                  <button type="button" className="size-dot" data-size="XXL">XXL</button>
                </div>
                <input type="hidden" id="size-value" name="size" defaultValue="M" />
              </label>
              <label>Product amount
                <input required type="number" name="amount" min="1" step="1" defaultValue="1" />
              </label>
              <div className="price-summary" id="price-summary">
                <div className="summary-row">
                  <span>Product</span>
                  <strong id="product-subtotal">0 Dt</strong>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <strong id="delivery-fee">9 Dt</strong>
                </div>
                <div className="summary-row total-row">
                  <span>Total</span>
                  <strong id="order-total">0 Dt</strong>
                </div>
              </div>
              <fieldset className="payment-box">
                <legend>Payment method</legend>
                <label className="payment-option">
                  <input type="radio" name="paymentMethod" value="cash_on_delivery" defaultChecked disabled />
                  Cash on delivery
                </label>
              </fieldset>
              <label>Full name
                <input required name="fullName" placeholder="First Last" />
              </label>
              <label>Phone number
                <input required name="phone" id="order-phone" defaultValue="+216" maxLength={12} placeholder="+216XXXXXXXX" />
              </label>
              <label>Address for delivery
                <textarea required name="address" placeholder="Street, city, phone"></textarea>
              </label>
              <label>Note (optional)
                <textarea name="note" placeholder="Any extra info for delivery"></textarea>
              </label>
              <button className="btn primary" type="submit">Confirm Buy Now</button>
              <div className="confirmation" id="order-confirmation"></div>
            </form>
          </aside>
        </section>

        <section className="related-section">
          <h2>Other hoodies in this wave</h2>
          <div id="related-products" className="grid related-grid"></div>
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
