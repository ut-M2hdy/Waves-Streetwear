const path = require("path");
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

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "store_waves",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "waves-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use(express.static(path.join(__dirname)));

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
      PRIMARY KEY (id),
      CONSTRAINT fk_revenue_adjustments_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
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
    await ensureProductsSchema();
    const [rows] = await pool.query(
      "SELECT id, name, price_cents, wave, colors_csv, main_color, sold_out, image_url, color_images_map, description FROM products ORDER BY id ASC"
    );
    res.json({ products: rows });
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
      productName,
      color,
      size,
      amount,
      unitPriceDt,
      fullName,
      phone,
      address,
      note
    } = req.body;

    if (!productId || !productName || !color || !size || !amount || !unitPriceDt || !fullName || !address) {
      return res.status(400).json({ message: "Missing order fields." });
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

    const amountNumber = Number(amount);
    const unitPriceNumber = Number(unitPriceDt);
    if (!Number.isFinite(amountNumber) || amountNumber < 1 || !Number.isFinite(unitPriceNumber) || unitPriceNumber <= 0) {
      return res.status(400).json({ message: "Invalid pricing fields." });
    }

    const effectiveDeliveryFee = DEFAULT_DELIVERY_FEE_DT;
    const effectiveTotalPrice = (unitPriceNumber * amountNumber) + effectiveDeliveryFee;

    const [result] = await pool.query(
      `INSERT INTO orders
       (user_id, product_id, product_name, color, size, amount, unit_price_dt, delivery_fee_dt, total_price_dt, full_name, phone, address, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        Number(productId),
        productName,
        color,
        size,
        amountNumber,
        unitPriceNumber,
        effectiveDeliveryFee,
        effectiveTotalPrice,
        fullName,
        resolvedPhone,
        address,
        note || null
      ]
    );

    res.status(201).json({ orderId: result.insertId });
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
    const [[ordersCountRow]] = await pool.query("SELECT COUNT(*) AS count FROM orders");
    const [[pendingRow]] = await pool.query("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'");
    const [[salesRow]] = await pool.query("SELECT COALESCE(SUM(unit_price_dt * amount), 0) AS total FROM orders");

    res.json({
      ordersCount: Number(ordersCountRow.count || 0),
      pendingCount: Number(pendingRow.count || 0),
      totalSalesDt: Number(salesRow.total || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch admin summary." });
  }
});

app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
  try {
    await ensureOrdersDeliveredAtColumn();
    await ensureUsersFlagsColumns();
    const [rows] = await pool.query(
      `SELECT o.id, o.product_name, o.color, o.size, o.amount, o.unit_price_dt, o.delivery_fee_dt, o.total_price_dt, o.note, o.status, o.delivered_at, o.created_at,
              p.image_url AS product_image_url,
              u.full_name AS account_name, u.phone AS account_phone,
              u.is_verified AS account_is_verified, u.is_blacklisted AS account_is_blacklisted
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    );

    res.json({ orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch orders." });
  }
});

