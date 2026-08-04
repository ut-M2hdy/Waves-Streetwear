const path = require("path");
const http = require("http");
const https = require("https");
const fs = require("fs/promises");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_DELIVERY_FEE_DT = Number(process.env.DEFAULT_DELIVERY_FEE_DT || 9);
const SEWING_COST_DT = Number(process.env.SEWING_COST_DT || 35);
const NTFY_TOPIC_URL = String(process.env.NTFY_TOPIC_URL || "https://ntfy.sh/waves-orders").trim();
const NTFY_ENABLED = String(process.env.NTFY_ENABLED || "true").toLowerCase() !== "false";
const SLACK_WEBHOOK_URL = String(process.env.SLACK_WEBHOOK_URL || "").trim();
const SLACK_ENABLED = String(process.env.SLACK_ENABLED || "true").toLowerCase() !== "false";
const SCENE_STEALER_SEWING_COST_DT = Number(process.env.SCENE_STEALER_SEWING_COST_DT || 25);
const PRODUCTS_CACHE_TTL_MS = Number(process.env.PRODUCTS_CACHE_TTL_MS || 30_000);
const KEEP_WARM_URL = String(process.env.KEEP_WARM_URL || "").trim();
const KEEP_WARM_INTERVAL_MS = Number(process.env.KEEP_WARM_INTERVAL_MS || 10 * 60 * 1000);

const productsCache = {
  data: null,
  fetchedAt: 0,
  refreshPromise: null
};

async function loadProducts() {
  await ensureProductsSchema();
  const [rows] = await pool.query(
    "SELECT id, name, price_cents, wave, colors_csv, main_color, sold_out, image_url, color_images_map, description FROM products ORDER BY id ASC"
  );
  productsCache.data = rows;
  productsCache.fetchedAt = Date.now();
  return rows;
}

function pingKeepWarm(url) {
  if (!url) return;
  try {
    const target = new URL(url);
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request(target, { method: "GET" }, (res) => {
      res.on("data", () => {});
      res.on("end", () => {});
    });
    req.on("error", () => {});
    req.end();
  } catch {
    // ignore malformed url
  }
}

function getDbSslConfig() {
  const sslRequired = ["1", "true", "yes", "required"].includes(String(process.env.DB_SSL_REQUIRED || "").toLowerCase());
  if (!sslRequired) return undefined;

  const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";
  const caRaw = String(process.env.DB_SSL_CA || "").trim();
  if (caRaw) {
    return {
      ca: caRaw.replace(/\\n/g, "\n"),
      rejectUnauthorized
    };
  }

  return { rejectUnauthorized };
}

app.set("trust proxy", 1);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER || "4NQ23e7TfJfS3FG.root",
  password: process.env.DB_PASSWORD || "GcTbFvXi6tOGRHiY",
  database: process.env.DB_NAME || "store_waves",
  ssl: getDbSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

let isDatabaseConnected = false;

async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    isDatabaseConnected = true;
  } catch {
    isDatabaseConnected = false;
  }
}

setInterval(() => {
  checkDatabaseConnection().catch(() => {
    isDatabaseConnected = false;
  });
}, 5_000);

setInterval(() => {
  if (!isDatabaseConnected) return;
  autoVerifyDeliveredContacts().catch(() => {
    // ignore periodic auto-verify errors
  });
}, 5 * 60 * 1000);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "waves-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use((req, res, next) => {
  if (isDatabaseConnected || !req.path.startsWith("/api/")) {
    return next();
  }

  return res.status(503).json({
    message: "The website is down for maintenance, comeback later."
  });
});

// Serve React production build from client/dist
app.use("/img", express.static(path.join(__dirname, "img")));
app.use(express.static(path.join(__dirname, "client", "dist")));

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    address: user.address,
    role: user.role
  };
}

function isValidFullName(fullName) {
  const value = String(fullName || "").trim();
  if (!value) return false;
  if (/\d/.test(value)) return false;
  return value.includes(" ");
}

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function isValidTunisiaPhone(phone) {
  return /^\+216\d{8}$/.test(normalizePhone(phone));
}

function getSewingCostPerItem(wave) {
  return String(wave || "").trim().toLowerCase() === "scene stealer"
    ? SCENE_STEALER_SEWING_COST_DT
    : SEWING_COST_DT;
}

function sendNtfyNotification({ title, message, priority = "high" }) {
  if (!NTFY_ENABLED || !NTFY_TOPIC_URL) return;
  let url;
  try {
    url = new URL(NTFY_TOPIC_URL);
  } catch {
    return;
  }

  const https = require("https");
  const options = {
    method: "POST",
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": title || "New order",
      "Priority": priority
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", () => {});
  });
  req.on("error", () => {});
  req.write(String(message || ""));
  req.end();
}

function sendSlackNotification({ text, blocks, color = "#2eb67d" }) {
  if (!SLACK_ENABLED || !SLACK_WEBHOOK_URL) return;
  let url;
  try {
    url = new URL(SLACK_WEBHOOK_URL);
  } catch {
    return;
  }

  const https = require("https");
  const payload = JSON.stringify({
    text: String(text || ""),
    attachments: blocks?.length
      ? [{ color, blocks }]
      : undefined
  });
  const options = {
    method: "POST",
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", () => {});
  });
  req.on("error", () => {});
  req.write(payload);
  req.end();
}

const ALLOWED_ORDER_SIZES = new Set(["S", "M", "L", "XL", "XXL"]);
const COLOR_CODE_TO_LABEL = {
  B: "Black",
  W: "White",
  Br: "Brown",
  P: "Pink",
  Grey: "Grey",
  BC: "Off White",
  Be: "Light Beige"
};
const COLOR_HEX_TO_CODE = {
  "#e7e7db": "BC",
  "#e7dcbe": "Be"
};
const COLOR_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(COLOR_CODE_TO_LABEL).map(([code, label]) => [String(label).toLowerCase(), code])
);

function normalizeColorCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  return COLOR_HEX_TO_CODE[lower] || raw;
}

function parseAllowedProductColors(colorsCsv, mainColor) {
  const allowed = new Set(Object.keys(COLOR_CODE_TO_LABEL));
  const parsed = String(colorsCsv || "")
    .split(",")
    .map((item) => normalizeColorCode(item))
    .filter((item) => allowed.has(item));

  if (parsed.length) return parsed;
  if (allowed.has(String(mainColor || ""))) return [String(mainColor)];
  return ["W"];
}

function getPasswordLevel(password) {
  const value = String(password || "");
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return "low";
  if (score <= 3) return "mid";
  return "strong";
}

async function ensureUsersAddressColumn() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'address'");
    if (!rows.length) {
      await pool.query("ALTER TABLE users ADD COLUMN address TEXT NULL AFTER phone");
    }
  } catch (error) {
    // ignore auto-migration errors here; endpoints will return their own messages if needed
  }
}

async function ensureUsersFlagsColumns() {
  try {
    const [verifiedRows] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_verified'");
    if (!verifiedRows.length) {
      await pool.query("ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER role");
    }

    const [blacklistedRows] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_blacklisted'");
    if (!blacklistedRows.length) {
      await pool.query("ALTER TABLE users ADD COLUMN is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_verified");
    }
  } catch {
    // ignore auto-migration errors here; endpoints will return their own messages if needed
  }
}

