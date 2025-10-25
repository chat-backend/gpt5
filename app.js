// app.js (ESM version, sắp xếp tối ưu)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import indexRouter from "./index.js";
import messagesRouter from "./routes/messages.js";
import chatRouter from "./routes/chat.js";
import countryRouter from "./countryRouter.js";
import newsRouter from "./routes/news.js";
import countriesRouter from "./routes/countries.js";
import weatherRouter from "./routes/weather.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { statusRouter } from "./routes/statusRouter.js";
import { systemMonitor } from "./middleware/systemMonitor.js";
import { initAutoUpdate } from "./services/cacheService.js";
import countriesWebRouter from "./routes/countriesWeb.js";
import { smartAssistant } from "./services/smartAssistant.js";
import apiRouter from "./routes/api.js";
import assistantRouter from "./routes/assistant.js";
import { classifyIntent } from "./services/intentService.js";
import { answerByIntent } from "./services/qaService.js";

// ✅ Import Knowledge Base
import { knowledgeBaseRouter, knowledgeBaseMiddleware } from "./services/knowledgeBaseRouter.js";

dotenv.config();

const app = express();

// --- Middleware chung ---
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());
app.use(requestLogger);
app.use(systemMonitor);

// --- Knowledge Base middleware (intercept trước AI/chat) ---
app.use(knowledgeBaseMiddleware);

// --- Routers hệ thống ---
app.use("/api", apiRouter);
app.use("/countries-web", countriesWebRouter);
app.use("/assistant", assistantRouter);

// --- Khởi động auto update cache ---
initAutoUpdate();

// --- Health check ---
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/ping", (_req, res) => res.send("pong"));

// --- Route hỏi–đáp trực tiếp ---
app.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Thiếu tham số message",
        timestamp: new Date().toISOString()
      });
    }
    const intent = classifyIntent(message);
    const answer = await answerByIntent(intent, message);
    res.json({ success: true, intent, answer, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("❌ Error in /ask:", err.message);
    res.status(500).json({ success: false, error: "Internal Server Error", details: err.message });
  }
});

// --- Route Trợ lý Thông Tuệ ---
app.post("/smart", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Thiếu tham số message" });
    }
    const result = await smartAssistant(message, sessionId || "default");
    res.json(result);
  } catch (err) {
    console.error("❌ Error in /smart:", err.message);
    res.status(500).json({ success: false, error: "Internal Server Error", details: err.message });
  }
});

// --- Gắn các router dữ liệu ---
app.use("/messages", messagesRouter);
app.use("/chat", chatRouter); // KB middleware đã chạy trước đó
app.use("/countries", countriesRouter);
app.use("/country", countryRouter); // 👈 đổi prefix để tránh trùng
app.use("/news", newsRouter);
app.use("/weather", weatherRouter);
app.use("/kb", knowledgeBaseRouter);
app.use("/status", statusRouter);
app.use("/", indexRouter);

// --- Route trang chủ ---
app.get("/", (_req, res) => {
  res.send("🚀 Chat backend is running");
});

// --- Middleware xử lý lỗi cuối cùng ---
app.use((err, req, res, _next) => {
  console.error(`❌ Error at ${req.method} ${req.originalUrl}:`, err.message);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

export default app;