const statsEl = document.getElementById("admin-stats");
const productsEl = document.getElementById("admin-products");
const ordersEl = document.getElementById("admin-orders");
const usersEl = document.getElementById("admin-users");
const revenuesEl = document.getElementById("admin-revenues");
const monthlySalesEl = document.getElementById("admin-monthly-sales");
const monthlyRevenuesEl = document.getElementById("admin-monthly-revenues");
const revenueAdjustForm = document.getElementById("admin-revenue-adjust-form");
const addProductForm = document.getElementById("add-product-form");
const messageEl = document.getElementById("admin-message");
const monthDetailsDialog = document.getElementById("admin-month-details-dialog");
const monthDetailsTitleEl = document.getElementById("admin-month-details-title");
const monthDetailsBodyEl = document.getElementById("admin-month-details-body");
const monthDetailsCloseBtn = document.getElementById("admin-month-details-close");
const adminSections = document.querySelectorAll(".admin-section");
const adminNavButtons = document.querySelectorAll(".admin-nav-btn");
const ORDER_STATUSES = ["pending", "confirmed", "delivered", "returned", "cancelled"];
const COLOR_OPTIONS = ["B", "W", "Br", "P", "Grey"];
let availableImageFiles = [];
let currentAdminId = null;

function monthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-");
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return String(monthKey || "");
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function openMonthDetails(title, html) {
  if (!monthDetailsDialog || !monthDetailsTitleEl || !monthDetailsBodyEl) return;
  monthDetailsTitleEl.textContent = title;
  monthDetailsBodyEl.innerHTML = html;
  monthDetailsDialog.showModal();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openReportTab({ title, monthKey, summaryRows, tableHeaders, tableRows }, existingTab = null) {
  const tab = existingTab || window.open("about:blank", "_blank");
  if (!tab) {
    showMessage("Popup blocked. Allow popups to open fiche in new tab.");
    return;
  }

  const summaryHtml = summaryRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${escapeHtml(row.value)}</td>
    </tr>
  `).join("");

  const headerHtml = tableHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const rowsHtml = tableRows.length
    ? tableRows.map((cells) => `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${tableHeaders.length}">No data for this month.</td></tr>`;

  tab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - ${escapeHtml(monthLabel(monthKey))}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .sub { color: #4b5563; margin-bottom: 16px; }
    .actions { margin: 0 0 16px; }
    button { padding: 8px 12px; border: 1px solid #9ca3af; border-radius: 8px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    .summary td:first-child { width: 240px; font-weight: 700; }
    @media print { .actions { display: none; } body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Month: ${escapeHtml(monthLabel(monthKey))} (${escapeHtml(monthKey)})</div>
  <div class="actions">
    <button onclick="window.print()">Download as PDF</button>
  </div>

  <table class="summary">
    <thead><tr><th>Summary</th><th>Value</th></tr></thead>
    <tbody>${summaryHtml}</tbody>
  </table>

  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`);
  tab.document.close();
}

monthDetailsCloseBtn?.addEventListener("click", () => {
  monthDetailsDialog?.close();
});

function showMessage(text, ok = false) {
  messageEl.textContent = text;
  messageEl.style.display = "block";
  messageEl.style.color = ok ? "#047857" : "#b91c1c";

  let toast = document.getElementById("admin-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "admin-toast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.classList.toggle("ok", ok);
  toast.classList.add("show");
  window.clearTimeout(showMessage._toastTimer);
  showMessage._toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function showSectionError(element, text) {
  if (!element) return;
  element.innerHTML = `<p class="desc">${text}</p>`;
}

function escapeAttr(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
}

function firstImagePath(rawValue) {
  return String(rawValue || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)[0] || "";
}

const ALLOWED_COLORS = new Set(["B", "W", "Br", "P", "Grey"]);

function parseColorsCsvValue(colorsCsv) {
  const parsed = String(colorsCsv || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => ALLOWED_COLORS.has(item));
  return parsed.length ? parsed : ["W"];
}

function setupColorPalette(form, initialCsv = "W", initialMainColor = "W") {
  const paletteHost = form.querySelector(".admin-color-palette");
  const colorsInput = form.querySelector('input[name="colorsCsv"]');
  const mainColorInput = form.querySelector('input[name="mainColor"]');
  if (!paletteHost || !colorsInput || !mainColorInput) return;

  const selected = new Set(parseColorsCsvValue(initialCsv || colorsInput.value));
  let mainColor = selected.has(initialMainColor) ? initialMainColor : Array.from(selected)[0];

  const sync = () => {
    if (!selected.size) selected.add("W");
    if (!selected.has(mainColor)) {
      mainColor = Array.from(selected)[0];
    }

    colorsInput.value = COLOR_OPTIONS.filter((code) => selected.has(code)).join(",");
    mainColorInput.value = mainColor;
    colorsInput.dispatchEvent(new Event("change", { bubbles: true }));

    paletteHost.querySelectorAll(".admin-color-btn").forEach((btn) => {
      const color = btn.dataset.color;
      btn.classList.toggle("active", selected.has(color));
    });

    paletteHost.querySelectorAll(".admin-main-color-radio").forEach((radio) => {
      const color = radio.value;
      radio.checked = color === mainColor;
      radio.disabled = !selected.has(color);
    });
  };

  paletteHost.innerHTML = COLOR_OPTIONS.map((color) => `
    <div class="admin-color-choice">
      <button type="button" class="color-dot admin-color-btn ${selected.has(color) ? "active" : ""}" data-color="${color}" aria-label="${color}" title="${color}"></button>
      <label class="admin-main-color-label">
        <input type="radio" class="admin-main-color-radio" name="mainColorChoice-${form.dataset.id || "add"}" value="${color}">
        Main
      </label>
    </div>
  `).join("");

  paletteHost.querySelectorAll(".admin-color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      if (!color) return;
      if (selected.has(color) && selected.size === 1) return;

      if (selected.has(color)) {
        selected.delete(color);
      } else {
        selected.add(color);
      }

      sync();
    });
  });

  paletteHost.querySelectorAll(".admin-main-color-radio").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      if (!selected.has(radio.value)) return;
      mainColor = radio.value;
      sync();
    });
  });

  sync();
}

function parseColorImagesMapText(mapText) {
  const map = {};
  String(mapText || "")
    .split(/\r?\n+/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const [color, images] = trimmed.split("=");
      if (!color || !images) return;
      const key = color.trim();
      const list = images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (ALLOWED_COLORS.has(key) && list.length) {
        map[key] = list;
      }
    });
  return map;
}

function serializeColorImagesMap(map, colors) {
  return colors
    .filter((color) => Array.isArray(map[color]) && map[color].length)
    .map((color) => `${color}=${map[color].join(",")}`)
    .join("\n");
}

async function loadAvailableImageFiles() {
  try {
    const response = await fetch("/api/admin/image-files", { cache: "no-store" });
    if (!response.ok) {
      showMessage("Could not load image list from img folder.");
      return;
    }

    const payload = await response.json();
    availableImageFiles = Array.isArray(payload.files) ? payload.files : [];
  } catch {
    showMessage("Could not load image list from img folder.");
  }
}

function setupColorImageEditor(form, initialMapText = "") {
  const editorHost = form.querySelector(".admin-color-image-editor");
  const colorsInput = form.querySelector('input[name="colorsCsv"]');
  const imageUrlInput = form.querySelector('input[name="imageUrl"]');
  const colorMapInput = form.querySelector('input[name="colorImagesMap"]');

  if (!editorHost || !colorsInput || !imageUrlInput || !colorMapInput) return;

  const colorMap = parseColorImagesMapText(initialMapText);

  const buildOptions = (selectedValues = []) => {
    return [`<option value="">-- choose --</option>`, ...availableImageFiles.map((filePath) => `
      <option value="${escapeAttr(filePath)}" ${selectedValues.includes(filePath) ? "selected" : ""}>${filePath}</option>
    `)].join("");
  };

  const syncHiddenFields = (colors) => {
    const serialized = serializeColorImagesMap(colorMap, colors);
    colorMapInput.value = serialized;

    let firstImage = "";
    for (const color of colors) {
      if (Array.isArray(colorMap[color]) && colorMap[color].length) {
        firstImage = colorMap[color][0];
        break;
      }
    }
    imageUrlInput.value = firstImage;
  };

  const render = () => {
    const colors = parseColorsCsvValue(colorsInput.value);

    if (!availableImageFiles.length) {
      editorHost.innerHTML = `<p class="desc">No image files found in img folder or list not loaded yet.</p>`;
      syncHiddenFields(colors);
      return;
    }

    editorHost.innerHTML = `
      <div class="admin-status-label">Pictures by color</div>
      ${colors.map((color) => {
        const list = colorMap[color] || [];
        const main = list[0] || "";
        const extras = list.slice(1);
        return `
          <article class="history-item">
            <div class="name">Color ${color}</div>
            <label>Main image (${color})
              <select data-role="main" data-color="${color}">
                ${buildOptions(main ? [main] : [])}
              </select>
            </label>
            <label>Other pictures (${color})
              <select multiple size="6" data-role="extra" data-color="${color}">
                ${buildOptions(extras)}
              </select>
            </label>
          </article>
        `;
      }).join("")}
    `;

    editorHost.querySelectorAll('select[data-role="main"]').forEach((select) => {
      select.addEventListener("change", () => {
        const color = select.dataset.color;
        if (!color) return;

        const currentExtras = (colorMap[color] || []).slice(1).filter((item) => item !== select.value);
        colorMap[color] = [select.value, ...currentExtras].filter(Boolean);

        syncHiddenFields(colors);
      });
    });

    editorHost.querySelectorAll('select[data-role="extra"]').forEach((select) => {
      select.addEventListener("change", () => {
        const color = select.dataset.color;
        if (!color) return;

        const selectedExtras = Array.from(select.selectedOptions)
          .map((option) => option.value)
          .filter(Boolean);
        const main = (colorMap[color] || [])[0] || "";
        colorMap[color] = [main, ...selectedExtras].filter(Boolean);

        syncHiddenFields(colors);
      });
    });

    syncHiddenFields(colors);
  };

  colorsInput.addEventListener("input", () => {
    render();
  });
  colorsInput.addEventListener("change", () => {
    render();
  });

  render();
}

async function requireAdminPageAccess() {
  let me;
  try {
    const meRes = await fetch("/api/auth/me");
    me = await meRes.json();
  } catch {
    alert("Server is not running. Start backend first.");
    return false;
  }

  if (!me.user) {
    window.location.href = "auth.html";
    return false;
  }
  currentAdminId = Number(me.user.id || 0);
  if (me.user.role !== "admin") {
    showAdminSection("section-overview");
    statsEl.innerHTML = `
      <article class="history-item">
        <div class="name">Admin access required</div>
        <div class="desc">Only developer can promote account in SQL database.</div>
        <div class="desc">Example: UPDATE users SET role = 'admin' WHERE phone = '+216XXXXXXXX';</div>
      </article>
    `;
    addProductForm.closest("#section-add-product")?.classList.add("hidden");
    document.getElementById("section-products")?.classList.add("hidden");
    document.getElementById("section-sells")?.classList.add("hidden");
    document.getElementById("section-revenues")?.classList.add("hidden");
    document.getElementById("section-users")?.classList.add("hidden");
    adminNavButtons.forEach((btn) => {
      if (btn.dataset.target !== "section-overview") {
        btn.classList.add("hidden");
      }
    });
    return false;
  }
  return true;
}

function showAdminSection(sectionId) {
  adminSections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== sectionId);
  });

  adminNavButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === sectionId);
  });
}

adminNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showAdminSection(btn.dataset.target);
  });
});

showAdminSection("section-overview");

async function loadSummary() {
  try {
    const response = await fetch("/api/admin/summary");
    if (!response.ok) {
      showSectionError(statsEl, "Could not load summary. Restart server and check admin login.");
      return;
    }
    const data = await response.json();

    statsEl.innerHTML = `
      <div class="admin-card"><strong>Total Orders</strong><span>${data.ordersCount}</span></div>
      <div class="admin-card"><strong>Pending</strong><span>${data.pendingCount}</span></div>
      <div class="admin-card"><strong>Total Sales</strong><span>${Number(data.totalSalesDt).toFixed(2)} Dt</span></div>
    `;
  } catch {
    showSectionError(statsEl, "Server not reachable. Start backend first.");
  }
}

async function loadMonthlySalesOverview() {
  if (!monthlySalesEl) return;

  let response;
  try {
    response = await fetch("/api/admin/sales/monthly", { cache: "no-store" });
  } catch {
    showSectionError(monthlySalesEl, "Server not reachable. Start backend first.");
    return;
  }

  if (!response.ok) {
    showSectionError(monthlySalesEl, "Could not load monthly sells.");
    return;
  }

  const payload = await response.json();
  const months = Array.isArray(payload.months) ? payload.months : [];

  if (!months.length) {
    monthlySalesEl.innerHTML = '<p class="desc">No monthly sells yet.</p>';
    return;
  }

  monthlySalesEl.innerHTML = months.map((item) => `
    <article class="history-item">
      <div class="meta">
        <div class="name">${monthLabel(item.monthKey)}</div>
        <div class="price">${Number(item.salesDt || 0).toFixed(2)} Dt</div>
      </div>
      <div class="desc">Orders: ${Number(item.ordersCount || 0)}</div>
      <button type="button" class="btn admin-month-view-btn" data-kind="sales" data-month="${item.monthKey}">Open fiche</button>
    </article>
  `).join("");

  monthlySalesEl.querySelectorAll('button[data-kind="sales"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const monthKey = button.dataset.month;
      if (!monthKey) return;

      const reportTab = window.open("about:blank", "_blank");
      if (!reportTab) {
        showMessage("Popup blocked. Allow popups to open fiche in new tab.");
        return;
      }
      reportTab.document.write("<html><body style='font-family:Arial,sans-serif;padding:18px'>Loading fiche...</body></html>");
      reportTab.document.close();

      const response = await fetch(`/api/admin/sales/monthly/${encodeURIComponent(monthKey)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not load month details.");
        reportTab.document.body.innerHTML = "Could not load fiche.";
        return;
      }

      const orders = Array.isArray(payload.orders) ? payload.orders : [];
      const byProduct = new Map();
      let totalQty = 0;
      let totalSales = 0;
      orders.forEach((o) => {
        const name = String(o.product_name || "").trim();
        const qty = Number(o.amount || 0);
        const sales = Number(o.unit_price_dt || 0) * qty;
        if (!name || qty <= 0) return;
        const prev = byProduct.get(name) || { qty: 0, sales: 0 };
        prev.qty += qty;
        prev.sales += sales;
        byProduct.set(name, prev);
        totalQty += qty;
        totalSales += sales;
      });

      const tableRows = Array.from(byProduct.entries())
        .filter(([, v]) => v.qty > 0)
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([name, v]) => [name, String(v.qty), `${v.sales.toFixed(2)} Dt`]);

      openReportTab({
        title: "Monthly Sells Fiche",
        monthKey,
        summaryRows: [
          { label: "Total sold hoodies", value: String(totalQty) },
          { label: "Total product sales", value: `${totalSales.toFixed(2)} Dt` },
          { label: "Different hoodie types", value: String(tableRows.length) }
        ],
        tableHeaders: ["Hoodie", "Sold qty", "Sales"],
        tableRows
      }, reportTab);
    });
  });
}

