const shop = document.getElementById("shop");
const waveTabs = document.querySelectorAll(".wave-tab");
const dbLoadingScreen = document.getElementById("db-loading-screen");
const dbLoadingMessage = document.getElementById("db-loading-message");

const COLOR_LABELS = window.COLOR_LABELS || {};
const normalizeProductColor = window.normalizeProductColor || ((_, color) => color);
const getProductImageCandidates = window.getProductImageCandidates || (() => []);
const getMainProductImage = window.getMainProductImage || (() => "");

let activeWave = "Scene Stealer";
const selectedColors = new Map();
let catalogProducts = [];
const CATALOG_CACHE_KEY = "waves_products_cache_v1";
const CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Check DB health - returns true if available, false if unavailable
async function checkDBHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.status !== 503;
  } catch {
    return false;
  }
}

function showDbLoadingScreen(message) {
  if (!dbLoadingScreen) return;
  dbLoadingScreen.classList.remove("hidden");
  if (dbLoadingMessage && message) {
    dbLoadingMessage.textContent = message;
  }
}

function hideDbLoadingScreen() {
  if (!dbLoadingScreen) return;
  dbLoadingScreen.classList.add("hidden");
}

async function waitForDatabaseAndReload() {
  showDbLoadingScreen("Please wait while we connect to the database.");

  while (true) {
    const isReady = await checkDBHealth();
    if (isReady) {
      showDbLoadingScreen("Database connected. Refreshing store...");
      window.location.reload();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

function parseProductColors(row, fallbackColors = ["W"]) {
  const allowed = new Set(["B", "W", "Br", "P", "Grey", "BC", "Be"]);
  const parsed = String(row?.colors_csv || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => allowed.has(item));
  return parsed.length ? parsed : fallbackColors;
}

function getProductById(productId) {
  return catalogProducts.find((item) => item.id === productId);
}

async function loadCatalogFromDatabase() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch("/api/products", {
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return;

    const payload = await response.json();
    const dbProducts = payload.products || [];
    if (!Array.isArray(dbProducts) || !dbProducts.length) return;

    try {
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        products: dbProducts
      }));
    } catch {
      // ignore cache write errors
    }

    catalogProducts = dbProducts.map((row) => {
      const parsedColors = parseProductColors(row, ["W"]);
      const normalizedMainColor = parsedColors.includes(row.main_color) ? row.main_color : parsedColors[0];
      return {
        id: Number(row.id),
        name: row.name,
        price: Number(row.price_cents || 0) / 100,
        desc: row.description || "",
        imageUrl: row.image_url || "",
        colorImagesMap: row.color_images_map || "",
        wave: String(row.wave || "1stDrop"),
        colors: parsedColors,
        mainColor: normalizedMainColor,
        soldOut: Number(row.sold_out || 0) === 1
      };
    });
  } catch {
    clearTimeout(timeoutId);
    catalogProducts = [];
  }

  renderProducts();
}

function loadCatalogFromCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products)) return false;

    const isFresh = Date.now() - Number(parsed.ts || 0) < CATALOG_CACHE_TTL_MS;
    if (!isFresh) return false;

    const cachedProducts = parsed.products;
    if (!cachedProducts.length) return false;

    catalogProducts = cachedProducts.map((row) => {
      const parsedColors = parseProductColors(row, ["W"]);
      const normalizedMainColor = parsedColors.includes(row.main_color) ? row.main_color : parsedColors[0];
      return {
        id: Number(row.id),
        name: row.name,
        price: Number(row.price_cents || 0) / 100,
        desc: row.description || "",
        imageUrl: row.image_url || "",
        colorImagesMap: row.color_images_map || "",
        wave: String(row.wave || "1stDrop"),
        colors: parsedColors,
        mainColor: normalizedMainColor,
        soldOut: Number(row.sold_out || 0) === 1
      };
    });

    renderProducts();
    return true;
  } catch {
    return false;
  }
}

function getSelectedColor(product) {
  const picked = selectedColors.get(product.id);
  const preferred = picked || product.mainColor;
  const normalized = normalizeProductColor(product, preferred);
  selectedColors.set(product.id, normalized);
  return normalized;
}

function setImageFallback(imgEl, candidates) {
  let idx = 0;
  if (!candidates.length) return;

  imgEl.src = candidates[idx];
  imgEl.onerror = () => {
    idx += 1;
    if (idx < candidates.length) {
      imgEl.src = candidates[idx];
    } else {
      imgEl.onerror = null;
      imgEl.alt = "Image unavailable";
    }
  };
}

