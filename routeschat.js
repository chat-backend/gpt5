// routes/chat.js (ESM version)
import { Router } from "express";
import { answerLogger } from "../middleware/logger.js";

const router = Router();

/**
 * 📌 Chat Router
 * - Nhận query từ client (POST /chat)
 * - Sinh câu trả lời (tạm thời mock để test)
 * - Ghi log bằng answerLogger
 * - Trả về JSON { answer }
 */
router.post("/", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Thiếu hoặc sai định dạng query" });
    }

    // ⚡️ Tạm thời mock câu trả lời để test
    const answer = `💡 Đây là phản hồi mẫu cho câu hỏi: "${query}"`;

    // Ghi log (intent tạm để null, có thể tích hợp NLP sau)
    answerLogger(query, "chat", answer, null);

    // ✅ Trả về cho client
    res.json({ answer });
  } catch (err) {
    console.error("❌ Lỗi trong /chat:", err.message);
    res.status(500).json({ error: "Không thể xử lý yêu cầu chat" });
  }
});

export default router;