async function ensureGuestProfilesSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS guest_profiles (
      phone VARCHAR(30) NOT NULL,
      full_name VARCHAR(160) NULL,
      address TEXT NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_blacklisted TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (phone)
    ) ENGINE=InnoDB`
  );
}

async function ensureDeletedOrdersSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS orders_deleted (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_order_id INT UNSIGNED NULL,
      product_id INT UNSIGNED NULL,
      product_name VARCHAR(180) NULL,
      color VARCHAR(30) NULL,
      size VARCHAR(10) NULL,
      amount INT NULL,
      unit_price_dt DECIMAL(10,2) NULL,
      delivery_fee_dt DECIMAL(10,2) NULL,
      total_price_dt DECIMAL(10,2) NULL,
      full_name VARCHAR(160) NULL,
      phone VARCHAR(30) NULL,
      address TEXT NULL,
      note TEXT,
      status VARCHAR(40) NULL,
      created_at DATETIME NULL,
      delivered_at DATETIME NULL,
      cancelled_at DATETIME NULL,
      returned_at DATETIME NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_by_user_id INT UNSIGNED NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`
  );
}

async function ensureDeletedUsersSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users_deleted (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_user_id INT UNSIGNED NULL,
      full_name VARCHAR(160) NULL,
      phone VARCHAR(30) NULL,
      address TEXT NULL,
      role VARCHAR(30) NULL,
      created_at DATETIME NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_by_user_id INT UNSIGNED NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`
  );
}

async function ensureProductsSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      price_cents INT NOT NULL,
      wave VARCHAR(40) NOT NULL DEFAULT '1stDrop',
      colors_csv VARCHAR(120) NOT NULL DEFAULT 'W',
      main_color VARCHAR(20) NOT NULL DEFAULT 'W',
      sold_out TINYINT(1) NOT NULL DEFAULT 0,
      image_url LONGTEXT,
      color_images_map LONGTEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`
  );

  const [columns] = await pool.query("SHOW COLUMNS FROM products");
  const columnMap = new Map(columns.map((c) => [String(c.Field).toLowerCase(), c]));

  const hasPriceCents = columnMap.has("price_cents");
  const hasPriceDt = columnMap.has("price_dt");

  if (!hasPriceCents && hasPriceDt) {
    await pool.query("ALTER TABLE products ADD COLUMN price_cents INT NULL AFTER name");
    await pool.query("UPDATE products SET price_cents = ROUND(price_dt * 100) WHERE price_cents IS NULL");
    await pool.query("ALTER TABLE products MODIFY price_cents INT NOT NULL");
  } else if (!hasPriceCents) {
    await pool.query("ALTER TABLE products ADD COLUMN price_cents INT NOT NULL DEFAULT 0 AFTER name");
  }

  if (!columnMap.has("image_url")) {
    await pool.query("ALTER TABLE products ADD COLUMN image_url LONGTEXT NULL");
  } else {
    await pool.query("ALTER TABLE products MODIFY image_url LONGTEXT NULL");
  }
  if (!columnMap.has("color_images_map")) {
    await pool.query("ALTER TABLE products ADD COLUMN color_images_map LONGTEXT NULL AFTER image_url");
  } else {
    await pool.query("ALTER TABLE products MODIFY color_images_map LONGTEXT NULL");
  }
  if (!columnMap.has("wave")) {
    await pool.query("ALTER TABLE products ADD COLUMN wave VARCHAR(40) NOT NULL DEFAULT '1stDrop' AFTER price_cents");
  }
  if (!columnMap.has("colors_csv")) {
    await pool.query("ALTER TABLE products ADD COLUMN colors_csv VARCHAR(120) NOT NULL DEFAULT 'W' AFTER wave");
  }
  if (!columnMap.has("main_color")) {
    await pool.query("ALTER TABLE products ADD COLUMN main_color VARCHAR(20) NOT NULL DEFAULT 'W' AFTER colors_csv");
  }
  if (!columnMap.has("sold_out")) {
    await pool.query("ALTER TABLE products ADD COLUMN sold_out TINYINT(1) NOT NULL DEFAULT 0 AFTER colors_csv");
  }
  if (!columnMap.has("description")) {
    await pool.query("ALTER TABLE products ADD COLUMN description TEXT NULL");
  }
  if (!columnMap.has("created_at")) {
    await pool.query("ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  }
}

async function ensureRevenueAdjustmentsSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS revenue_adjustments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(180) NOT NULL,
      amount_dt DECIMAL(10,2) NOT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      moved_to_month VARCHAR(7) NULL,
      moved_at DATETIME NULL,
      PRIMARY KEY (id),
      CONSTRAINT fk_revenue_adjustments_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`
  );

  const [columns] = await pool.query("SHOW COLUMNS FROM revenue_adjustments");
  const columnMap = new Map((columns || []).map((col) => [col.Field, true]));

  if (!columnMap.has("moved_to_month")) {
    await pool.query("ALTER TABLE revenue_adjustments ADD COLUMN moved_to_month VARCHAR(7) NULL AFTER created_at");
  }
  if (!columnMap.has("moved_at")) {
    await pool.query("ALTER TABLE revenue_adjustments ADD COLUMN moved_at DATETIME NULL AFTER moved_to_month");
  }
}

async function ensureRevenueAdjustmentsDeletedSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS revenue_adjustments_deleted (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_adjustment_id INT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      amount_dt DECIMAL(10,2) NOT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NULL,
      deleted_by_user_id INT UNSIGNED NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_revenue_deleted_original_id (original_adjustment_id),
      KEY idx_revenue_deleted_deleted_at (deleted_at),
      CONSTRAINT fk_revenue_deleted_created_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
      CONSTRAINT fk_revenue_deleted_deleted_user FOREIGN KEY (deleted_by_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`
  );
}

async function ensureOrdersDeliveredAtColumn() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM orders LIKE 'delivered_at'");
    if (!rows.length) {
      await pool.query("ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL AFTER status");
    }
  } catch {
    // keep backward compatibility if orders table does not exist yet
  }
}

async function ensureOrdersCancelledAtColumn() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM orders LIKE 'cancelled_at'");
    if (!rows.length) {
      await pool.query("ALTER TABLE orders ADD COLUMN cancelled_at DATETIME NULL AFTER delivered_at");
    }

    await pool.query(
      "UPDATE orders SET cancelled_at = COALESCE(cancelled_at, created_at) WHERE status = 'cancelled'"
    );
  } catch {
    // keep backward compatibility if orders table does not exist yet
  }
}

async function ensureOrdersReturnedAtColumn() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM orders LIKE 'returned_at'");
    if (!rows.length) {
      await pool.query("ALTER TABLE orders ADD COLUMN returned_at DATETIME NULL AFTER cancelled_at");
    }

    await pool.query(
      "UPDATE orders SET returned_at = COALESCE(returned_at, created_at) WHERE status = 'returned'"
    );
  } catch {
    // keep backward compatibility if orders table does not exist yet
  }
}

