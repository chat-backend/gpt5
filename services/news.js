// services/news.js (ESM version)
const express = require("express");
const { getNews } = require("../services/newsService");
const router = express.Router();

// --- Lấy tin tức theo query (GET /news?q=...&limit=20&since=24h) ---
router.get("/", async (req, res) => {
  try {
    const { q, limit, since } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Thiếu hoặc query quá ngắn (q)" });
    }

    const max = Math.min(parseInt(limit, 10) || 20, 50); // mặc định 20, tối đa 50
    const articles = await getNews(q, max, since);

    res.locals.source = "news";
    res.locals.group = "external";

    console.info(`📡 GET /news?q=${q}&limit=${max}&since=${since || "none"} → ${articles.length} tin`);

    res.json({
      success: true,
      source: "news",
      group: "external",
      query: q,
      since: since || null,
      count: articles.length,
      articles
    });
  } catch (err) {
    console.error("❌ Lỗi lấy tin tức:", err.message);

    res.locals.source = "news";
    res.locals.group = "external";

    res.status(500).json({
      success: false,
      source: "news",
      group: "external",
      error: "Không thể lấy tin tức",
      details: err.message
    });
  }
});

// --- Hỏi tin tức bằng POST (POST /news { question: "...", limit: 30, since: "24h" }) ---
router.post("/", async (req, res) => {
  try {
    const { question, limit, since } = req.body;
    if (!question || question.trim().length < 2) {
      return res.status(400).json({ error: "Thiếu hoặc câu hỏi quá ngắn" });
    }

    const max = Math.min(parseInt(limit, 10) || 20, 50);
    const articles = await getNews(question, max, since);

    res.locals.source = "news";
    res.locals.group = "external";

    console.info(`📡 POST /news { question="${question}", limit=${max}, since=${since || "none"} } → ${articles.length} tin`);

    res.json({
      success: true,
      source: "news",
      group: "external",
      question,
      since: since || null,
      count: articles.length,
      articles
    });
  } catch (err) {
    console.error("❌ Lỗi xử lý câu hỏi tin tức:", err.message);

    res.locals.source = "news";
    res.locals.group = "external";

    res.status(500).json({
      success: false,
      source: "news",
      group: "external",
      error: "Không thể xử lý câu hỏi",
      details: err.message
    });
  }
});

// --- Lấy tin tức mới nhất (GET /news/latest?limit=20&since=24h) ---
router.get("/latest", async (req, res) => {
  try {
    const { limit, since } = req.query;
    const max = Math.min(parseInt(limit, 10) || 20, 50); // mặc định 20, tối đa 50

    const articles = await getNews("", max, since);

    res.locals.source = "news";
    res.locals.group = "external";

    console.info(`📡 GET /news/latest?limit=${max}&since=${since || "none"} → ${articles.length} tin`);

    res.json({
      success: true,
      source: "news",
      group: "external",
      latest: true,
      since: since || null,
      count: articles.length,
      articles
    });
  } catch (err) {
    console.error("❌ Lỗi lấy tin tức mới nhất:", err.message);

    res.locals.source = "news";
    res.locals.group = "external";

    res.status(500).json({
      success: false,
      source: "news",
      group: "external",
      error: "Không thể lấy tin tức mới nhất",
      details: err.message
    });
  }
});

module.exports = router;