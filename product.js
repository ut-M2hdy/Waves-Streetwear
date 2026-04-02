const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));
const colorParam = params.get("color");

const productNameEl = document.getElementById("product-name");
const productPriceEl = document.getElementById("product-price");
const productDescEl = document.getElementById("product-desc");
const productGalleryEl = document.getElementById("product-gallery");
const relatedProductsEl = document.getElementById("related-products");
const orderForm = document.getElementById("order-form");
const orderConfirmation = document.getElementById("order-confirmation");
const productColorSwatches = document.getElementById("product-color-swatches");
const sizeValueInput = document.getElementById("size-value");
const sizeDots = document.querySelectorAll(".size-dot");
const amountInput = orderForm.querySelector('input[name="amount"]');
const fullNameInput = orderForm.querySelector('input[name="fullName"]');
const phoneInput = orderForm.querySelector('input[name="phone"]');
const addressInput = orderForm.querySelector('textarea[name="address"]');
const productSubtotalEl = document.getElementById("product-subtotal");
const deliveryFeeEl = document.getElementById("delivery-fee");
const orderTotalEl = document.getElementById("order-total");
const DEFAULT_DELIVERY_FEE = 9;

let catalogProducts = [...products];
let product = null;
let selectedColor = "W";

function parseProductColors(row, fallbackColors = ["W"]) {
  const allowed = new Set(["B", "W", "Br", "P", "Grey"]);
  const parsed = String(row?.colors_csv || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => allowed.has(item));
  return parsed.length ? parsed : fallbackColors;
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

function applySoldOutState() {
  const submitButton = orderForm.querySelector('button[type="submit"]');
  if (!product?.soldOut) {
    orderForm.querySelectorAll("input, textarea, select").forEach((field) => {
      field.disabled = false;
    });
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Confirm Buy Now";
    }
    orderConfirmation.style.display = "none";
    return;
  }

  orderForm.querySelectorAll("input, textarea, select").forEach((field) => {
    field.disabled = true;
  });
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sold out";
  }
  orderConfirmation.textContent = "This hoodie is currently sold out.";
  orderConfirmation.style.display = "block";
}

function showNotFound() {
  productNameEl.textContent = "Product not found";
  productPriceEl.textContent = "";
  productDescEl.textContent = "This article does not exist.";
  orderForm.style.display = "none";
  productColorSwatches.style.display = "none";
  relatedProductsEl.innerHTML = "";
}

function hydrateCatalogFromDbRows(rows) {
  const baseById = new Map(products.map((item) => [item.id, { ...item }]));
  return rows.map((row) => {
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
}

async function initProductPage() {
  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.products) && payload.products.length) {
        catalogProducts = hydrateCatalogFromDbRows(payload.products);
      }
    }
  } catch {
    // keep static fallback
  }

  product = catalogProducts.find((item) => item.id === productId) || null;
  const initialColor = colorParam || product?.mainColor;
  selectedColor = normalizeProductColor(product, initialColor);

  if (!product) {
    showNotFound();
    return;
  }

  renderColorOptions(product);
  renderProduct(product);
  renderRelated(product);
  applySoldOutState();
  prefillLoggedInUser();
}

initProductPage();

async function prefillLoggedInUser() {
  try {
    let response = await fetch("/api/profile", { cache: "no-store" });
    if (response.status === 401) {
      return;
    }
    if (!response.ok) {
      response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) return;
    }

    if (!response.ok) return;
    const payload = await response.json();
    if (!payload.user) return;

    if (fullNameInput) {
      fullNameInput.value = payload.user.fullName || fullNameInput.value || "";
    }
    if (phoneInput) {
      phoneInput.value = payload.user.phone || phoneInput.value || "";
    }
    if (addressInput) {
      addressInput.value = payload.user.address || addressInput.value || "";
    }
  } catch {
    // ignore
  }
}

sizeDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    const nextSize = dot.dataset.size;
    if (!nextSize) return;

    sizeValueInput.value = nextSize;
    sizeDots.forEach((item) => item.classList.toggle("active", item.dataset.size === nextSize));
  });
});

function renderColorOptions(currentProduct) {
  productColorSwatches.innerHTML = currentProduct.colors
    .map((code) => `
      <button
        type="button"
        class="color-dot ${code === selectedColor ? "active" : ""}"
        data-color="${code}"
        aria-label="${COLOR_LABELS[code] || code}"
        title="${COLOR_LABELS[code] || code}">
      </button>
    `)
    .join("");

  productColorSwatches.querySelectorAll(".color-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      const nextColorRaw = dot.dataset.color;
      if (!nextColorRaw) return;

      selectedColor = normalizeProductColor(currentProduct, nextColorRaw);

      productColorSwatches.querySelectorAll(".color-dot").forEach((item) => {
        item.classList.toggle("active", item.dataset.color === selectedColor);
      });

      renderProduct(currentProduct);
      renderRelated(currentProduct);
    });
  });
}

