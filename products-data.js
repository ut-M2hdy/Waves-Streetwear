const COLOR_LABELS = {
  B: "Black",
  W: "White",
  Br: "Brown",
  P: "Pink",
  Grey: "Grey"
};

const products = [
  { id: 1, folder: 1, wave: "1stDrop", colors: ["W"], variantByColor: {}, name: "Lost In Your Gravity Hoodie", price: 69, desc: "Midweight fleece with gradient print." },
  { id: 2, folder: 2, wave: "1stDrop", colors: ["B", "W"], variantByColor: { W: "2nd%20post", B: "1st%20post" }, name: "Overthinking Hoodie", price: 69, desc: "Everyday pullover, soft brushed interior." },
  { id: 3, folder: 3, wave: "1stDrop", colors: ["B", "W"], variantByColor: { W: "2nd%20post", B: "1st%20post" }, name: "Ein El Hassoud Hoodie", price: 69, desc: "Cooling cotton blend with roomy hood." },
  { id: 4, folder: 4, wave: "1stDrop", colors: ["P"], variantByColor: {}, name: "Im Just A Girl Hoodie", price: 69, desc: "Water-repellent shell and soft lining." },
  { id: 5, folder: 5, wave: "1stDrop", colors: ["Br"], variantByColor: {}, soldOut: true, name: "Eyes Don't Lie Hoodie", price: 69, desc: "Neutral tone, relaxed drop-shoulder fit." },
  { id: 6, folder: 6, wave: "1stDrop", colors: ["W"], variantByColor: {}, name: "3rd Of December Hoodie", price: 69, desc: "Full-zip with hidden phone pocket." },
  { id: 7, folder: 7, wave: "1stDrop", colors: ["Br", "B", "W"], variantByColor: { Br: "1st%20post", B: "copy2", W: "2nd%20post" }, name: "Try & Cry Hoodie", price: 69, desc: "Triple-color drop with oversized relaxed fit." },

  { id: 8, path: "img/cairokee/1", wave: "CAIROKEE", colors: ["B", "W"], fileNamesByColor: { B: ["main.jpg", "2.jpg", "3.jpg"], W: ["main.jpg", "2.jpg", "3.jpg"] }, name: "Cairokee Hoodie", price: 75, desc: "Wave CAIROKEE edition." },
  { id: 9, path: "img/lemhaf/1", wave: "LEMHAF", colors: ["B"], fileNamesByColor: { B: ["main.jpg", "2.jpg", "3.jpg", "4.jpg"] }, name: "Lemhaf Hoodie", price: 75, desc: "Wave LEMHAF edition." },
  { id: 10, path: "img/upsidedown/1", wave: "UPSIDE DOWN", colors: ["B", "Grey"], fileNamesByColor: { B: ["main.jpg", "2.jpg", "3.jpg"], Grey: ["main.jpg", "2.jpg", "3.jpg"] }, name: "Upside Down Hoodie", price: 75, desc: "Wave UPSIDE DOWN edition." },
  { id: 11, path: "img/upsidedown/2", wave: "UPSIDE DOWN", colors: ["B", "W"], fileNamesByColor: { B: ["main.jpg"], W: ["main.jpg"] }, name: "Upside Down Hoodie II", price: 75, desc: "Wave UPSIDE DOWN second drop." }
];

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

  const baseRoot = product.path || `img/${product.folder}`;
  const base = `${baseRoot}/${safeColor}`;

  if (product.fileNamesByColor?.[safeColor]) {
    return product.fileNamesByColor[safeColor].map((fileName) => `${base}/${fileName}`);
  }

  const mainName = product.variantByColor?.[safeColor] || "1st%20post";

  return [
    `${base}/${mainName}.png`,
    `${base}/${mainName}%20front.png`,
    `${base}/${mainName}%20back.png`,
    `${base}/1st%20post.png`,
    `${base}/1st%20post%20front.png`,
    `${base}/1st%20post%20back.png`,
    `${base}/2nd%20post.png`,
    `${base}/2nd%20post%20front.png`,
    `${base}/2nd%20post%20back.png`,
    `${base}/copy2.png`
  ];
}

function getMainProductImage(product, colorCode) {
  return getProductImageCandidates(product, colorCode)[0];
}