app.get("/api/admin/sales/monthly", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
              COUNT(*) AS orders_count,
              COALESCE(SUM(unit_price_dt * amount), 0) AS sales_dt
       FROM orders
       WHERE status <> 'cancelled'
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
         AND status <> 'cancelled'
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
      "SELECT status, delivered_at FROM orders WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Order not found." });
    }

    const currentStatus = String(rows[0].status || "").trim().toLowerCase();
    const deliveredAt = rows[0].delivered_at ? new Date(rows[0].delivered_at) : null;
    const isDeliveredLocked = currentStatus === "delivered"
      && deliveredAt
      && (Date.now() - deliveredAt.getTime() >= 24 * 60 * 60 * 1000);

    if (isDeliveredLocked && requestedStatus !== "delivered") {
      return res.status(400).json({
        message: "Delivered status is locked after 24 hours and cannot be changed."
      });
    }

    if (currentStatus === requestedStatus) {
      return res.json({ ok: true });
    }

    if (requestedStatus === "delivered") {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NOW() WHERE id = ?", [requestedStatus, id]);
    } else {
      await pool.query("UPDATE orders SET status = ?, delivered_at = NULL WHERE id = ?", [requestedStatus, id]);
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
    await ensureUsersFlagsColumns();
    const [rows] = await pool.query(
      "SELECT id, full_name, phone, role, is_verified, is_blacklisted, created_at FROM users ORDER BY id DESC"
    );
    res.json({ users: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch users." });
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
      `SELECT id, product_name, amount, unit_price_dt, COALESCE(delivered_at, created_at) AS effective_date
       FROM orders
       WHERE status = 'delivered'
         AND DATE_FORMAT(COALESCE(delivered_at, created_at), '%Y-%m') = ?
       ORDER BY effective_date DESC, id DESC`,
      [currentMonth]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT id, title, amount_dt, created_at
       FROM revenue_adjustments
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
       ORDER BY created_at DESC, id DESC`,
      [currentMonth]
    );

    const saleEntries = salesRows.flatMap((row) => {
      const amount = Number(row.amount || 0);
      const unitPrice = Number(row.unit_price_dt || 0);
      const grossProduct = unitPrice * amount;
      const sewingCost = SEWING_COST_DT * amount;
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
      kind: "adjustment",
      title: row.title,
      amountDt: Number(Number(row.amount_dt || 0).toFixed(2)),
      created_at: row.created_at
    }));

    const entries = [...saleEntries, ...adjustmentEntries].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });

    const salesNetDt = saleEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const manualAdjustmentsDt = adjustmentEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
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
      `SELECT DATE_FORMAT(COALESCE(delivered_at, created_at), '%Y-%m') AS month_key,
              COALESCE(SUM((unit_price_dt - ?) * amount), 0) AS sales_net_dt
       FROM orders
       WHERE status = 'delivered'
       GROUP BY DATE_FORMAT(COALESCE(delivered_at, created_at), '%Y-%m')`,
      [SEWING_COST_DT]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
              COALESCE(SUM(amount_dt), 0) AS manual_dt
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

    res.json({ months });
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
      `SELECT id, product_name, amount, unit_price_dt, COALESCE(delivered_at, created_at) AS effective_date
       FROM orders
       WHERE status = 'delivered'
         AND DATE_FORMAT(COALESCE(delivered_at, created_at), '%Y-%m') = ?
       ORDER BY effective_date DESC, id DESC`,
      [monthKey]
    );

    const [adjustmentRows] = await pool.query(
      `SELECT id, title, amount_dt, created_at
       FROM revenue_adjustments
       WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
       ORDER BY created_at DESC, id DESC`,
      [monthKey]
    );

    const saleEntries = salesRows.flatMap((row) => {
      const amount = Number(row.amount || 0);
      const unitPrice = Number(row.unit_price_dt || 0);
      const grossProduct = unitPrice * amount;
      const sewingCost = SEWING_COST_DT * amount;
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
      kind: "adjustment",
      title: row.title,
      amountDt: Number(Number(row.amount_dt || 0).toFixed(2)),
      created_at: row.created_at
    }));

    const entries = [...saleEntries, ...adjustmentEntries].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });

    const salesNetDt = saleEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
    const manualAdjustmentsDt = adjustmentEntries.reduce((sum, item) => sum + Number(item.amountDt || 0), 0);
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

    const [existingRows] = await connection.query("SELECT id FROM users WHERE id = ? LIMIT 1", [id]);
    if (!existingRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found." });
    }

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
              ensureOrdersDeliveredAtColumn()
                .catch((error) => {
                  console.error("Orders schema check failed:", error.message);
                })
                .finally(() => {
                  app.listen(PORT, () => {
                    console.log(`WAVES server running on http://localhost:${PORT}`);
                  });
                });
            });
        });
    });
});
