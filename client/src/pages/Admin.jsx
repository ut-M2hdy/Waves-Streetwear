import { useCallback, useEffect, useState } from "react";
import useLegacyModule from "../hooks/useLegacyModule";

export default function Admin() {
  const [adminState, setAdminState] = useState("checking");

  const loadAdminModules = useCallback(() => {
    if (adminState !== "allowed") {
      return Promise.resolve();
    }
    return Promise.all([
      import("../legacy/auth-ui.js"),
      import("@root/admin.js")
    ]);
  }, [adminState]);

  useLegacyModule(loadAdminModules);

  useEffect(() => {
    let isActive = true;

    const verifyAdmin = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (isActive) setAdminState("denied");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.user || data.user.role !== "admin") {
          if (isActive) setAdminState("denied");
          return;
        }
      } catch {
        if (isActive) setAdminState("denied");
        return;
      }

      if (isActive) {
        setAdminState("allowed");
      }
    };

    verifyAdmin();
    return () => {
      isActive = false;
    };
  }, []);

  if (adminState === "checking") {
    return (
      <div className="maintenance-overlay" role="status" aria-live="polite">
        <div className="maintenance-card">
          <div className="maintenance-icon">🔒</div>
          <h2>Checking admin access</h2>
          <p>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (adminState === "denied") {
    return (
      <div className="maintenance-overlay" role="alert" aria-live="assertive">
        <div className="maintenance-card">
          <div className="maintenance-icon">⛔</div>
          <h2>Admin access only</h2>
          <p>Please sign in with an admin account.</p>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <a className="btn primary" href="/auth">Go to login</a>
            <a className="btn" href="/">Back to shop</a>
          </div>
        </div>
      </div>
    );
  }

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
            <a className="header-link-btn" href="/">Back to Shop</a>
            <a className="header-link-btn" id="auth-btn" href="/auth">Login</a>
          </div>
        </div>
      </header>

      <main className="product-page">
        <section className="order-card admin-nav-card">
          <h2>Admin Sections</h2>
          <div className="admin-nav-list" id="admin-nav-list">
            <button type="button" className="admin-nav-btn active" data-target="section-overview">Overview</button>
            <button type="button" className="admin-nav-btn" data-target="section-add-product">Add Product</button>
            <button type="button" className="admin-nav-btn" data-target="section-products">Edit Products</button>
            <button type="button" className="admin-nav-btn" data-target="section-sells">Sells List</button>
            <button type="button" className="admin-nav-btn" data-target="section-revenues">Revenues</button>
            <button type="button" className="admin-nav-btn" data-target="section-deleted-revenues">Deleted actions</button>
            <button type="button" className="admin-nav-btn" data-target="section-users">Users & Roles</button>
            <button type="button" className="admin-nav-btn" data-target="section-not-users">Not Users</button>
          </div>
        </section>

        <section className="order-card admin-section" id="section-overview">
          <h1>Admin Dashboard</h1>
          <div className="admin-stats" id="admin-stats"></div>
          <h3>Monthly sells</h3>
          <div id="admin-monthly-sales" className="history-list"></div>
        </section>

        <section className="order-card admin-section" id="section-add-product">
          <h2>Add Product</h2>
          <form id="add-product-form" className="order-form">
            <label>Product name
              <input name="name" required />
            </label>
            <label>Price (Dt)
              <input name="priceDt" type="number" min="1" step="0.01" required />
            </label>
            <label>Wave
              <select name="wave" required>
                <option value="Scene Stealer">Scene Stealer</option>
                <option value="1stDrop">Cold Nights Drop</option>
                <option value="CAIROKEE">CAIROKEE</option>
                <option value="LEMHAF">LEMHAF</option>
                <option value="UPSIDE DOWN">UPSIDE DOWN</option>
              </select>
            </label>
            <label>Colors
              <div className="admin-color-palette" data-palette="add"></div>
              <input type="hidden" name="colorsCsv" defaultValue="W" required />
              <input type="hidden" name="mainColor" defaultValue="W" />
            </label>
            <label className="payment-option">
              <input name="soldOut" type="checkbox" />
              Sold out
            </label>
            <div className="admin-color-image-editor" data-editor="add"></div>
            <input type="hidden" name="imageUrl" />
            <input type="hidden" name="colorImagesMap" />
            <label>Description
              <textarea name="description"></textarea>
            </label>
            <button className="btn primary" type="submit">Add product</button>
          </form>
          <div id="admin-message" className="confirmation"></div>
        </section>

        <section className="order-card admin-section" id="section-products">
          <h2>Products (Edit)</h2>
          <div id="admin-products" className="history-list"></div>
        </section>

        <section className="order-card admin-section" id="section-sells">
          <h2>Sells List</h2>
          <div id="admin-orders" className="history-list"></div>
          <div id="admin-orders-bottom-trigger" className="admin-orders-bottom-trigger" aria-hidden="true"></div>
          <button type="button" id="admin-older-orders-btn" className="btn admin-older-orders-btn hidden">Older sells list</button>
          <div id="admin-older-orders" className="history-list hidden"></div>
        </section>

        <section className="order-card admin-section" id="section-revenues">
          <h2>Revenues</h2>
          <div className="admin-revenues-layout">
            <aside className="admin-revenues-aside">
              <h3>Monthly revenues</h3>
              <div id="admin-monthly-revenues" className="history-list"></div>
            </aside>
            <div className="admin-revenues-main">
              <p className="desc">Current month only. Each new month starts from 0. Old months stay in Monthly revenues fiche.</p>
              <form id="admin-revenue-adjust-form" className="order-form admin-revenue-form">
                <label>Action title
                  <input name="title" required placeholder="Bought boxes" />
                </label>
                <label>Type
                  <select name="type" required>
                    <option value="add">Add (+)</option>
                    <option value="remove">Remove (-)</option>
                  </select>
                </label>
                <label>Amount (Dt)
                  <input name="amountDt" type="number" min="0.01" step="0.01" required placeholder="10" />
                </label>
                <button className="btn primary" type="submit">Save</button>
              </form>
              <div className="admin-revenue-tools">
                <button type="button" id="admin-approve-revenue-btn" className="btn">Approve & Save Month</button>
              </div>
              <div id="admin-revenues" className="history-list"></div>
              <h3>Deleted actions</h3>
              <div id="admin-deleted-revenues" className="history-list"></div>
            </div>
          </div>
        </section>

        <section className="order-card admin-section" id="section-deleted-revenues">
          <h2>Deleted actions</h2>
          <h3>Revenues</h3>
          <div id="admin-deleted-revenues-list" className="history-list"></div>
          <h3>Users</h3>
          <div id="admin-deleted-users-list" className="history-list"></div>
        </section>

        <section className="order-card admin-section" id="section-users">
          <h2>Users & Roles</h2>
          <div id="admin-users" className="history-list"></div>
        </section>

        <section className="order-card admin-section" id="section-not-users">
          <h2>Not Users</h2>
          <div id="admin-not-users" className="history-list"></div>
        </section>
        <dialog id="admin-month-details-dialog" aria-labelledby="admin-month-details-title">
          <div className="modal-head">
            <h3 id="admin-month-details-title"></h3>
            <button type="button" id="admin-month-details-close" className="x-btn" aria-label="Close dialog">×</button>
          </div>
          <div id="admin-month-details-body"></div>
        </dialog>
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
