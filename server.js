// chat-backend/server.js (ESM version)

// ✅ Load biến môi trường ngay từ đầu
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";
import connectDB from './config/db.js';

// ✅ Import autoUpdate (logic cập nhật)
import {
  initAutoUpdate,
  setSocketIO,
  updateNews,
  updateWeather,
  updateTime,
  updateWebSearchBatchNatural,
  autoUpdateEvents
} from "./autoUpdate.js";

// ✅ Import cronjobs (lịch cron)
import { startCronJobs } from "./cronjobs.js";

import searchRouter from "./routes/search.js";
import countriesRouter from "./routes/countries.js";
import { nluMiddleware } from "./middleware/nluMiddleware.js";
import { handleUserQuestion } from "./services/nlpService.js";

// ✅ Import logger chung
import { logger, SOURCES } from "./utils/logger.js";
import { requestLogger, errorLogger } from "./utils/loggerMiddleware.js";
import { errorMiddleware, setupGlobalErrorHandler } from "./utils/errorHandler.js";

// ✅ Import thêm service news
import NEWS_TOPICS from "./newsTopics.js";
import { getNews, getNewsByTopic, getTopics } from "./services/newsService.js";

// --- Biến môi trường ---
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

// Setup global error handler
setupGlobalErrorHandler();

// --- Middleware parse JSON ---
app.use(express.json());

// --- Middleware logging request ---
app.use(requestLogger);

// --- Middleware logging console ---
app.use((req, _res, next) => {
  logger.info(`📥 [Request] ${req.method} ${req.url}`, { source: SOURCES.SYSTEM });
  next();
});

// --- Middleware NLU ---
app.use(nluMiddleware);

// --- Mount routes ---
app.use("/search", searchRouter);
app.use("/countries", countriesRouter);

// --- Route gốc + health ---
app.get("/", (_req, res) => {
  res.send("🚀 Chat backend is running");
});

app.get("/ping", (_req, res) => {
  res.json({ success: true, message: "pong", ts: new Date().toISOString() });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, env: NODE_ENV, ts: new Date().toISOString() });
});

// --- Error logging & handling ---
app.use(errorLogger);
app.use(errorMiddleware);

// --- HTTP server + Socket.IO ---
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Sau khi tạo io:
setSocketIO(io);

// Kết nối MongoDB
connectDB();

// Khởi động autoUpdate + cron
initAutoUpdate();
startCronJobs();

// --- REST API: WebSearch ---
app.post("/api/websearch", async (req, res) => {
  try {
    const { queries, lang = "lang_vi", num = 10, userId, sessionId } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "Không có truy vấn hợp lệ." });
    }

    const results = await updateWebSearchBatchNatural({
      userQueries: queries,
      lang,
      num,
      meta: { userId: userId || "anonymous", ip, sessionId },
    });

    res.json({ updatedAt: new Date().toISOString(), results });
  } catch (err) {
    logger.error("❌ [API /api/websearch]", {
      source: SOURCES.SEARCH,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: "Lỗi xử lý truy vấn web." });
  }
});

// --- REST API: Status ---
app.get("/api/status", async (_req, res) => {
  try {
    const [newsRaw, webRaw, weatherRaw, timeRaw] = await Promise.allSettled([
      fs.readFile(path.join(DATA_DIR, "news.json"), "utf8"),
      fs.readFile(path.join(DATA_DIR, "websearch-natural.json"), "utf8"),
      fs.readFile(path.join(DATA_DIR, "weather.json"), "utf8"),
      fs.readFile(path.join(DATA_DIR, "time.json"), "utf8"),
    ]);

    const news = newsRaw.status === "fulfilled" ? JSON.parse(newsRaw.value) : {};
    const web = webRaw.status === "fulfilled" ? JSON.parse(webRaw.value) : {};
    const weather = weatherRaw.status === "fulfilled" ? JSON.parse(weatherRaw.value) : {};
    const time = timeRaw.status === "fulfilled" ? JSON.parse(timeRaw.value) : {};

    res.json({
      updatedAt: new Date().toISOString(),
      news: { totalArticles: news?.articles?.length || 0, lastUpdated: news?.updatedAt || null },
      websearch: { totalQueries: web?.queries?.length || 0, lastUpdated: web?.updatedAt || null },
      weather: {
        city: weather?.city || null,
        country: weather?.country || null,
        temperature: weather?.temperature ?? null,
        description: weather?.description || null,
        humidity: weather?.humidity ?? null,
        wind_speed: weather?.wind_speed ?? null,
        lastUpdated: weather?.collectedAt || null,
      },
      time: {
        formatted: time?.formatted || null,
        timezone: time?.timezone || null,
        lastUpdated: time?.collectedAt || null,
      },
    });
  } catch (err) {
    logger.error("❌ [API /api/status]", {
      source: SOURCES.SYSTEM,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: "Không thể lấy trạng thái hệ thống." });
  }
});

