const COLOR_LABELS = {
  B: "Black",
  W: "White",
  Br: "Brown",
  P: "Pink",
  Grey: "Grey",
  BC: "Off White",
  Be: "Light Beige"
};

function parseColorImageMap(rawValue) {
  const map = {};
  const raw = String(rawValue || "").trim();
  if (!raw) return map;

  raw.split(/\r?\n+/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [color, images] = trimmed.split("=");
    if (!color || !images) return;
    const key = color.trim();
    const list = images
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (list.length) {
      map[key] = list;
    }
  });

  return map;
}

function normalizeProductColor(product, colorCode) {
  if (!product || !Array.isArray(product.colors) || product.colors.length === 0) return "W";
  return product.colors.includes(colorCode) ? colorCode : product.colors[0];
}

function getProductImageCandidates(product, colorCode) {
  const safeColor = normalizeProductColor(product, colorCode);

  const colorMap = parseColorImageMap(product?.colorImagesMap);
  if (Array.isArray(colorMap[safeColor]) && colorMap[safeColor].length) {
    return colorMap[safeColor];
  }

  if (product?.imageUrl) {
    return String(product.imageUrl)
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getMainProductImage(product, colorCode) {
  return getProductImageCandidates(product, colorCode)[0];
}

window.COLOR_LABELS = COLOR_LABELS;
window.parseColorImageMap = parseColorImageMap;
window.normalizeProductColor = normalizeProductColor;
window.getProductImageCandidates = getProductImageCandidates;
window.getMainProductImage = getMainProductImage;