async function loadMonthlyRevenuesOverview() {
  if (!monthlyRevenuesEl) return;

  let response;
  try {
    response = await fetch("/api/admin/revenues/monthly", { cache: "no-store" });
  } catch {
    showSectionError(monthlyRevenuesEl, "Server not reachable. Start backend first.");
    return;
  }

  if (!response.ok) {
    showSectionError(monthlyRevenuesEl, "Could not load monthly revenues.");
    return;
  }

  const payload = await response.json();
  const months = Array.isArray(payload.months) ? payload.months : [];

  if (!months.length) {
    monthlyRevenuesEl.innerHTML = '<p class="desc">No monthly revenues yet.</p>';
    return;
  }

  monthlyRevenuesEl.innerHTML = months.map((item) => `
    <article class="history-item revenue-item ${Number(item.totalDt) >= 0 ? "is-add" : "is-remove"}">
      <div class="meta">
        <div class="name">${monthLabel(item.monthKey)}</div>
        <div class="price revenue-amount ${Number(item.totalDt) >= 0 ? "is-add" : "is-remove"}">${formatSignedDt(item.totalDt)}</div>
      </div>
      <div class="desc">Delivered net: ${Number(item.salesNetDt || 0).toFixed(2)} Dt</div>
      <div class="desc">Manual: ${Number(item.manualAdjustmentsDt || 0).toFixed(2)} Dt</div>
      <button type="button" class="btn admin-month-view-btn" data-kind="revenue" data-month="${item.monthKey}">Open fiche</button>
    </article>
  `).join("");

  monthlyRevenuesEl.querySelectorAll('button[data-kind="revenue"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const monthKey = button.dataset.month;
      if (!monthKey) return;

      const reportTab = window.open("about:blank", "_blank");
      if (!reportTab) {
        showMessage("Popup blocked. Allow popups to open fiche in new tab.");
        return;
      }
      reportTab.document.write("<html><body style='font-family:Arial,sans-serif;padding:18px'>Loading fiche...</body></html>");
      reportTab.document.close();

      const response = await fetch(`/api/admin/revenues/monthly/${encodeURIComponent(monthKey)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not load month details.");
        reportTab.document.body.innerHTML = "Could not load fiche.";
        return;
      }
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      const salesAdded = entries
        .filter((e) => e.kind === "sale_add")
        .reduce((sum, e) => sum + Number(e.amountDt || 0), 0);
      const sewingRemoved = entries
        .filter((e) => e.kind === "sewing_remove")
        .reduce((sum, e) => sum + Math.abs(Number(e.amountDt || 0)), 0);
      const manualAdded = entries
        .filter((e) => e.kind === "adjustment" && Number(e.amountDt || 0) > 0)
        .reduce((sum, e) => sum + Number(e.amountDt || 0), 0);
      const manualRemoved = entries
        .filter((e) => e.kind === "adjustment" && Number(e.amountDt || 0) < 0)
        .reduce((sum, e) => sum + Math.abs(Number(e.amountDt || 0)), 0);

      openReportTab({
        title: "Monthly Revenue Fiche",
        monthKey,
        summaryRows: [
          { label: "Hoodie sales added", value: `+${salesAdded.toFixed(2)} Dt` },
          { label: "Sewing removed", value: `-${sewingRemoved.toFixed(2)} Dt` },
          { label: "Manual added", value: `+${manualAdded.toFixed(2)} Dt` },
          { label: "Manual removed", value: `-${manualRemoved.toFixed(2)} Dt` },
          { label: "Net total", value: `${Number(payload.totalDt || 0).toFixed(2)} Dt` }
        ],
        tableHeaders: ["Type", "Title", "Amount"],
        tableRows: entries.map((entry) => [
          entry.kind === "sale_add" ? "Sale +" : entry.kind === "sewing_remove" ? "Sewing -" : "Manual",
          entry.title,
          formatSignedDt(entry.amountDt)
        ])
      }, reportTab);
    });
  });
}

async function loadProducts() {
  let response;
  try {
    response = await fetch("/api/admin/products");
  } catch {
    showSectionError(productsEl, "Server not reachable. Start backend first.");
    return;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    showSectionError(productsEl, payload.message || "Could not load products. Make sure server is restarted.");
    return;
  }

  const data = await response.json();
  const products = data.products || [];

  if (!products.length) {
    productsEl.innerHTML = '<p class="desc">No products in database yet.</p>';
    return;
  }

  productsEl.innerHTML = products.map((p) => `
    <form class="history-item admin-product-form" data-id="${p.id}">
      <label>Name
        <input name="name" value="${escapeAttr(p.name)}" required>
      </label>
      <label>Price (Dt)
        <input name="priceDt" type="number" min="1" step="0.01" value="${(p.price_cents / 100).toFixed(2)}" required>
      </label>
      <label>Wave
        <select name="wave" required>
          <option value="1stDrop" ${String(p.wave) === "1stDrop" ? "selected" : ""}>1stDrop</option>
          <option value="CAIROKEE" ${String(p.wave) === "CAIROKEE" ? "selected" : ""}>CAIROKEE</option>
          <option value="LEMHAF" ${String(p.wave) === "LEMHAF" ? "selected" : ""}>LEMHAF</option>
          <option value="UPSIDE DOWN" ${String(p.wave) === "UPSIDE DOWN" ? "selected" : ""}>UPSIDE DOWN</option>
        </select>
      </label>
      <label>Colors
        <div class="admin-color-palette" data-palette="edit"></div>
        <input type="hidden" name="colorsCsv" value="${escapeAttr(p.colors_csv || "W")}">
        <input type="hidden" name="mainColor" value="${escapeAttr(p.main_color || "W")}">
      </label>
      <label class="payment-option">
        <input name="soldOut" type="checkbox" ${Number(p.sold_out || 0) === 1 ? "checked" : ""}>
        Sold out
      </label>
      <div class="admin-color-image-editor" data-editor="edit"></div>
      <input type="hidden" name="imageUrl" value="${escapeAttr(p.image_url || "")}">
      <input type="hidden" name="colorImagesMap" value="${escapeAttr(p.color_images_map || "")}">
      <label>Description
        <textarea name="description">${p.description || ""}</textarea>
      </label>
      <button class="btn" type="submit">Save changes</button>
    </form>
  `).join("");

  productsEl.querySelectorAll(".admin-product-form").forEach((form) => {
    const productId = Number(form.dataset.id);
    const product = products.find((item) => Number(item.id) === productId);
    setupColorPalette(form, product?.colors_csv || "W", product?.main_color || "W");
    setupColorImageEditor(form, product?.color_images_map || "");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const id = Number(form.dataset.id);
      const fd = new FormData(form);
      const body = Object.fromEntries(fd.entries());
      body.soldOut = fd.has("soldOut");

      try {
        const response = await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          showMessage(payload.details ? `${payload.message} (${payload.details})` : (payload.message || "Could not save product."));
          return;
        }

        showMessage("Product updated.", true);
        loadSummary();
      } catch {
        showMessage("Could not save product. Server/network error.");
      }
    });
  });
}

async function loadOrders() {
  let response;
  try {
    response = await fetch("/api/admin/orders", { cache: "no-store" });
  } catch {
    showSectionError(ordersEl, "Server not reachable. Start backend first.");
    return;
  }
  if (!response.ok) {
    showSectionError(ordersEl, "Could not load sells list. Make sure server is restarted.");
    return;
  }

  const data = await response.json();
  const orders = data.orders || [];

  if (!orders.length) {
    ordersEl.innerHTML = '<p class="desc">No sells yet.</p>';
    return;
  }

  ordersEl.innerHTML = orders.map((o) => {
    const productTotal = Number(o.unit_price_dt) * Number(o.amount);
    const delivery = Number(o.delivery_fee_dt || 0);
    const total = productTotal + delivery;
    const deliveryOn = delivery > 0;
    const productImage = firstImagePath(o.product_image_url);
    const deliveredAtMs = o.delivered_at ? new Date(o.delivered_at).getTime() : null;
    const deliveredLocked = String(o.status || "").toLowerCase() === "delivered"
      && Number.isFinite(deliveredAtMs)
      && (Date.now() - deliveredAtMs >= 24 * 60 * 60 * 1000);
    const isVerified = Number(o.account_is_verified || 0) === 1;
    const isBlacklisted = Number(o.account_is_blacklisted || 0) === 1;
    const accountSigns = [
      isVerified ? '<span class="admin-user-sign sign-verified">Verified</span>' : "",
      isBlacklisted ? '<span class="admin-user-sign sign-blacklisted">Blacklisted</span>' : ""
    ].filter(Boolean).join(" ");

    return `
    <article class="history-item">
      <div class="admin-order-head">
        ${productImage ? `<img class="admin-order-image" src="${productImage}" alt="${o.product_name}">` : ""}
        <div class="admin-order-head-content">
      <div class="meta">
        <div class="name">#${o.id} - ${o.product_name}</div>
        <div class="price">${total.toFixed(2)} Dt</div>
      </div>
      <div class="desc">Buyer: <strong>${o.account_name || "-"}</strong> (<strong>${o.account_phone || "-"}</strong>)</div>
      ${accountSigns ? `<div class="desc">${accountSigns}</div>` : ""}
      <div class="desc">Color: <strong>${o.color}</strong> • Size: <strong>${o.size}</strong> • Amount: <strong>${o.amount}</strong></div>
      <div class="desc">Product: <strong>${productTotal.toFixed(2)} Dt</strong> + Delivery: <strong>${delivery > 0 ? `${delivery.toFixed(2)} Dt` : "OFF"}</strong> = Total: <strong>${total.toFixed(2)} Dt</strong></div>
      <div class="desc">Note: <strong>${o.note ? o.note : "-"}</strong></div>
      <div class="desc">Date: ${new Date(o.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="admin-status-wrap">
        <div class="admin-status-label">Delivery fee for this order</div>
        <div class="admin-status-group" data-delivery-id="${o.id}">
          <button
            type="button"
            class="admin-status-btn delivery-btn delivery-on ${deliveryOn ? "active" : ""}"
            data-id="${o.id}"
            data-delivery-enabled="true">
            ON
          </button>
          <button
            type="button"
            class="admin-status-btn delivery-btn delivery-off ${deliveryOn ? "" : "active"}"
            data-id="${o.id}"
            data-delivery-enabled="false">
            OFF
          </button>
        </div>
      </div>
      <div class="admin-status-wrap">
        <div class="admin-status-label">Status</div>
        <div class="admin-status-group" data-id="${o.id}">
          ${ORDER_STATUSES.map((status) => `
            <button
              type="button"
              class="admin-status-btn status-${status} ${o.status === status ? "active" : ""}"
              data-id="${o.id}"
              data-status="${status}"
              ${deliveredLocked ? "disabled" : ""}>
              ${status === "returned" ? "return" : status}
            </button>
          `).join("")}
        </div>
        ${deliveredLocked ? '<div class="desc">Status locked: this order was delivered more than 24 hours ago.</div>' : ""}
      </div>
    </article>
  `;
  }).join("");

  ordersEl.querySelectorAll(".delivery-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const enabled = button.dataset.deliveryEnabled === "true";
      if (!id) return;
      if (button.classList.contains("active")) return;

      const group = button.closest(".admin-status-group");
      group?.querySelectorAll(".delivery-btn").forEach((btn) => {
        btn.disabled = true;
      });

      const response = await fetch(`/api/admin/orders/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ enabled })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not update delivery fee for this order.");
        group?.querySelectorAll(".delivery-btn").forEach((btn) => {
          btn.disabled = false;
        });
        return;
      }

      group?.querySelectorAll(".delivery-btn").forEach((btn) => {
        const isOnBtn = btn.dataset.deliveryEnabled === "true";
        btn.classList.toggle("active", isOnBtn === Boolean(payload.deliveryEnabled));
        btn.disabled = false;
      });

      const card = button.closest(".history-item");
      const detailsLine = card?.querySelectorAll(".desc")?.[2];
      const priceEl = card?.querySelector(".price");
      if (detailsLine && priceEl) {
        const productMatch = detailsLine.textContent.match(/Product:\s*([\d.]+)/i);
        const productTotal = Number(productMatch?.[1] || 0);
        const deliveryFee = Number(payload.deliveryFeeDt || 0);
        const total = productTotal + deliveryFee;
        detailsLine.textContent = `Product: ${productTotal.toFixed(2)} Dt + Delivery: ${deliveryFee > 0 ? `${deliveryFee.toFixed(2)} Dt` : "OFF"} = Total: ${total.toFixed(2)} Dt`;
        priceEl.textContent = `${total.toFixed(2)} Dt`;
      }

      showMessage(`Delivery fee ${payload.deliveryEnabled ? "enabled" : "disabled"} for order #${id}.`, true);
      loadSummary();
      loadMonthlySalesOverview();
      loadRevenues();
      loadMonthlyRevenuesOverview();
    });
  });

  ordersEl.querySelectorAll(".admin-status-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const status = button.dataset.status;
      if (!id || !status) return;
      if (button.classList.contains("active")) return;

      const group = button.closest(".admin-status-group");
      group?.querySelectorAll(".admin-status-btn").forEach((btn) => {
        btn.disabled = true;
      });

      const response = await fetch(`/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not update order status.");
        group?.querySelectorAll(".admin-status-btn").forEach((btn) => {
          btn.disabled = false;
        });
        return;
      }

      group?.querySelectorAll(".admin-status-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.status === status);
        btn.disabled = false;
      });

      showMessage("Order status updated.", true);
      loadSummary();
      loadMonthlySalesOverview();
      loadRevenues();
      loadMonthlyRevenuesOverview();
    });
  });
}

function formatSignedDt(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toFixed(2)} Dt`;
}

function formatPlainDt(value) {
  return `${Math.abs(Number(value || 0)).toFixed(2)} Dt`;
}

async function loadRevenues() {
  if (!revenuesEl) return;

  let response;
  try {
    response = await fetch("/api/admin/revenues", { cache: "no-store" });
  } catch {
    showSectionError(revenuesEl, "Server not reachable. Start backend first.");
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    showSectionError(revenuesEl, payload.message || "Could not load revenues.");
    return;
  }

  const payload = await response.json();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const summaryCard = `
    <article class="history-item">
      <div class="meta">
        <div class="name">Total net revenue (${monthLabel(payload.monthKey || "")})</div>
        <div class="price">${formatPlainDt(payload.totalDt || 0)}</div>
      </div>
      <div class="desc">Delivered hoodies net: ${formatPlainDt(payload.salesNetDt || 0)}</div>
      <div class="desc">Manual actions total: ${formatPlainDt(payload.manualAdjustmentsDt || 0)}</div>
      <div class="desc">Per delivered order: +Product price (without delivery), then -Sewing cost (35 Dt x amount).</div>
      <div class="desc">This section resets each new month. Previous months are saved in Monthly revenues fiche.</div>
    </article>
  `;

  if (!entries.length) {
    revenuesEl.innerHTML = `${summaryCard}<p class="desc">No revenue actions yet.</p>`;
    return;
  }

  revenuesEl.innerHTML = summaryCard + entries.map((entry) => `
    <article class="history-item revenue-item ${Number(entry.amountDt) >= 0 ? "is-add" : "is-remove"}">
      <div class="meta">
        <div class="name">${entry.title}</div>
        <div class="price revenue-amount ${Number(entry.amountDt) >= 0 ? "is-add" : "is-remove"}">${formatPlainDt(entry.amountDt)}</div>
      </div>
      <div class="desc">Type: <strong class="revenue-type ${Number(entry.amountDt) >= 0 ? "is-add" : "is-remove"}">${entry.kind === "sale_add" ? "Sale +" : entry.kind === "sewing_remove" ? "Sewing -" : "Manual action"}</strong></div>
      <div class="desc">Date: ${new Date(entry.created_at).toLocaleString()}</div>
    </article>
  `).join("");
}

async function loadUsers() {
  let response;
  try {
    response = await fetch("/api/admin/users");
  } catch {
    showSectionError(usersEl, "Server not reachable. Start backend first.");
    return;
  }
  if (!response.ok) {
    showSectionError(usersEl, "Could not load users. Restart server after latest updates.");
    return;
  }

  const data = await response.json();
  const users = data.users || [];

  if (!users.length) {
    usersEl.innerHTML = '<p class="desc">No users yet.</p>';
    return;
  }

  usersEl.innerHTML = users.map((u) => `
    <article class="history-item">
      <div class="meta">
        <div class="name">${u.full_name}</div>
        <div class="price">${u.role}</div>
      </div>
      <div class="desc">Phone: ${u.phone}</div>
      <div class="desc">Created: ${new Date(u.created_at).toLocaleString()}</div>
      <div class="desc">
        ${Number(u.is_verified || 0) === 1 ? '<span class="admin-user-sign sign-verified">Verified</span>' : ''}
        ${Number(u.is_blacklisted || 0) === 1 ? '<span class="admin-user-sign sign-blacklisted">Blacklisted</span>' : ''}
      </div>
      <div class="admin-status-group">
        <button
          type="button"
          class="admin-status-btn status-delivered"
          data-action="toggle-verified"
          data-id="${u.id}"
          data-current="${Number(u.is_verified || 0)}"
          ${Number(u.id) === currentAdminId ? "disabled" : ""}>
          ${Number(u.is_verified || 0) === 1 ? "Unverify" : "Verify"}
        </button>
        <button
          type="button"
          class="admin-status-btn status-cancelled"
          data-action="toggle-blacklisted"
          data-id="${u.id}"
          data-current="${Number(u.is_blacklisted || 0)}"
          ${Number(u.id) === currentAdminId ? "disabled" : ""}>
          ${Number(u.is_blacklisted || 0) === 1 ? "Unblacklist" : "Blacklist"}
        </button>
        <button type="button" class="admin-status-btn status-cancelled" data-action="delete-user" data-id="${u.id}" ${Number(u.id) === currentAdminId ? "disabled" : ""}>Delete</button>
      </div>
    </article>
  `).join("");

  usersEl.querySelectorAll('button[data-action="toggle-verified"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.dataset.id);
      const currentlyVerified = Number(button.dataset.current || 0) === 1;
      if (!userId) return;

      const response = await fetch(`/api/admin/users/${userId}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !currentlyVerified, blacklisted: false })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not update verified status.");
        return;
      }

      showMessage(`User ${currentlyVerified ? "unverified" : "verified"}.`, true);
      await Promise.all([loadUsers(), loadOrders()]);
    });
  });

  usersEl.querySelectorAll('button[data-action="toggle-blacklisted"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.dataset.id);
      const currentlyBlacklisted = Number(button.dataset.current || 0) === 1;
      if (!userId) return;

      const response = await fetch(`/api/admin/users/${userId}/flags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: false, blacklisted: !currentlyBlacklisted })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not update blacklist status.");
        return;
      }

      showMessage(`User ${currentlyBlacklisted ? "removed from blacklist" : "blacklisted"}.`, true);
      await Promise.all([loadUsers(), loadOrders()]);
    });
  });

  usersEl.querySelectorAll('button[data-action="delete-user"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.dataset.id);
      if (!userId) return;

      const confirmed = window.confirm("Delete this user? Their account will be removed.");
      if (!confirmed) return;

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showMessage(payload.message || "Could not delete user.");
        return;
      }

      showMessage("User deleted.", true);
      await loadUsers();
      await loadSummary();
    });
  });
}

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(addProductForm);
  const body = Object.fromEntries(fd.entries());
  body.soldOut = fd.has("soldOut");

  try {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(payload.details ? `${payload.message} (${payload.details})` : (payload.message || "Could not add product."));
      return;
    }

    showMessage("Product added.", true);
    addProductForm.reset();
    setupColorPalette(addProductForm, "W");
    setupColorImageEditor(addProductForm, "");
    loadProducts();
    loadSummary();
  } catch {
    showMessage("Could not add product. Server/network error.");
  }
});