async function autoVerifyDeliveredContacts() {
  await ensureUsersFlagsColumns();
  await ensureGuestProfilesSchema();

  await pool.query(
    `UPDATE users u
     INNER JOIN (
       SELECT DISTINCT user_id
       FROM orders
       WHERE user_id IS NOT NULL
         AND status = 'delivered'
         AND delivered_at IS NOT NULL
         AND delivered_at <= (NOW() - INTERVAL 24 HOUR)
     ) d ON d.user_id = u.id
     SET u.is_verified = 1
     WHERE COALESCE(u.is_verified, 0) <> 1`
  );

  await pool.query(
    `INSERT INTO guest_profiles (phone, full_name, address, is_verified, is_blacklisted)
     SELECT
       TRIM(o.phone) AS phone,
       MAX(NULLIF(TRIM(o.full_name), '')) AS full_name,
       MAX(NULLIF(TRIM(o.address), '')) AS address,
       1 AS is_verified,
       0 AS is_blacklisted
     FROM orders o
     WHERE o.user_id IS NULL
       AND o.status = 'delivered'
       AND o.delivered_at IS NOT NULL
       AND o.delivered_at <= (NOW() - INTERVAL 24 HOUR)
       AND TRIM(COALESCE(o.phone, '')) <> ''
     GROUP BY TRIM(o.phone)
     ON DUPLICATE KEY UPDATE
       is_verified = 1,
       full_name = COALESCE(NULLIF(VALUES(full_name), ''), guest_profiles.full_name),
       address = COALESCE(NULLIF(VALUES(address), ''), guest_profiles.address)`
  );
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please login first." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Please login first." });
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only." });
  }
  next();
}

function isValidMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

app.get("/api/health", (_req, res) => {
  if (!isDatabaseConnected) {
    return res.status(503).json({
      ok: false,
      message: "The website is down for maintenance, comeback later."
    });
  }

  res.json({ ok: true });
});

async function walkImageFiles(dirPath, rootPath) {
  const output = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkImageFiles(fullPath, rootPath);
      output.push(...nested);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) continue;

    const relativePath = path.relative(rootPath, fullPath).split(path.sep).join("/");
    output.push(relativePath);
  }

  return output;
}