function renderProduct(currentProduct) {
  productGalleryEl.classList.toggle("is-sold-out", Boolean(currentProduct.soldOut));

  productNameEl.textContent = currentProduct.name;
  productDescEl.textContent = currentProduct.desc;

  const imageCandidates = getProductImageCandidates(currentProduct, selectedColor);
  productGalleryEl.innerHTML = `
    <div class="gallery-track" id="gallery-track">
      ${imageCandidates.map((imgPath) => `
        <div class="gallery-slide">
          <img src="${imgPath}" alt="${currentProduct.name}">
        </div>
      `).join("")}
    </div>
    <div class="gallery-dots" id="gallery-dots"></div>
  `;

  const track = document.getElementById("gallery-track");
  const dots = document.getElementById("gallery-dots");

  function getSlides() {
    return Array.from(track.querySelectorAll(".gallery-slide"));
  }

  function updateDots() {
    const slides = getSlides();
    dots.innerHTML = slides.map((_, i) => `<button class="gallery-dot" data-index="${i}" aria-label="Image ${i + 1}"></button>`).join("");

    const dotButtons = dots.querySelectorAll(".gallery-dot");
    dotButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
      });
    });

    updateActiveDot();
  }

  function updateActiveDot() {
    const slideCount = getSlides().length;
    if (!slideCount) return;

    const index = Math.round(track.scrollLeft / track.clientWidth);
    dots.querySelectorAll(".gallery-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  track.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      const slide = img.closest(".gallery-slide");
      if (slide) {
        slide.remove();
        updateDots();
      }
    });
  });

  track.addEventListener("scroll", updateActiveDot);

  track.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();

    const slides = getSlides();
    if (!slides.length) return;

    const currentIndex = Math.round(track.scrollLeft / track.clientWidth);
    const nextIndex = event.deltaY > 0
      ? Math.min(currentIndex + 1, slides.length - 1)
      : Math.max(currentIndex - 1, 0);

    track.scrollTo({ left: nextIndex * track.clientWidth, behavior: "smooth" });
  }, { passive: false });

  updateDots();
  updateOrderTotals();
}

function updateOrderTotals() {
  const amount = Math.max(1, Number(amountInput?.value || 1));
  if (amountInput) amountInput.value = String(amount);

  if (!product || product.soldOut) {
    productPriceEl.textContent = "Sold out";
    productSubtotalEl.textContent = "—";
    deliveryFeeEl.textContent = `${DEFAULT_DELIVERY_FEE} Dt`;
    orderTotalEl.textContent = "Sold out";
    return;
  }

  const subtotal = product.price * amount;
  const effectiveDelivery = DEFAULT_DELIVERY_FEE;
  const total = subtotal + effectiveDelivery;

  productPriceEl.textContent = `${total} Dt`;
  productSubtotalEl.textContent = `${subtotal} Dt`;
  deliveryFeeEl.textContent = `${effectiveDelivery} Dt`;
  orderTotalEl.textContent = `${total} Dt`;
}

function renderRelated(currentProduct) {
  const related = catalogProducts.filter((item) => item.wave === currentProduct.wave && item.id !== currentProduct.id);

  if (related.length === 0) {
    relatedProductsEl.innerHTML = `<div class="empty-wave">No other hoodies in this wave yet.</div>`;
    return;
  }

  relatedProductsEl.innerHTML = related.map((item) => `
    <article class="card related-card ${item.soldOut ? "is-sold-out" : ""}" data-product-id="${item.id}" data-product-color="${encodeURIComponent(normalizeProductColor(item, selectedColor))}" tabindex="0" role="link" aria-label="Open ${item.name}">
      ${item.soldOut ? '<div class="sold-out-badge">Sold out</div>' : ""}
      <img id="related-img-${item.id}" src="${getMainProductImage(item, normalizeProductColor(item, selectedColor))}" alt="${item.name}">
      <div class="meta">
        <div class="name">${item.name}</div>
        <div class="price">${item.price} Dt</div>
      </div>
      <div class="desc">${item.desc}</div>
      <div class="btn-row">
        <button class="btn primary" ${item.soldOut ? "disabled" : ""} onclick="window.location.href='product.html?id=${item.id}&color=${encodeURIComponent(normalizeProductColor(item, selectedColor))}'">${item.soldOut ? "Sold out" : "Buy now"}</button>
      </div>
    </article>
  `).join("");

  related.forEach((item) => {
    const color = normalizeProductColor(item, selectedColor);
    const imgEl = document.getElementById(`related-img-${item.id}`);
    if (!imgEl) return;
    setImageFallback(imgEl, getProductImageCandidates(item, color));
  });

  relatedProductsEl.querySelectorAll(".related-card").forEach((card) => {
    const openCard = () => {
      const productId = Number(card.dataset.productId);
      const productColor = card.dataset.productColor;
      const nextProduct = catalogProducts.find((item) => item.id === productId);
      if (!nextProduct || nextProduct.soldOut) return;

      window.location.href = `product.html?id=${productId}&color=${productColor}`;
    };

    card.addEventListener("click", (event) => {
      if (event.target.closest(".btn")) return;
      openCard();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCard();
    });
  });
}

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!product) return;
  const data = new FormData(orderForm);
  const size = data.get("size");
  const amount = Number(data.get("amount") || 1);
  const fullName = data.get("fullName");
  const phone = data.get("phone");
  const address = data.get("address");
  const note = data.get("note");
  const subtotal = product.price * amount;
  const effectiveDelivery = DEFAULT_DELIVERY_FEE;
  const total = subtotal + effectiveDelivery;

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: product.id,
      productName: product.name,
      color: COLOR_LABELS[selectedColor] || selectedColor,
      size,
      amount,
      unitPriceDt: product.price,
      deliveryFeeDt: effectiveDelivery,
      totalPriceDt: total,
      fullName,
      phone,
      address,
      note,
      paymentMethod: "cash_on_delivery"
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    orderConfirmation.textContent = payload.message || "Order failed. Try again.";
    orderConfirmation.style.display = "block";
    orderConfirmation.style.color = "#b91c1c";
    return;
  }

  const successParams = new URLSearchParams({
    orderId: String(payload.orderId || ""),
    fullName: String(fullName || ""),
    productName: String(product.name || "")
  });
  window.location.href = `order-success.html?${successParams.toString()}`;
});

amountInput?.addEventListener("input", updateOrderTotals);
