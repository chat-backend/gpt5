// routes/news.js (ESM version)
import express from "express";
import { getNews, TOPIC_KEYWORDS } from "../services/newsService.js";

const router = express.Router();

/**
 * Helper: lọc theo thời gian + phân trang
 */
function filterAndPaginate(articles, { since, page = 1, pageSize = 20 }) {
  let filtered = articles;

  // Lọc theo thời gian
  if (since) {
    const now = new Date();
    let cutoff;
    if (since.endsWith("h")) {
      const hours = parseInt(since.replace("h", ""), 10);
      cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    } else if (since.endsWith("d")) {
      const days = parseInt(since.replace("d", ""), 10);
      cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    if (cutoff) {
      filtered = filtered.filter(a => a.publishedAt && new Date(a.publishedAt) >= cutoff);
    }
  }

  // Phân trang (giới hạn pageSize tối đa 200)
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 200);
  const start = (pageNum - 1) * sizeNum;
  const paged = filtered.slice(start, start + sizeNum);

  return { filtered, paged, pageNum, sizeNum };
}

/**
 * Core handler: dùng chung cho GET và POST
 */
async function handleNewsRequest(query, { since, page, pageSize, topic }) {
  let articles = await getNews(query);

  // Lọc theo topic nếu có
  if (topic) {
    articles = articles.filter(a => a.topic === topic);
  }

  return filterAndPaginate(articles, { since, page, pageSize });
}

/**
 * GET /news?q=...&page=1&pageSize=20&since=24h
 */
router.get("/", async (req, res) => {
  try {
    const { q, page, pageSize, since, topic } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: "Thiếu query (q)" });
    }

    const { filtered, paged, pageNum, sizeNum } = await handleNewsRequest(q, { since, page, pageSize, topic });

    res.json({
      success: true,
      source: "news",
      group: "internal",
      query: q,
      total: filtered.length,
      page: pageNum,
      pageSize: sizeNum,
      articles: paged.map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        publishedAt: a.publishedAt || null,
        topic: a.topic
      }))
    });
  } catch (err) {
    console.error("❌ Lỗi GET /news:", err.message);
    res.status(500).json({ success: false, error: "Không thể lấy tin tức" });
  }
});

/**
 * POST /news { question: "..." }
 */
router.post("/", async (req, res) => {
  try {
    const { question, since, page, pageSize, topic } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: "Thiếu câu hỏi" });
    }

    const { filtered, paged, pageNum, sizeNum } = await handleNewsRequest(question, { since, page, pageSize, topic });

    res.json({
      success: true,
      source: "news",
      group: "internal",
      question,
      total: filtered.length,
      page: pageNum,
      pageSize: sizeNum,
      articles: paged.map(a => ({
        title: a.title,
        url: a.url,
        source: a.source,
        publishedAt: a.publishedAt || null,
        topic: a.topic
      }))
    });
  } catch (err) {
    console.error("❌ Lỗi POST /news:", err.message);
    res.status(500).json({ success: false, error: "Không thể xử lý câu hỏi" });
  }
});

/**
 * GET /news/topics
 */
router.get("/topics", (_req, res) => {
  res.json({
    success: true,
    topics: Object.keys(TOPIC_KEYWORDS)
  });
});

export default router;