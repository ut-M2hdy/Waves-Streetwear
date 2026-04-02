const shop = document.getElementById("shop");
const waveTabs = document.querySelectorAll(".wave-tab");

let activeWave = "1stDrop";
const selectedColors = new Map();
let catalogProducts = [...products];

function parseProductColors(row, fallbackColors = ["W"]) {
  const allowed = new Set(["B", "W", "Br", "P", "Grey"]);
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
  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) {
      renderProducts();
      return;
    }

    const payload = await response.json();
    const dbProducts = payload.products || [];
    if (!Array.isArray(dbProducts) || !dbProducts.length) {
      renderProducts();
      return;
    }

    const baseById = new Map(products.map((item) => [item.id, { ...item }]));
    catalogProducts = dbProducts.map((row) => {
      const base = baseById.get(Number(row.id));
      const parsedColors = parseProductColors(row, Array.isArray(base?.colors) && base.colors.length ? base.colors : ["W"]);
      const normalizedMainColor = parsedColors.includes(row.main_color) ? row.main_color : parsedColors[0];
      return {
        ...(base || {}),
        id: Number(row.id),
        name: row.name,
        price: Number(row.price_cents || 0) / 100,
        desc: row.description || base?.desc || "",
        imageUrl: row.image_url || base?.imageUrl || "",
        colorImagesMap: row.color_images_map || base?.colorImagesMap || "",
        wave: String(row.wave || base?.wave || "1stDrop"),
        colors: parsedColors,
        mainColor: normalizedMainColor,
        soldOut: Number(row.sold_out || 0) === 1
      };
    });
  } catch {
    catalogProducts = [...products];
  }

  renderProducts();
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
    button.addEventListener("click", () => {
      if (button.disabled) return;

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
  window.location.href = `product.html?id=${productId}${colorParam}`;
}

function setWave(waveName) {
  activeWave = waveName;

  waveTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.wave === waveName);
  });

  renderProducts();
}

waveTabs.forEach((tab) => {
  tab.addEventListener("click", () => setWave(tab.dataset.wave));
});

loadCatalogFromDatabase();
