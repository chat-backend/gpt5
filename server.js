// server.js (ESM version)
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import axios from "axios";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";

import chatRouter from "./chat.js";
import app from "./app.js";
import { logger, SOURCES, requestLogger } from "./routes/logger.js";
import { newsHandler, NEWS_SOURCES } from "./routes/news.js";

// -------------------- Khai báo đường dẫn & phục vụ file tĩnh --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Phục vụ file tĩnh trong thư mục public/
app.use(express.static(path.join(__dirname, "public")));

// -------------------- Cấu hình chung --------------------
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "production";
console.log("DEBUG OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "ĐÃ NẠP" : "CHƯA NẠP");

// Đọc từ .env, fallback nếu không có
const NEWS_TTL_HOURS = parseInt(process.env.NEWS_TTL_HOURS || "24", 10);
const NEWS_LIMIT = parseInt(process.env.NEWS_LIMIT || "100", 10);

// Middleware chung
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Mount router duy nhất
app.use("/", chatRouter);

// Endpoint đọc tin tức từ cache (news.json)
app.get("/news", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const data = await newsHandler(limit);   // hàm trong routes/news.js
    res.json(data);                          // trả JSON cho client
  } catch (err) {
    logger.error("❌ [News API] Lỗi khi đọc cache:", { error: err.message });
    res.status(500).json({ error: "Không thể đọc tin tức" });
  }
});

// Error middleware
app.use((err, req, res, next) => {
  logger.error("❌ Error middleware", { error: err.message });
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

// -------------------- AutoUpdate logic --------------------
export const autoUpdateEvents = new EventEmitter();

// Thư mục lưu dữ liệu
const DATA_DIR = path.join(__dirname, "data");
await fs.mkdir(DATA_DIR, { recursive: true });

function nowISO() { 
  return new Date().toISOString(); 
}

async function saveJSON(file, data) {
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// --- News ---
async function updateNews() {
  try {
    let newsArticles = [];
    let successNews = 0;
    let failNews = 0;

    // 1. Fetch từng nguồn
    for (const provider of NEWS_SOURCES) {
      try {
        const articles = await provider.fetch();
        successNews++;
        newsArticles.push(...articles);
        logger.info(`✅ [News] ${provider.name}: lấy được ${articles.length} tin`, { source: SOURCES.NEWS });
      } catch (err) {
        failNews++;
        logger.error(`❌ [News] ${provider.name} lỗi: ${err.message}`, { source: SOURCES.NEWS });
      }
    }

    // 2. Lọc trùng theo URL
    const seen = new Set();
    const unique = newsArticles.filter(a => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // 3. Lọc theo TTL (chỉ giữ tin trong NEWS_TTL_HOURS gần nhất)
    const now = Date.now();
    const lastTTL = unique.filter(a => {
      const t = new Date(a.publishedAt || 0).getTime();
      return now - t <= NEWS_TTL_HOURS * 60 * 60 * 1000;
    });

    // 4. Sort mới nhất trước
    const sorted = lastTTL.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // 5. Giữ tối đa NEWS_LIMIT tin
    const latest = sorted.slice(0, NEWS_LIMIT);

    // 6. Lưu file
    await saveJSON("news.json", { updatedAt: nowISO(), articles: latest });

    // 7. Log tổng hợp
    logger.info(
      `📊 [News] Thành công: ${successNews}/${NEWS_SOURCES.length} nguồn, thất bại: ${failNews}, tổng: ${newsArticles.length}, duy nhất: ${unique.length}, trong ${NEWS_TTL_HOURS}h: ${lastTTL.length}, lưu: ${latest.length}`,
      { source: SOURCES.NEWS }
    );

    // 8. Emit sự kiện
    autoUpdateEvents.emit("newsUpdate", { updatedAt: nowISO(), count: latest.length });
    return latest;
  } catch (err) {
    logger.error(`❌ [News] Lỗi tổng thể: ${err.message}`, { source: SOURCES.NEWS });
    return [];
  }
}

// --- Weather ---
async function updateWeather(city = "Hanoi", countryCode = "VN") {
  const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
    params: { q: `${city},${countryCode}`, appid: process.env.OPENWEATHER_API_KEY, units: "metric", lang: "vi" }
  });
  const data = res.data;
  const weather = {
    city: data.name,
    description: data.weather?.[0]?.description,
    temperature: data.main?.temp,
    collectedAt: nowISO()
  };
  await saveJSON("weather.json", weather);
  logger.info(`🌤️ [Weather] ${weather.city}: ${weather.description}, ${weather.temperature}°C`, { source: SOURCES.WEATHER });
  autoUpdateEvents.emit("weatherUpdate", weather);
  return weather;
}

// --- Time ---
async function updateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full", timeStyle: "long"
  });
  const timeData = {
    datetime: now.toISOString(),
    formatted: formatter.format(now),
    collectedAt: nowISO()
  };
  await saveJSON("time.json", timeData);
  logger.info(`🕒 [Time] ${timeData.formatted}`, { source: SOURCES.TIME });
  autoUpdateEvents.emit("timeUpdate", timeData);
  return timeData;
}

// Init + Cron
async function initAutoUpdate() {
  logger.info("🚀 [AutoUpdate] Khởi động lần đầu...", { source: SOURCES.SYSTEM });
  await Promise.all([ updateNews(), updateWeather("Hanoi", "VN"), updateTime() ]);
  logger.info("✅ [AutoUpdate] Hoàn tất lần chạy đầu tiên.", { source: SOURCES.SYSTEM });
  autoUpdateEvents.emit("done");
}

function startCronJobs() {
  cron.schedule("*/10 * * * *", updateNews);
  cron.schedule("0 * * * *", () => updateWeather("Hanoi", "VN"));
  cron.schedule("*/30 * * * *", updateTime);
  logger.info("✅ Cron jobs (News + Weather + Time) đã khởi động.", { source: SOURCES.SYSTEM });
}

// -------------------- Server + Socket.IO --------------------
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

io.on("connection", (socket) => {
  logger.info("🔌 [Socket.IO] Client connected", { source: SOURCES.SYSTEM, socketId: socket.id });
  socket.emit("hello", { message: "Kết nối realtime thành công." });
  socket.on("disconnect", () => {
    logger.info("🔌 [Socket.IO] Client disconnected", { source: SOURCES.SYSTEM, socketId: socket.id });
  });
});

// Emit statusUpdate định kỳ
setInterval(() => {
  io.emit("statusUpdate", {
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().rss
  });
}, 60000);

// Start
await initAutoUpdate();
startCronJobs();

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT} [${NODE_ENV}]`, { source: SOURCES.SYSTEM });
});