app.get("/api/admin/image-files", requireAdmin, async (_req, res) => {
  try {
    const imgRoot = path.join(__dirname, "img");
    const files = await walkImageFiles(imgRoot, __dirname);
    files.sort((a, b) => a.localeCompare(b));
    res.json({ files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not list image files." });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    const now = Date.now();
    const isFresh = productsCache.data && now - productsCache.fetchedAt < PRODUCTS_CACHE_TTL_MS;

    if (isFresh) {
      return res.json({ products: productsCache.data, cached: true });
    }

    if (!productsCache.refreshPromise) {
      productsCache.refreshPromise = loadProducts()
        .catch((error) => {
          console.error(error);
          return null;
        })
        .finally(() => {
          productsCache.refreshPromise = null;
        });
    }

    if (productsCache.data) {
      return res.json({ products: productsCache.data, cached: true, stale: true });
    }

    const rows = await productsCache.refreshPromise;
    if (rows) {
      return res.json({ products: rows });
    }

    return res.status(500).json({ message: "Could not fetch products." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch products." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    await ensureUsersAddressColumn();

    const { fullName, phone, address, password, confirmPassword } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const normalizedAddress = String(address || "").trim();

    if (!fullName || !phone || !address || !password || !confirmPassword) {
      return res.status(400).json({ message: "Full name, phone, address, password and confirmation are required." });
    }

    if (!isValidFullName(fullName)) {
      return res.status(400).json({ message: "Full name must include a space and cannot contain numbers." });
    }

    if (!isValidTunisiaPhone(normalizedPhone)) {
      return res.status(400).json({ message: "Phone must be in format +216XXXXXXXX." });
    }

    if (!normalizedAddress) {
      return res.status(400).json({ message: "Address is required." });
    }

    if (String(password) !== String(confirmPassword)) {
      return res.status(400).json({ message: "Password confirmation does not match." });
    }

    const passwordLevel = getPasswordLevel(password);
    if (passwordLevel === "low") {
      return res.status(400).json({ message: "Password security is low. Use a mid or strong password." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE phone = ? LIMIT 1", [normalizedPhone]);
    if (existing.length) {
      return res.status(409).json({ message: "Phone already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (full_name, phone, address, password_hash, role) VALUES (?, ?, ?, ?, 'user')",
      [String(fullName).trim(), normalizedPhone, normalizedAddress, passwordHash]
    );

    const [rows] = await pool.query("SELECT id, full_name, phone, address, role FROM users WHERE id = ?", [result.insertId]);
    const user = sanitizeUser(rows[0]);

    req.session.user = user;

    res.status(201).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    await ensureUsersAddressColumn();

    const { phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !password) {
      return res.status(400).json({ message: "Phone and password are required." });
    }

    if (!isValidTunisiaPhone(normalizedPhone)) {
      return res.status(400).json({ message: "Phone must be in format +216XXXXXXXX." });
    }

    const [rows] = await pool.query(
      "SELECT id, full_name, phone, address, role, password_hash FROM users WHERE phone = ? LIMIT 1",
      [normalizedPhone]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const userRow = rows[0];
    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = sanitizeUser(userRow);
    req.session.user = user;

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.session.user });
});

app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    await ensureUsersAddressColumn();

    const [rows] = await pool.query(
      "SELECT id, full_name, phone, address, role FROM users WHERE id = ? LIMIT 1",
      [req.session.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = sanitizeUser(rows[0]);
    req.session.user = user;
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load profile." });
  }
});

app.patch("/api/profile/contact", requireAuth, async (req, res) => {
  try {
    await ensureUsersAddressColumn();

    const { phone, address, password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required to edit phone or address." });
    }

    const [rows] = await pool.query(
      "SELECT id, full_name, phone, address, role, password_hash FROM users WHERE id = ? LIMIT 1",
      [req.session.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const userRow = rows[0];
    const isMatch = await bcrypt.compare(String(password), userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password." });
    }

    const nextPhone = phone ? normalizePhone(phone) : userRow.phone;
    const nextAddress = address ? String(address).trim() : userRow.address;

    if (!isValidTunisiaPhone(nextPhone)) {
      return res.status(400).json({ message: "Phone must be in format +216XXXXXXXX." });
    }

    if (!nextAddress) {
      return res.status(400).json({ message: "Address is required." });
    }

    if (nextPhone !== userRow.phone) {
      const [existing] = await pool.query("SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1", [nextPhone, userRow.id]);
      if (existing.length) {
        return res.status(409).json({ message: "Phone already registered." });
      }
    }

    await pool.query("UPDATE users SET phone = ?, address = ? WHERE id = ?", [nextPhone, nextAddress, userRow.id]);

    const user = {
      id: userRow.id,
      full_name: userRow.full_name,
      phone: nextPhone,
      address: nextAddress,
      role: userRow.role
    };
    req.session.user = sanitizeUser(user);

    res.json({ user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update contact info." });
  }
});

app.patch("/api/profile/password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Old password and new password confirmation are required." });
    }

    if (String(newPassword) !== String(confirmNewPassword)) {
      return res.status(400).json({ message: "New password confirmation does not match." });
    }

    const level = getPasswordLevel(newPassword);
    if (level === "low") {
      return res.status(400).json({ message: "New password security is low. Use a mid or strong password." });
    }

    const [rows] = await pool.query("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [req.session.user.id]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(String(oldPassword), rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, rows[0].id]);

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update password." });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const {
      productId,
      color,
      size,
      amount,
      fullName,
      phone,
      address,
      note
    } = req.body;

    if (!productId || !color || !size || !amount || !fullName || !address) {
      return res.status(400).json({ message: "Missing order fields." });
    }

    const productIdNumber = Number(productId);
    if (!Number.isInteger(productIdNumber) || productIdNumber <= 0) {
      return res.status(400).json({ message: "Invalid product." });
    }

    const selectedSize = String(size || "").trim().toUpperCase();
    if (!ALLOWED_ORDER_SIZES.has(selectedSize)) {
      return res.status(400).json({ message: "Invalid size." });
    }

    const amountNumber = Number(amount);
    if (!Number.isInteger(amountNumber) || amountNumber < 1 || amountNumber > 20) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const cleanAddress = String(address || "").trim();
    if (!cleanAddress || cleanAddress.length > 500) {
      return res.status(400).json({ message: "Address is required and must be valid." });
    }

    const cleanNote = String(note || "").trim();
    if (cleanNote.length > 600) {
      return res.status(400).json({ message: "Note is too long." });
    }

    await ensureProductsSchema();
    const [productRows] = await pool.query(
      "SELECT id, name, price_cents, colors_csv, main_color, sold_out FROM products WHERE id = ? LIMIT 1",
      [productIdNumber]
    );

    if (!productRows.length) {
      return res.status(404).json({ message: "Product not found." });
    }

    const dbProduct = productRows[0];
    if (Number(dbProduct.sold_out || 0) === 1) {
      return res.status(400).json({ message: "This product is sold out." });
    }

    const unitPriceNumber = Number(dbProduct.price_cents || 0) / 100;
    if (!Number.isFinite(unitPriceNumber) || unitPriceNumber <= 0) {
      return res.status(400).json({ message: "Invalid product price." });
    }

    const incomingColor = String(color || "").trim();
    const normalizedIncoming = normalizeColorCode(incomingColor);
    const incomingCode = COLOR_CODE_TO_LABEL[normalizedIncoming]
      ? normalizedIncoming
      : (COLOR_LABEL_TO_CODE[incomingColor.toLowerCase()] || "");

    const allowedColors = parseAllowedProductColors(dbProduct.colors_csv, dbProduct.main_color);
    if (!incomingCode || !allowedColors.includes(incomingCode)) {
      return res.status(400).json({ message: "Invalid color." });
    }

    const safeColorLabel = COLOR_CODE_TO_LABEL[incomingCode] || incomingCode;
    const safeProductName = String(dbProduct.name || "").trim();
    if (!safeProductName) {
      return res.status(400).json({ message: "Invalid product name." });
    }

    const userId = req.session.user?.id || null;
    let resolvedPhone = phone || "";

    if (!resolvedPhone && userId) {
      const [userRows] = await pool.query("SELECT phone FROM users WHERE id = ?", [userId]);
      resolvedPhone = userRows[0]?.phone || "";
    }

    if (!resolvedPhone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    if (!isValidFullName(fullName)) {
      return res.status(400).json({ message: "Full name must contain a space and no numbers." });
    }

    if (!isValidTunisiaPhone(resolvedPhone)) {
      return res.status(400).json({ message: "Phone must be +216 followed by 8 numbers." });
    }

    const effectiveDeliveryFee = DEFAULT_DELIVERY_FEE_DT;
    const effectiveTotalPrice = (unitPriceNumber * amountNumber) + effectiveDeliveryFee;

    const [result] = await pool.query(
      `INSERT INTO orders
       (user_id, product_id, product_name, color, size, amount, unit_price_dt, delivery_fee_dt, total_price_dt, full_name, phone, address, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        productIdNumber,
        safeProductName,
        safeColorLabel,
        selectedSize,
        amountNumber,
        unitPriceNumber,
        effectiveDeliveryFee,
        effectiveTotalPrice,
        fullName,
        resolvedPhone,
        cleanAddress,
        cleanNote || null
      ]
    );

    const orderId = Number(result.insertId || 0);
    const totalDt = Number(effectiveTotalPrice || 0).toFixed(2);
    sendNtfyNotification({
      title: "New order",
      message: `#${orderId} ${safeProductName}\nColor: ${safeColorLabel} • Size: ${selectedSize} • Amount: ${amountNumber}\nTotal: ${totalDt} Dt\nBuyer: ${fullName}\nPhone: ${resolvedPhone}\nAddress: ${cleanAddress}`
    });
    sendSlackNotification({
      text: `<!channel> New order #${orderId} - ${safeProductName}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🧾 New order #${orderId}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Product:* ${safeProductName}`
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Color*\n${safeColorLabel}` },
            { type: "mrkdwn", text: `*Size*\n${selectedSize}` },
            { type: "mrkdwn", text: `*Amount*\n${amountNumber}` },
            { type: "mrkdwn", text: `*Total*\n${totalDt} Dt` }
          ]
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Buyer*\n${fullName}` },
            { type: "mrkdwn", text: `*Phone*\n${resolvedPhone}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Address:*\n${cleanAddress}`
          }
        }
      ]
    });

    res.status(201).json({ orderId: orderId || result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not create order." });
  }
});

app.get("/api/orders/my", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, product_name, color, size, amount, unit_price_dt, delivery_fee_dt, total_price_dt, status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY id DESC`,
      [req.session.user.id]
    );

    res.json({ orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch history." });
  }
});

app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
  try {
    await autoVerifyDeliveredContacts();
    const [[ordersCountRow]] = await pool.query("SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('cancelled', 'returned')");
    const [[pendingRow]] = await pool.query("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'");
    const [[salesRow]] = await pool.query("SELECT COALESCE(SUM(unit_price_dt * amount), 0) AS total FROM orders WHERE status = 'delivered'");
    const [[monthOrdersRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM orders WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')"
    );
    const [[monthSalesRow]] = await pool.query(
      "SELECT COALESCE(SUM(unit_price_dt * amount), 0) AS total FROM orders WHERE status = 'delivered' AND DATE_FORMAT(COALESCE(delivered_at, created_at), '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')"
    );

    res.json({
      ordersCount: Number(ordersCountRow.count || 0),
      pendingCount: Number(pendingRow.count || 0),
      totalSalesDt: Number(salesRow.total || 0),
      monthOrdersCount: Number(monthOrdersRow.count || 0),
      monthSalesDt: Number(monthSalesRow.total || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch admin summary." });
  }
});

app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  try {
    await ensureOrdersDeliveredAtColumn();
    await ensureOrdersCancelledAtColumn();
    await ensureOrdersReturnedAtColumn();
    await autoVerifyDeliveredContacts();
    await ensureUsersFlagsColumns();
    await ensureGuestProfilesSchema();
    const [rows] = await pool.query(
            `SELECT o.id, o.user_id, o.product_name, o.color, o.size, o.amount, o.unit_price_dt, o.delivery_fee_dt, o.total_price_dt, o.note, o.status, o.delivered_at, o.cancelled_at, o.returned_at, o.created_at,
              o.full_name AS order_full_name, o.phone AS order_phone, o.address AS order_address,
              p.image_url AS product_image_url,
              u.full_name AS account_name, u.phone AS account_phone, u.address AS account_address,
              COALESCE(u.is_verified, gp.is_verified, 0) AS contact_is_verified,
              COALESCE(u.is_blacklisted, gp.is_blacklisted, 0) AS contact_is_blacklisted
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN guest_profiles gp ON gp.phone = o.phone AND o.user_id IS NULL
       ORDER BY o.id DESC`
    );

    res.json({ orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch orders." });
  }
});

app.get("/api/admin/orders/deleted", requireAdmin, async (_req, res) => {
  try {
    await ensureDeletedOrdersSchema();
    const [rows] = await pool.query(
      `SELECT d.id, d.original_order_id, d.product_name, d.color, d.size, d.amount,
              d.unit_price_dt, d.delivery_fee_dt, d.total_price_dt, d.full_name, d.phone, d.address,
              d.status, d.created_at, d.deleted_at, u.full_name AS deleted_by_name
       FROM orders_deleted d
       LEFT JOIN users u ON u.id = d.deleted_by_user_id
       ORDER BY d.id DESC`
    );

    res.json({
      orders: rows.map((row) => ({
        id: Number(row.original_order_id || row.id || 0),
        productName: row.product_name || "",
        color: row.color || "",
        size: row.size || "",
        amount: row.amount ?? "",
        unitPriceDt: row.unit_price_dt ?? 0,
        deliveryFeeDt: row.delivery_fee_dt ?? 0,
        totalPriceDt: row.total_price_dt ?? 0,
        fullName: row.full_name || "",
        phone: row.phone || "",
        address: row.address || "",
        status: row.status || "",
        createdAt: row.created_at || null,
        deletedAt: row.deleted_at || null,
        deletedByName: row.deleted_by_name || ""
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch deleted orders." });
  }
});

app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Order id is required." });
    }

    await ensureDeletedOrdersSchema();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found." });
    }

    const order = rows[0];
    await connection.query(
      `INSERT INTO orders_deleted
       (original_order_id, product_id, product_name, color, size, amount, unit_price_dt, delivery_fee_dt, total_price_dt,
        full_name, phone, address, note, status, created_at, delivered_at, cancelled_at, returned_at, deleted_by_user_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(order.id),
        order.product_id || null,
        order.product_name || null,
        order.color || null,
        order.size || null,
        order.amount || null,
        order.unit_price_dt || null,
        order.delivery_fee_dt || null,
        order.total_price_dt || null,
        order.full_name || null,
        order.phone || null,
        order.address || null,
        order.note || null,
        order.status || null,
        order.created_at || null,
        order.delivered_at || null,
        order.cancelled_at || null,
        order.returned_at || null,
        req.session.user?.id ? Number(req.session.user.id) : null
      ]
    );

    await connection.query("DELETE FROM orders WHERE id = ?", [id]);
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    res.status(500).json({ message: "Could not delete order." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get("/api/admin/sales/monthly", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
              COUNT(*) AS orders_count,
              COALESCE(SUM(unit_price_dt * amount), 0) AS sales_dt
       FROM orders
       WHERE status = 'delivered'
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month_key DESC`
    );

    res.json({
      months: rows.map((row) => ({
        monthKey: row.month_key,
        ordersCount: Number(row.orders_count || 0),
        salesDt: Number(row.sales_dt || 0)
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch monthly sales." });
  }
});

app.get("/api/admin/sales/monthly/:month", requireAdmin, async (req, res) => {
  try {
    const monthKey = String(req.params.month || "").trim();
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM." });
    }

    const [rows] = await pool.query(
      `SELECT id, product_name, color, size, amount, unit_price_dt, delivery_fee_dt, total_price_dt, status, created_at
       FROM orders
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
         AND status = 'delivered'
       ORDER BY created_at DESC, id DESC`,
      [monthKey]
    );

    res.json({ monthKey, orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch monthly sales details." });
  }
});

app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    await ensureOrdersDeliveredAtColumn();
    await ensureOrdersCancelledAtColumn();
    await ensureOrdersReturnedAtColumn();

    const id = Number(req.params.id);
    const requestedStatus = String(req.body?.status || "").trim().toLowerCase();
    const allowedStatuses = new Set(["pending", "confirmed", "delivered", "returned", "cancelled"]);

    if (!id || !requestedStatus) {
      return res.status(400).json({ message: "Order id and status are required." });
    }
    if (!allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    const [rows] = await pool.query(
      "SELECT status, delivered_at, cancelled_at, returned_at FROM orders WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Order not found." });
    }

    const currentStatus = String(rows[0].status || "").trim().toLowerCase();
    const deliveredAt = rows[0].delivered_at ? new Date(rows[0].delivered_at) : null;
    const cancelledAt = rows[0].cancelled_at ? new Date(rows[0].cancelled_at) : null;
    const returnedAt = rows[0].returned_at ? new Date(rows[0].returned_at) : null;
    const isDeliveredLocked = currentStatus === "delivered"
      && deliveredAt
      && (Date.now() - deliveredAt.getTime() >= 24 * 60 * 60 * 1000);
    const isCancelledLocked = currentStatus === "cancelled"
      && cancelledAt
      && (Date.now() - cancelledAt.getTime() >= 24 * 60 * 60 * 1000);
    const isReturnedLocked = currentStatus === "returned"
      && returnedAt
      && (Date.now() - returnedAt.getTime() >= 24 * 60 * 60 * 1000);

    if (isDeliveredLocked && requestedStatus !== "delivered") {
      return res.status(400).json({
        message: "Delivered status is locked after 24 hours and cannot be changed."
      });
    }

    if (isCancelledLocked && requestedStatus !== "cancelled") {
      return res.status(400).json({
        message: "Cancelled status is locked after 24 hours and cannot be changed."
      });
    }

    if (isReturnedLocked && requestedStatus !== "returned") {
      return res.status(400).json({
        message: "Returned status is locked after 24 hours and cannot be changed."
      });
    }

    if (currentStatus === requestedStatus) {
      return res.json({ ok: true });
    }

    if (requestedStatus === "delivered") {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NOW(), cancelled_at = NULL, returned_at = NULL WHERE id = ?", [requestedStatus, id]);
    } else if (requestedStatus === "cancelled") {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NULL, cancelled_at = NOW(), returned_at = NULL WHERE id = ?", [requestedStatus, id]);
    } else if (requestedStatus === "returned") {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NULL, cancelled_at = NULL, returned_at = NOW() WHERE id = ?", [requestedStatus, id]);
    } else {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NULL, cancelled_at = NULL, returned_at = NULL WHERE id = ?", [requestedStatus, id]);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update order status." });
  }
});

app.patch("/api/admin/orders/:id/delivery", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rawEnabled = req.body?.enabled;
    const enabled = rawEnabled === true || rawEnabled === "true" || rawEnabled === 1 || rawEnabled === "1";

    if (!id) {
      return res.status(400).json({ message: "Order id is required." });
    }

    const [rows] = await pool.query(
      "SELECT unit_price_dt, amount FROM orders WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Order not found." });
    }

    const unitPrice = Number(rows[0].unit_price_dt || 0);
    const amount = Number(rows[0].amount || 0);
    const deliveryFee = enabled ? DEFAULT_DELIVERY_FEE_DT : 0;
    const totalPrice = (unitPrice * amount) + deliveryFee;

    await pool.query(
      "UPDATE orders SET delivery_fee_dt = ?, total_price_dt = ? WHERE id = ?",
      [deliveryFee, totalPrice, id]
    );

    res.json({
      ok: true,
      deliveryEnabled: enabled,
      deliveryFeeDt: deliveryFee,
      totalPriceDt: totalPrice
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update delivery fee." });
  }
});

app.get("/api/admin/products", requireAdmin, async (_req, res) => {
  try {
    await ensureProductsSchema();
    const [rows] = await pool.query("SELECT id, name, price_cents, wave, colors_csv, main_color, sold_out, image_url, color_images_map, description FROM products ORDER BY id DESC");
    res.json({ products: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch products.", details: error.message });
  }
});

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  try {
    await autoVerifyDeliveredContacts();
    await ensureUsersFlagsColumns();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.address, u.role, u.is_verified, u.is_blacklisted, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
       FROM users u
       ORDER BY u.id DESC`
    );
    res.json({ users: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch users." });
  }
});

app.get("/api/admin/guest-users", requireAdmin, async (_req, res) => {
  try {
    await autoVerifyDeliveredContacts();
    await ensureGuestProfilesSchema();

    const [orderRows] = await pool.query(
      `SELECT id, phone, full_name, address, created_at
       FROM orders
       WHERE user_id IS NULL
       ORDER BY created_at DESC, id DESC`
    );

    const byPhone = new Map();
    orderRows.forEach((row) => {
      const phone = String(row.phone || "").trim();
      if (!phone) return;
      const currentName = String(row.full_name || "").trim();
      const currentNameKey = currentName.toLowerCase();

      const existing = byPhone.get(phone);
      if (!existing) {
        const namesHistory = currentName ? [currentName] : [];
        const namesSeen = new Set(currentName ? [currentNameKey] : []);
        byPhone.set(phone, {
          phone,
          full_name: row.full_name || "-",
          names_history: namesHistory,
          _names_seen: namesSeen,
          address: row.address || "",
          latest_order_at: row.created_at,
          orders_count: 1
        });
        return;
      }

      existing.orders_count += 1;
      if (currentName && !existing._names_seen.has(currentNameKey)) {
        existing.names_history.push(currentName);
        existing._names_seen.add(currentNameKey);
      }
    });

    const phones = Array.from(byPhone.keys());
    if (!phones.length) {
      return res.json({ users: [] });
    }

    const placeholders = phones.map(() => "?").join(",");
    const [profileRows] = await pool.query(
      `SELECT phone, is_verified, is_blacklisted
       FROM guest_profiles
       WHERE phone IN (${placeholders})`,
      phones
    );

    const profileMap = new Map(profileRows.map((row) => [String(row.phone), row]));

    const users = phones.map((phone) => {
      const base = byPhone.get(phone);
      const profile = profileMap.get(phone);
      return {
        phone,
        full_name: base?.full_name || "-",
        names_history: Array.isArray(base?.names_history) ? base.names_history : [],
        address: base?.address || "",
        latest_order_at: base?.latest_order_at || null,
        orders_count: Number(base?.orders_count || 0),
        is_verified: Number(profile?.is_verified || 0),
        is_blacklisted: Number(profile?.is_blacklisted || 0)
      };
    }).sort((a, b) => {
      const aTime = a.latest_order_at ? new Date(a.latest_order_at).getTime() : 0;
      const bTime = b.latest_order_at ? new Date(b.latest_order_at).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch non-registered users." });
  }
});

app.patch("/api/admin/guest-users/:phone/flags", requireAdmin, async (req, res) => {
  try {
    await ensureGuestProfilesSchema();

    const phone = decodeURIComponent(String(req.params.phone || "")).trim();
    const verified = req.body?.verified === true || req.body?.verified === "true" || req.body?.verified === 1 || req.body?.verified === "1";
    const blacklisted = req.body?.blacklisted === true || req.body?.blacklisted === "true" || req.body?.blacklisted === 1 || req.body?.blacklisted === "1";

    if (!phone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    const [existsRows] = await pool.query(
      "SELECT id FROM orders WHERE user_id IS NULL AND phone = ? LIMIT 1",
      [phone]
    );

    if (!existsRows.length) {
      return res.status(404).json({ message: "Guest phone not found in orders." });
    }

    const nextVerified = verified ? 1 : 0;
    const nextBlacklisted = blacklisted ? 1 : 0;

    await pool.query(
      `INSERT INTO guest_profiles (phone, is_verified, is_blacklisted)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_verified = VALUES(is_verified), is_blacklisted = VALUES(is_blacklisted)`,
      [phone, nextVerified, nextBlacklisted]
    );

    res.json({ ok: true, is_verified: nextVerified, is_blacklisted: nextBlacklisted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update non-registered user flags." });
  }
});

app.patch("/api/admin/users/:id/flags", requireAdmin, async (req, res) => {
  try {
    await ensureUsersFlagsColumns();

    const id = Number(req.params.id);
    const verified = req.body?.verified === true || req.body?.verified === "true" || req.body?.verified === 1 || req.body?.verified === "1";
    const blacklisted = req.body?.blacklisted === true || req.body?.blacklisted === "true" || req.body?.blacklisted === 1 || req.body?.blacklisted === "1";

    if (!id) {
      return res.status(400).json({ message: "User id is required." });
    }

    if (req.session.user?.id === id) {
      return res.status(400).json({ message: "You cannot change flags for your own account." });
    }

    const nextVerified = verified ? 1 : 0;
    const nextBlacklisted = blacklisted ? 1 : 0;

    await pool.query(
      "UPDATE users SET is_verified = ?, is_blacklisted = ? WHERE id = ?",
      [nextVerified, nextBlacklisted, id]
    );

    res.json({ ok: true, is_verified: nextVerified, is_blacklisted: nextBlacklisted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not update user flags." });
  }
});

app.get("/api/admin/revenues", requireAdmin, async (_req, res) => {
  try {
    await ensureRevenueAdjustmentsSchema();
    await ensureOrdersDeliveredAtColumn();

    const [monthRow] = await pool.query("SELECT DATE_FORMAT(NOW(), '%Y-%m') AS current_month");
    const currentMonth = String(monthRow?.[0]?.current_month || "");

    const [salesRows] = await pool.query(
      `SELECT o.id, o.product_name, o.amount, o.unit_price_dt, o.created_at AS effective_date,
              p.wave AS product_wave
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.status = 'delivered'
         AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
       ORDER BY effective_date DESC, o.id DESC`,
      [currentMonth]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT id, title, amount_dt, created_at, moved_to_month
       FROM revenue_adjustments
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
       ORDER BY created_at DESC, id DESC`,
      [currentMonth]
    );

    const saleEntries = salesRows.flatMap((row) => {
      const amount = Number(row.amount || 0);
      const unitPrice = Number(row.unit_price_dt || 0);
      const grossProduct = unitPrice * amount;
      const sewingCost = getSewingCostPerItem(row.product_wave) * amount;
      return [
        {
          kind: "sale_add",
          title: `#${row.id} ${row.product_name} x${amount} (product)` ,
          amountDt: Number(grossProduct.toFixed(2)),
          created_at: row.effective_date
        },
        {
          kind: "sewing_remove",
          title: `#${row.id} ${row.product_name} x${amount} (sewing)` ,
          amountDt: Number((-sewingCost).toFixed(2)),
          created_at: row.effective_date
        }
      ];
    });

    const adjustmentEntries = adjustmentRows.map((row) => ({
      id: Number(row.id),
      kind: "adjustment",
      title: row.title,
      amountDt: Number(Number(row.amount_dt || 0).toFixed(2)),
      created_at: row.created_at,
      movedToMonth: row.moved_to_month || null
    }));

    const entries = [...saleEntries, ...adjustmentEntries].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });

    const salesNetDt = saleEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const manualAdjustmentsDt = adjustmentEntries
      .filter((item) => !item.movedToMonth)
      .reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const totalDt = salesNetDt + manualAdjustmentsDt;

    res.json({
      monthKey: currentMonth,
      salesNetDt: Number(salesNetDt.toFixed(2)),
      manualAdjustmentsDt: Number(manualAdjustmentsDt.toFixed(2)),
      totalDt: Number(totalDt.toFixed(2)),
      entries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch revenues." });
  }
});

app.get("/api/admin/revenues/monthly", requireAdmin, async (_req, res) => {
  try {
    await ensureRevenueAdjustmentsSchema();
    await ensureOrdersDeliveredAtColumn();

    const [saleRows] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS month_key,
              COALESCE(SUM((o.unit_price_dt - CASE WHEN p.wave = 'Scene Stealer' THEN ? ELSE ? END) * o.amount), 0) AS sales_net_dt
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.status = 'delivered'
       GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')`,
      [SCENE_STEALER_SEWING_COST_DT, SEWING_COST_DT]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
              COALESCE(SUM(CASE WHEN moved_to_month IS NULL THEN amount_dt ELSE 0 END), 0) AS manual_dt
       FROM revenue_adjustments
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')`
    );

    const map = new Map();

    saleRows.forEach((row) => {
      const key = String(row.month_key || "");
      if (!key) return;
      map.set(key, {
        monthKey: key,
        salesNetDt: Number(row.sales_net_dt || 0),
        manualAdjustmentsDt: 0,
        totalDt: Number(row.sales_net_dt || 0)
      });
    });

    adjustmentRows.forEach((row) => {
      const key = String(row.month_key || "");
      if (!key) return;
      const prev = map.get(key) || {
        monthKey: key,
        salesNetDt: 0,
        manualAdjustmentsDt: 0,
        totalDt: 0
      };
      prev.manualAdjustmentsDt = Number(row.manual_dt || 0);
      prev.totalDt = Number((prev.salesNetDt + prev.manualAdjustmentsDt).toFixed(2));
      map.set(key, prev);
    });

    const months = Array.from(map.values())
      .map((item) => ({
        ...item,
        salesNetDt: Number(item.salesNetDt.toFixed(2)),
        manualAdjustmentsDt: Number(item.manualAdjustmentsDt.toFixed(2)),
        totalDt: Number(item.totalDt.toFixed(2))
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const overallSalesNetDt = saleRows.reduce((sum, row) => sum + Number(row.sales_net_dt || 0), 0);
    const overallManualDt = adjustmentRows.reduce((sum, row) => sum + Number(row.manual_dt || 0), 0);
    const overallTotalDt = Number((overallSalesNetDt + overallManualDt).toFixed(2));

    res.json({ months, overallTotalDt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch monthly revenues." });
  }
});

app.get("/api/admin/revenues/monthly/:month", requireAdmin, async (req, res) => {
  try {
    await ensureRevenueAdjustmentsSchema();
    await ensureOrdersDeliveredAtColumn();

    const monthKey = String(req.params.month || "").trim();
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM." });
    }

    const [salesRows] = await pool.query(
      `SELECT o.id, o.product_name, o.amount, o.unit_price_dt, o.created_at AS effective_date,
              p.wave AS product_wave
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.status = 'delivered'
         AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
       ORDER BY effective_date DESC, o.id DESC`,
      [monthKey]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT id, title, amount_dt, created_at, moved_to_month
       FROM revenue_adjustments
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
       ORDER BY created_at DESC, id DESC`,
      [monthKey]
    );

    const saleEntries = salesRows.flatMap((row) => {
      const amount = Number(row.amount || 0);
      const unitPrice = Number(row.unit_price_dt || 0);
      const grossProduct = unitPrice * amount;
      const sewingCost = getSewingCostPerItem(row.product_wave) * amount;
      return [
        {
          kind: "sale_add",
          title: `#${row.id} ${row.product_name} x${amount} (product)`,
          amountDt: Number(grossProduct.toFixed(2)),
          created_at: row.effective_date
        },
        {
          kind: "sewing_remove",
          title: `#${row.id} ${row.product_name} x${amount} (sewing)`,
          amountDt: Number((-sewingCost).toFixed(2)),
          created_at: row.effective_date
        }
      ];
    });

    const adjustmentEntries = adjustmentRows.map((row) => ({
      id: Number(row.id),
      kind: "adjustment",
      title: row.title,
      amountDt: Number(Number(row.amount_dt || 0).toFixed(2)),
      created_at: row.created_at,
      movedToMonth: row.moved_to_month || null
    }));

    const entries = [...saleEntries, ...adjustmentEntries].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });

    const salesNetDt = saleEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const manualAdjustmentsDt = adjustmentEntries
      .filter((item) => !item.movedToMonth)
      .reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const totalDt = salesNetDt + manualAdjustmentsDt;

    res.json({
      monthKey,
      salesNetDt: Number(salesNetDt.toFixed(2)),
      manualAdjustmentsDt: Number(manualAdjustmentsDt.toFixed(2)),
      totalDt: Number(totalDt.toFixed(2)),
      entries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch monthly revenues details." });
  }
});

app.post("/api/admin/revenues/adjustments", requireAdmin, async (req, res) => {
  try {
    await ensureRevenueAdjustmentsSchema();

    const title = String(req.body?.title || "").trim();
    const type = String(req.body?.type || "add").trim();
    const rawAmount = Number(req.body?.amountDt || 0);

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!["add", "remove"].includes(type)) {
      return res.status(400).json({ message: "Type must be add or remove." });
    }
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0." });
    }

    const signedAmount = type === "remove"
      ? -Math.abs(rawAmount)
      : Math.abs(rawAmount);

    await pool.query(
      "INSERT INTO revenue_adjustments (title, amount_dt, created_by_user_id) VALUES (?, ?, ?)",
      [title, Number(signedAmount.toFixed(2)), req.session.user.id]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not save revenue action." });
  }
});

app.post("/api/admin/revenues/adjustments/:id/move-prev-month", requireAdmin, async (req, res) => {
  let connection;
  try {
    await ensureRevenueAdjustmentsSchema();

    const adjustmentId = Number(req.params.id);
    if (!adjustmentId) {
      return res.status(400).json({ message: "Revenue action id is required." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      "SELECT id, title, amount_dt, created_by_user_id, created_at, moved_to_month FROM revenue_adjustments WHERE id = ? LIMIT 1",
      [adjustmentId]
    );

    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Revenue action not found." });
    }

    const row = existingRows[0];
    if (row.moved_to_month) {
      await connection.rollback();
      return res.status(400).json({ message: "Revenue action already moved." });
    }

    const amount = Number(row.amount_dt || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Revenue action has no amount to move." });
    }

    const createdAt = row.created_at ? new Date(row.created_at) : new Date();
    const safeCreatedAt = Number.isFinite(createdAt.getTime()) ? createdAt : new Date();
    const prevDate = new Date(safeCreatedAt);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    await connection.query(
      `INSERT INTO revenue_adjustments (title, amount_dt, created_by_user_id, created_at)
       VALUES (?, ?, ?, DATE_SUB(?, INTERVAL 1 MONTH))`,
      [String(row.title || ""), Number(amount.toFixed(2)), row.created_by_user_id ? Number(row.created_by_user_id) : null, safeCreatedAt]
    );

    await connection.query(
      "UPDATE revenue_adjustments SET moved_to_month = ?, moved_at = NOW() WHERE id = ?",
      [prevMonthKey, adjustmentId]
    );

    await connection.commit();
    res.json({ ok: true, movedToMonth: prevMonthKey });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    res.status(500).json({ message: "Could not move revenue action." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get("/api/admin/revenues/adjustments/deleted", requireAdmin, async (_req, res) => {
  try {
    await ensureRevenueAdjustmentsDeletedSchema();

    const [rows] = await pool.query(
      `SELECT d.id,
              d.original_adjustment_id,
              d.title,
              d.amount_dt,
              d.created_at,
              d.deleted_at,
              u.full_name AS deleted_by_name
       FROM revenue_adjustments_deleted d
       LEFT JOIN users u ON u.id = d.deleted_by_user_id
       ORDER BY d.deleted_at DESC, d.id DESC
       LIMIT 250`
    );

    const actions = (rows || []).map((row) => ({
      id: Number(row.id),
      originalAdjustmentId: row.original_adjustment_id != null ? Number(row.original_adjustment_id) : null,
      title: row.title,
      amountDt: Number(Number(row.amount_dt || 0).toFixed(2)),
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      deletedByName: row.deleted_by_name || null
    }));

    res.json({ actions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load deleted revenue actions." });
  }
});

app.delete("/api/admin/revenues/adjustments/:id", requireAdmin, async (req, res) => {
  try {
    await ensureRevenueAdjustmentsSchema();
    await ensureRevenueAdjustmentsDeletedSchema();

    const adjustmentId = Number(req.params.id);
    if (!adjustmentId) {
      return res.status(400).json({ message: "Revenue action id is required." });
    }

    const [existingRows] = await pool.query(
      "SELECT id, title, amount_dt, created_by_user_id, created_at FROM revenue_adjustments WHERE id = ? LIMIT 1",
      [adjustmentId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Revenue action not found." });
    }

    const row = existingRows[0];

    await pool.query(
      `INSERT INTO revenue_adjustments_deleted
       (original_adjustment_id, title, amount_dt, created_by_user_id, created_at, deleted_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(row.id),
        String(row.title || ""),
        Number(Number(row.amount_dt || 0).toFixed(2)),
        row.created_by_user_id ? Number(row.created_by_user_id) : null,
        row.created_at || null,
        req.session.user?.id ? Number(req.session.user.id) : null
      ]
    );

    await pool.query("DELETE FROM revenue_adjustments WHERE id = ?", [adjustmentId]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete revenue action." });
  }
});

app.get("/api/admin/users/deleted", requireAdmin, async (_req, res) => {
  try {
    await ensureDeletedUsersSchema();
    const [rows] = await pool.query(
      `SELECT d.id, d.original_user_id, d.full_name, d.phone, d.address, d.role, d.created_at, d.deleted_at,
              u.full_name AS deleted_by_name
       FROM users_deleted d
       LEFT JOIN users u ON u.id = d.deleted_by_user_id
       ORDER BY d.id DESC`
    );

    res.json({
      users: rows.map((row) => ({
        id: Number(row.id || 0),
        originalUserId: row.original_user_id ? Number(row.original_user_id) : null,
        fullName: row.full_name || "",
        phone: row.phone || "",
        address: row.address || "",
        role: row.role || "",
        createdAt: row.created_at || null,
        deletedAt: row.deleted_at || null,
        deletedByName: row.deleted_by_name || ""
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load deleted users." });
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  let connection;
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "User id is required." });
    }

    if (req.session.user?.id === id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await ensureDeletedUsersSchema();
    const [existingRows] = await connection.query(
      "SELECT id, full_name, phone, address, role, created_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found." });
    }

    const userRow = existingRows[0];
    await connection.query(
      `INSERT INTO users_deleted
       (original_user_id, full_name, phone, address, role, created_at, deleted_by_user_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(userRow.id),
        userRow.full_name || null,
        userRow.phone || null,
        userRow.address || null,
        userRow.role || null,
        userRow.created_at || null,
        req.session.user?.id ? Number(req.session.user.id) : null
      ]
    );

    await connection.query("UPDATE orders SET user_id = NULL WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM users WHERE id = ?", [id]);

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error(error);
    res.status(500).json({ message: "Could not delete user." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    await ensureProductsSchema();

    const { name, priceDt, wave, colorsCsv, mainColor, soldOut, imageUrl, colorImagesMap, description } = req.body;
    if (!name || !priceDt) {
      return res.status(400).json({ message: "Name and price are required." });
    }

    const priceCents = Math.round(Number(priceDt) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return res.status(400).json({ message: "Price must be valid." });
    }

    const normalizedWave = String(wave || "1stDrop").trim() || "1stDrop";
    const normalizedColors = String(colorsCsv || "W")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",") || "W";
    const colorList = normalizedColors.split(",").map((item) => item.trim()).filter(Boolean);
    const normalizedMainColor = colorList.includes(String(mainColor || "").trim())
      ? String(mainColor || "").trim()
      : colorList[0];
    const normalizedSoldOut = soldOut === true || soldOut === "true" || soldOut === 1 || soldOut === "1";

    const [result] = await pool.query(
      "INSERT INTO products (name, price_cents, wave, colors_csv, main_color, sold_out, image_url, color_images_map, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [String(name), priceCents, normalizedWave, normalizedColors, normalizedMainColor, normalizedSoldOut ? 1 : 0, imageUrl || null, colorImagesMap || null, description || null]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not add product.", details: error.message });
  }
});

app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    await ensureProductsSchema();

    const id = Number(req.params.id);
    const { name, priceDt, wave, colorsCsv, mainColor, soldOut, imageUrl, colorImagesMap, description } = req.body;
    if (!id || !name || !priceDt) {
      return res.status(400).json({ message: "Product id, name and price are required." });
    }

    const priceCents = Math.round(Number(priceDt) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return res.status(400).json({ message: "Price must be valid." });
    }

    const normalizedWave = String(wave || "1stDrop").trim() || "1stDrop";
    const normalizedColors = String(colorsCsv || "W")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",") || "W";
    const colorList = normalizedColors.split(",").map((item) => item.trim()).filter(Boolean);
    const normalizedMainColor = colorList.includes(String(mainColor || "").trim())
      ? String(mainColor || "").trim()
      : colorList[0];
    const normalizedSoldOut = soldOut === true || soldOut === "true" || soldOut === 1 || soldOut === "1";

    await pool.query(
      "UPDATE products SET name = ?, price_cents = ?, wave = ?, colors_csv = ?, main_color = ?, sold_out = ?, image_url = ?, color_images_map = ?, description = ? WHERE id = ?",
      [String(name), priceCents, normalizedWave, normalizedColors, normalizedMainColor, normalizedSoldOut ? 1 : 0, imageUrl || null, colorImagesMap || null, description || null, id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not edit product.", details: error.message });
  }
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

checkDatabaseConnection().finally(() => {
ensureUsersAddressColumn().finally(() => {
  ensureUsersFlagsColumns()
    .catch((error) => {
      console.error("Users schema check failed:", error.message);
    })
    .finally(() => {
      ensureProductsSchema()
        .catch((error) => {
          console.error("Products schema check failed:", error.message);
        })
        .finally(() => {
          ensureRevenueAdjustmentsSchema()
            .catch((error) => {
              console.error("Revenue schema check failed:", error.message);
            })
            .finally(() => {
              ensureGuestProfilesSchema()
                .catch((error) => {
                  console.error("Guest profiles schema check failed:", error.message);
                })
                .finally(() => {
                  ensureOrdersDeliveredAtColumn()
                    .catch((error) => {
                      console.error("Orders schema check failed:", error.message);
                    })
                    .finally(() => {
                      ensureOrdersReturnedAtColumn()
                        .catch((error) => {
                          console.error("Orders return schema check failed:", error.message);
                        })
                        .finally(() => {
                          autoVerifyDeliveredContacts()
                            .catch((error) => {
                              console.error("Auto verify check failed:", error.message);
                            })
                            .finally(() => {
                              loadProducts().catch((error) => {
                                console.error("Products cache warmup failed:", error.message);
                              });
                              app.listen(PORT, () => {
                                console.log(`WAVES server running on http://localhost:${PORT}`);
                                if (KEEP_WARM_URL && KEEP_WARM_INTERVAL_MS > 0) {
                                  pingKeepWarm(KEEP_WARM_URL);
                                  setInterval(() => pingKeepWarm(KEEP_WARM_URL), KEEP_WARM_INTERVAL_MS);
                                }
                              });
                            });
                        });
                    });
                });
            });
        });
    });
});
});