setupColorPalette(addProductForm, "W", "W");
setupColorImageEditor(addProductForm, "");

revenueAdjustForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fd = new FormData(revenueAdjustForm);
  const title = String(fd.get("title") || "").trim();
  const type = String(fd.get("type") || "add").trim();
  const amountDt = Number(fd.get("amountDt") || 0);

  if (!title) {
    showMessage("Action title is required.");
    return;
  }
  if (!Number.isFinite(amountDt) || amountDt <= 0) {
    showMessage("Amount must be greater than 0.");
    return;
  }

  try {
    const response = await fetch("/api/admin/revenues/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, amountDt })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(payload.message || "Could not save revenue action.");
      return;
    }

    revenueAdjustForm.reset();
    showMessage("Revenue action saved.", true);
    await loadRevenues();
    await loadMonthlyRevenuesOverview();
  } catch {
    showMessage("Could not save revenue action. Server/network error.");
  }
});

(async () => {
  const allowed = await requireAdminPageAccess();
  if (!allowed) return;

  await loadAvailableImageFiles();
  setupColorImageEditor(addProductForm, "");

  await Promise.all([
    loadSummary(),
    loadMonthlySalesOverview(),
    loadProducts(),
    loadOrders(),
    loadUsers(),
    loadRevenues(),
    loadMonthlyRevenuesOverview()
  ]);
})();