// --- REST API: News + Topics ---
app.get("/api/news", async (req, res) => {
  try {
    const { q, limit = 100, since } = req.query;
    const articles = await getNews(q, parseInt(limit), since);
    res.json({ success: true, count: articles.length, data: articles });
  } catch (err) {
    logger.error("❌ [API /api/news]", { source: SOURCES.NEWS, error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/news/topic/:topic", async (req, res) => {
  try {
    const topic = req.params.topic;
    const articles = await getNewsByTopic(topic, 50);
    res.json({ success: true, count: articles.length, data: articles });
  } catch (err) {
    logger.error("❌ [API /api/news/topic]", { source: SOURCES.NEWS, error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/topics", (_req, res) => {
  res.json({ success: true, topics: getTopics() });
});

// --- Giao diện HTML: Bảng tin theo chủ đề ---
app.get("/topics-dashboard", async (_req, res) => {
  try {
    const results = await Promise.all(
      NEWS_TOPICS.map(async t => {
        const articles = await getNewsByTopic(t.query, 10);
        return { ...t, count: articles.length, latest: articles.slice(0, 3) };
      })
    );

    const html = `
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <title>Bảng tin theo chủ đề</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f4f4f4; }
            ul { margin: 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <h1>📊 Bảng tin theo chủ đề</h1>
          <table>
            <tr><th>Chủ đề</th><th>Số lượng tin</th><th>3 tin mới nhất</th></tr>
            ${results.map(r => `
              <tr>
                <td>${r.label}</td>
                <td>${r.count}</td>
                <td>
                  <ul>
                    ${r.latest.length > 0 
                      ? r.latest.map(a => `<li><a href="${a.url}" target="_blank">${a.title}</a></li>`).join("")
                      : "<li>Không có tin</li>"
                    }
                  </ul>
                </td>
              </tr>
            `).join("")}
          </table>
        </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    logger.error("❌ [Route /topics-dashboard]", { source: SOURCES.NEWS, error: err.message, stack: err.stack });
    res.status(500).send(`<p>Lỗi khi tải bảng tin: ${err.message}</p>`);
  }
});

// --- REST API: Info ---
app.get("/api/info", (_req, res) => {
  res.json({
    service: "chat-backend",
    env: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    host: process.env.HOSTNAME || "local"
  });
});

// --- WebSocket realtime ---
io.on("connection", (socket) => {
  logger.info("🔌 [Socket.IO] Client connected", { source: SOURCES.SYSTEM, socketId: socket.id });
  socket.emit("hello", { message: "Kết nối realtime thành công." });

  socket.on("refreshNews", async () => {
    try {
      const articles = await updateNews();
      socket.emit("newsUpdate", { updatedAt: new Date().toISOString(), count: articles.length });
    } catch (err) {
      logger.error("❌ [Socket refreshNews]", { source: SOURCES.NEWS, error: err.message });
      socket.emit("error", { type: "news", message: err.message });
    }
  });

  socket.on("refreshWeather", async () => {
    try {
      const weather = await updateWeather("Hanoi", "VN");
      socket.emit("weatherUpdate", weather);
    } catch (err) {
      logger.error("❌ [Socket refreshWeather]", { source: SOURCES.WEATHER, error: err.message });
      socket.emit("error", { type: "weather", message: err.message });
    }
  });

  socket.on("refreshTime", async () => {
    try {
      const timeData = await updateTime();
      socket.emit("timeUpdate", timeData);
    } catch (err) {
      logger.error("❌ [Socket refreshTime]", { source: SOURCES.TIME, error: err.message });
      socket.emit("error", { type: "time", message: err.message });
    }
  });

  socket.on("refreshWebSearch", async (queries) => {
    try {
      const results = await updateWebSearchBatchNatural({
        userQueries: queries,
        lang: "lang_vi",
        num: 10
      });
      socket.emit("websearchUpdate", {
        updatedAt: new Date().toISOString(),
        count: results.length
      });
    } catch (err) {
      logger.error("❌ [Socket refreshWebSearch]", {
        source: SOURCES.SEARCH,
        error: err.message
      });
      socket.emit("error", { type: "websearch", message: err.message });
    }
  });

  socket.on("disconnect", () => {
    logger.info("🔌 [Socket.IO] Client disconnected", {
      source: SOURCES.SYSTEM,
      socketId: socket.id
    });
  });
});

// --- Emit statusUpdate định kỳ qua Socket.IO ---
setInterval(() => {
  const status = {
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().rss
  };
  io.emit("statusUpdate", status);
}, 60000);

// --- Khởi động server ---
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT} [${NODE_ENV}]`, { source: SOURCES.SYSTEM });
});

// --- Hàm đọc cache từ news.json ---
async function getCachedNewsByTopic(topic) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "news.json"), "utf8");
    const { articles } = JSON.parse(raw);
    return articles.filter(a => a.category === topic);
  } catch (err) {
    console.error("❌ Lỗi đọc cache:", err.message);
    return [];
  }
}

// --- Lắng nghe khi autoUpdate hoàn tất ---
autoUpdateEvents.on("done", async () => {
  const timestamp = new Date().toLocaleString("vi-VN");
  console.log(`\n=== 📚 Danh sách chủ đề sau khi autoUpdate (${timestamp}) ===`);

  const results = await Promise.all(
    NEWS_TOPICS.map(async (t) => {
      try {
        const articles = await getCachedNewsByTopic(t.query);
        return { ...t, count: articles.length };
      } catch (err) {
        logger.error(`❌ Lỗi khi lấy tin cho chủ đề ${t.label}`, { error: err.message });
        return { ...t, count: 0 };
      }
    })
  );

  results.forEach((r, idx) => {
    console.log(`   ${idx + 1}. ${r.label} (${r.query}) ${r.count} tin`);
  });

  console.log("=== Hoàn tất in danh sách ===\n");
});
