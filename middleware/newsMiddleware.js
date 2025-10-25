// middleware/newsMiddleware.js
const { getNewsCache } = require("../cronjobs"); // lấy cache RAM

const fetchNews = async (req, res, next) => {
  try {
    const { q = "", limit = 20, since } = req.query;

    // Lấy toàn bộ cache RAM (1000 tin mới nhất)
    let articles = getNewsCache() || [];

    // Lọc theo từ khóa nếu có
    if (q) {
      const keyword = q.toLowerCase();
      articles = articles.filter(
        a =>
          a.title?.toLowerCase().includes(keyword) ||
          a.content?.toLowerCase().includes(keyword)
      );
    }

    // Lọc theo thời gian (since=24h, 2d, ...)
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
        articles = articles.filter(a => a.publishedAt && new Date(a.publishedAt) >= cutoff);
      }
    }

    // Sắp xếp mới nhất trước
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Giới hạn số lượng
    const limited = articles.slice(0, Number(limit));

    // Chuẩn hóa dữ liệu trả về
    const result = limited.map(a => ({
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      topic: a.topic,
    }));

    return res.json({
      source: "cache-ram",
      query: q,
      total: articles.length,
      articles: result,
    });
  } catch (error) {
    console.error("❌ Lỗi trong fetchNews middleware:", error.message);
    return res.json({
      source: "none",
      articles: [],
      note: "Không thể lấy tin tức từ cache RAM.",
    });
  }
};

module.exports = fetchNews;