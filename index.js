// index.js (ESM version)
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { classifyIntent } from "./services/intentService.js";
import { answerByIntent } from "./services/qaService.js";

dotenv.config();

const router = express.Router();

// Axios cấu hình chung
axios.defaults.timeout = 15000;

// -----------------------
// Middleware xử lý lỗi quota và lỗi API cụ thể
// -----------------------
function checkQuotaError(err, req, res, next) {
  if (err && err.response) {
    const apiError =
      err.response.data?.error?.message ||
      err.response.data?.message ||
      err.message;

    const msg = String(apiError || "").toLowerCase();

    if (msg.includes("request limit")) {
      res.locals.source = res.locals.source || "openai";
      res.locals.group = res.locals.group || "external";
      return res.status(429).json({ success: false, error: "Quota exceeded" });
    }
    if (msg.includes("insufficient_quota")) {
      res.locals.source = res.locals.source || "openai";
      res.locals.group = res.locals.group || "external";
      return res.status(402).json({ success: false, error: "Insufficient quota" });
    }

    const status = err.response.status || 500;
    res.locals.source = res.locals.source || "openai";
    res.locals.group = res.locals.group || "external";
    return res.status(status).json({ success: false, error: apiError || "API error" });
  }

  return next(err);
}

// -----------------------
// Route /chat (OpenAI)
// -----------------------
router.get("/chat", async (req, res, next) => {
  res.locals.source = "openai";
  res.locals.group = "external";

  const message = req.query.message || req.query.msg || req.query.text;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ success: false, error: "Thiếu tham số message" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ success: false, error: "Missing OPENAI_API_KEY" });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ success: false, error: "No response from OpenAI" });
    }

    return res.json({
      success: true,
      source: "openai",
      group: "external",
      role: "assistant",
      content
    });
  } catch (err) {
    console.error("❌ Lỗi gọi OpenAI:", err.response?.status, err.message);
    if (err.response?.data) console.error("Chi tiết:", err.response.data);
    next(err);
  }
});

// -----------------------
// Route /search-news (Google Custom Search API)
// -----------------------
router.get("/search-news", async (req, res, next) => {
  res.locals.source = "google-search";
  res.locals.group = "external";

  const query = req.query.q || req.query.query || req.query.keyword;
  const max = Number(req.query.max) || 5;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ success: false, error: "Thiếu tham số q" });
  }

  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    return res.status(500).json({ success: false, error: "Missing GOOGLE_API_KEY or GOOGLE_CX" });
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${max}`;

  try {
    const response = await axios.get(url);
    const items = Array.isArray(response.data?.items) ? response.data.items : [];

    if (items.length === 0) {
      return res.status(404).json({ success: false, error: "Không tìm thấy kết quả" });
    }

    return res.json({
      success: true,
      source: "google-search",
      group: "external",
      query,
      results: items.map(it => ({
        title: it.title || "",
        snippet: it.snippet || "",
        link: it.link || "",
        displayLink: it.displayLink || ""
      }))
    });
  } catch (err) {
    console.error("❌ Lỗi gọi Google Custom Search:", err.response?.status, err.message);
    if (err.response?.data) console.error("Chi tiết:", err.response.data);
    next(err);
  }
});

// -----------------------
// Route /ask (tích hợp QA Service)
// -----------------------
router.post("/ask", async (req, res, next) => {
  res.locals.source = "qa-service";
  res.locals.group = "internal";

  const { message, sessionId } = req.body;

  // Kiểm tra input
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      error: "Thiếu tham số message",
      timestamp: new Date().toISOString()
    });
  }

  const sid = (typeof sessionId === "string" && sessionId.trim()) || "default";

  try {
    const intent = await classifyIntent(message);
    const answer = await answerByIntent(intent, message, sid);

    return res.json({
      success: true,
      source: "qa-service",
      group: "internal",
      intent,
      sessionId: sid,
      answer,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Lỗi xử lý /ask:", err.message, { message, sessionId });
    return res.status(500).json({
      success: false,
      error: "Internal error khi xử lý câu hỏi",
      timestamp: new Date().toISOString()
    });
  }
});

// -----------------------
// Health check
// -----------------------
router.get("/health", (_req, res) => res.json({ ok: true }));

// -----------------------
// Middleware lỗi
// -----------------------
router.use(checkQuotaError);

router.use((err, req, res, _next) => {
  console.error("❌ Lỗi không xác định:", err?.message || err);
  res.locals.source = res.locals.source || "other";
  res.locals.group = res.locals.group || "other";
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

export default router;