// routes/messages.js (ESM version)
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Đường dẫn file JSON để lưu tin nhắn
const DATA_FILE = path.join(__dirname, "../data/messages.json");

// Bộ nhớ RAM để cache tin nhắn
let messages = [];

// --- Hàm load dữ liệu từ file khi server khởi động ---
function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      messages = JSON.parse(raw);
    } else {
      messages = [];
    }
  } catch (err) {
    console.error("❌ Lỗi đọc file messages.json:", err.message);
    messages = [];
  }
}

// --- Hàm lưu dữ liệu ra file ---
function saveMessages() {
  try {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Lỗi ghi file messages.json:", err.message);
  }
}

// Load dữ liệu ngay khi module được import
loadMessages();

// --- GET /messages → trả về danh sách tin nhắn (có phân trang) ---
router.get("/", (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const sortOrder = req.query.sort === "asc" ? 1 : -1;

    const sorted = [...messages].sort((a, b) =>
      sortOrder === 1
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    res.locals.source = "chat-history";
    res.locals.group = "internal";

    res.json({
      success: true,
      source: "chat-history",
      group: "internal",
      page,
      limit,
      total,
      totalPages,
      messages: paginated
    });
  } catch (err) {
    console.error("❌ Lỗi GET /messages:", err.message);
    res.status(500).json({
      success: false,
      source: "chat-history",
      group: "internal",
      error: "Failed to fetch messages"
    });
  }
});

// --- POST /messages → thêm tin nhắn mới ---
router.post("/", (req, res) => {
  try {
    const { user, message } = req.body;
    if (!user || !message || !user.trim() || !message.trim()) {
      return res.status(400).json({ success: false, error: "user and message are required" });
    }

    const doc = {
      id: crypto.randomUUID(),
      user: user.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString() // 👈 chuẩn hóa ISO string
    };

    messages.push(doc);
    saveMessages(); // lưu ra file ngay sau khi thêm

    res.locals.source = "chat-history";
    res.locals.group = "internal";

    res.status(201).json({
      success: true,
      source: "chat-history",
      group: "internal",
      info: "Message created",
      data: doc
    });
  } catch (err) {
    console.error("❌ Lỗi POST /messages:", err.message);
    res.status(500).json({
      success: false,
      source: "chat-history",
      group: "internal",
      error: "Failed to create message"
    });
  }
});

export default router;