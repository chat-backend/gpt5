// chat.js (ESM version)
import express from "express";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { classifyQuery, mapGroup } from "./routes/classifier.js";

// Handlers chuyên trách
import { askAI } from "./routes/askAI.js";
import { newsHandler } from "./routes/news.js";
import { globalSearchHandler } from "./routes/search.js";
import { weatherHandler } from "./routes/weather.js";
import { timeHandler } from "./routes/time.js";

// Memory
import {
  addMessage,
  getConversation,
  getSessionInfo,
  clearConversation,
  buildContextForAI,
} from "./routes/memory.js";

dotenv.config();
const router = express.Router();

/* ---------------- Utils ---------------- */
function apiResponse(success, data, error = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

/* ---------------- Rate Limiter ---------------- */
const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: apiResponse(false, null, "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau."),
});

/* ---------------- Intent Dispatcher (đã fix) ---------------- */
async function dispatchByIntent(sessionId, question) {
  const intent = await classifyQuery(question);
  let result;

  switch (intent) {
      case "weather":
      result = await weatherHandler(question);
      break;

    case "news":
      result = await newsHandler();
      break;

    case "time":
      result = await timeHandler();
      break;

    case "global":   
      result = await globalSearchHandler(question);
      break;
    
    case "knowledge":
    case "expand":
    case "short":
    case "explain":
    case "creative":
      // ✅ Cho AI xử lý trực tiếp để phân tích, mở rộng, tổng hợp
      result = await askAI(sessionId, question);
      break;

    default:
      // Mặc định fallback sang AI
      result = await askAI(sessionId, question);
  }

  // Đảm bảo luôn có source để tránh Unknown source
  if (!result.source) {
    result.source = "ai";
  }

if (!result.message) {
  result.message = "⚠️ Không có dữ liệu phản hồi.";
}

  return { ...result, intent, group: mapGroup(intent) };
}

/* ---------------- Endpoints ---------------- */
router.post("/ask-unified", askLimiter, async (req, res) => {
  const { question, sessionId = "default-session" } = req.body;
  if (!question || typeof question !== "string") {
    return res.status(400).json(apiResponse(false, null, "Thiếu hoặc sai định dạng question"));
  }

  try {
    const start = Date.now();
    const result = await dispatchByIntent(sessionId, question);
    const duration = Date.now() - start;

    // 👉 Rút gọn message để log
    const preview = (result.message || "")
      .replace(/\s+/g, " ")
      .slice(0, 80);
    const previewText = preview + (result.message && result.message.length > 80 ? "..." : "");

    console.info("📩 /ask-unified", {
      sessionId,
      question,
      intent: result.intent,
      group: result.group,
      source: result.source,
      duration: `${duration}ms`,
      preview: previewText,   // 👈 thêm preview nội dung trả lời
    });

    return res.json(apiResponse(true, result));
  } catch (err) {
    console.error("❌ [API /ask-unified]", err.message);
    return res.status(500).json(apiResponse(false, null, "Internal Server Error"));
  }
});

/* ---------------- Memory Endpoints ---------------- */
router.post("/memory/add", (req, res) => {
  const { sessionId, role, content, metadata } = req.body;
  addMessage(sessionId, role, content, metadata);
  res.json(apiResponse(true, { ok: true }));
});

router.get("/memory/:sessionId", (req, res) => {
  res.json(apiResponse(true, getConversation(req.params.sessionId)));
});

router.get("/memory/:sessionId/info", (req, res) => {
  res.json(apiResponse(true, getSessionInfo(req.params.sessionId)));
});

router.delete("/memory/:sessionId", (req, res) => {
  clearConversation(req.params.sessionId);
  res.json(apiResponse(true, { ok: true }));
});

router.get("/memory/:sessionId/context", async (req, res) => {
  const ctx = await buildContextForAI(req.params.sessionId);
  res.json(apiResponse(true, ctx));
});

/* ---------------- Health & Ping ---------------- */
router.get("/health", (_req, res) => res.json(apiResponse(true, { ok: true })));
router.get("/ping", (_req, res) => res.send("pong"));
router.get("/status", (_req, res) =>
  res.json(apiResponse(true, { updatedAt: new Date().toISOString() }))
);
router.get("/info", (_req, res) =>
  res.json(
    apiResponse(true, {
      service: "chat-backend",
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
    })
  )
);

/* ---------------- 404 Fallback ---------------- */
router.use((_req, res) => {
  res.status(404).json(apiResponse(false, null, "Endpoint không tồn tại"));
});

export default router;