function renderProducts() {
  const visibleProducts = catalogProducts.filter((p) => p.wave === activeWave);

  if (visibleProducts.length === 0) {
    shop.innerHTML = `<div class="empty-wave">No articles yet in WAVE: ${activeWave}</div>`;
    return;
  }

  shop.innerHTML = visibleProducts.map((p) => {
    const selectedColor = getSelectedColor(p);
    const colorDots = p.colors.map((code) => `
      <button
        type="button"
        class="color-dot ${code === selectedColor ? "active" : ""}"
        data-product-id="${p.id}"
        data-color="${code}"
        aria-label="${COLOR_LABELS[code] || code}"
        title="${COLOR_LABELS[code] || code}">
      </button>
    `).join("");

    return `
    <article class="card product-card ${p.soldOut ? "is-sold-out" : ""}" data-product-id="${p.id}" tabindex="0" role="link" aria-label="Open ${p.name}">
      ${p.soldOut ? '<div class="sold-out-badge">Sold out</div>' : ""}
      <img id="product-img-${p.id}" src="${getMainProductImage(p, selectedColor)}" alt="${p.name}">
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="price">${p.price} Dt</div>
      </div>
      <div class="desc">${p.desc}</div>
      <label class="color-picker-label">
        Color
        <div class="color-swatches">${colorDots}</div>
      </label>
      <div class="btn-row">
        <button class="btn primary buy-btn" data-product-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Sold out" : "Buy now"}</button>
      </div>
    </article>
  `;
  }).join("");

  visibleProducts.forEach((p) => {
    const imgEl = document.getElementById(`product-img-${p.id}`);
    if (!imgEl) return;

    const selectedColor = getSelectedColor(p);
    setImageFallback(imgEl, getProductImageCandidates(p, selectedColor));
  });

  shop.querySelectorAll(".color-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      const productId = Number(dot.dataset.productId);
      const nextColorRaw = dot.dataset.color;
      const product = getProductById(productId);
      if (!product || !nextColorRaw) return;

      const nextColor = normalizeProductColor(product, nextColorRaw);
      selectedColors.set(product.id, nextColor);

      const imgEl = document.getElementById(`product-img-${product.id}`);
      if (!imgEl) return;

      const card = dot.closest(".card");
      if (card) {
        card.querySelectorAll(".color-dot").forEach((item) => {
          item.classList.toggle("active", item.dataset.color === nextColor);
        });
      }

      setImageFallback(imgEl, getProductImageCandidates(product, nextColor));
    });
  });

  shop.querySelectorAll(".buy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;

      // Check DB health before navigating to product page
      const isDBAvailable = await checkDBHealth();
      if (!isDBAvailable) {
        alert("The database is under maintenance. Please try again shortly.");
        return;
      }

      const productId = Number(button.dataset.productId);
      const product = getProductById(productId);
      if (!product) return;

      const color = getSelectedColor(product);
      goToProduct(product.id, color);
    });
  });

  shop.querySelectorAll(".product-card").forEach((card) => {
    const openCard = () => {
      const productId = Number(card.dataset.productId);
      const product = getProductById(productId);
      if (!product || product.soldOut) return;

      const color = getSelectedColor(product);
      goToProduct(product.id, color);
    };

    card.addEventListener("click", (event) => {
      if (event.target.closest(".color-dot, .buy-btn")) return;
      openCard();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCard();
    });
  });
}

function scrollToShop() {
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
}

function goToProduct(productId, colorCode) {
  const colorParam = colorCode ? `&color=${encodeURIComponent(colorCode)}` : "";
  window.location.href = `/product?id=${productId}${colorParam}`;
}

function setWave(waveName) {
  activeWave = waveName;

  waveTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.wave === waveName);
  });

  renderProducts();
}

waveTabs.forEach((tab) => {
  if (tab.disabled) return;
  tab.addEventListener("click", () => setWave(tab.dataset.wave));
});

async function initializeStore() {
  const hasCache = loadCatalogFromCache();
  hideDbLoadingScreen();

  if (!hasCache) {
    const isDBAvailable = await checkDBHealth();
    if (!isDBAvailable) {
      showDbLoadingScreen("Please wait while we connect to the database.");
      return;
    }
  }

  loadCatalogFromDatabase();
}

initializeStore();
