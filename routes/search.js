// routes/search.js (ESM version)
import express from "express";
import { googleSearch } from "../services/search.js";
import { formatSearchResults } from "../utils/formatResults.js";

const router = express.Router();

// GET /search?q=...
router.get("/", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Thiếu tham số q" });
  }

  try {
    const results = await googleSearch(query);
    const { text_plain, text_markdown } = formatSearchResults(results, query);

    // ✅ Trả cả JSON gốc + text thuần + text markdown
    res.json({ query, results, text_plain, text_markdown });
  } catch (err) {
    console.error("❌ Lỗi trong route /search:", err.message);
    res.status(500).json({ error: "Lỗi server khi tìm kiếm" });
  }
});

export default router;