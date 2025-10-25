// routes/assistant.js (ESM version)
// =======================================
// Router xử lý hội thoại với trợ lý AI
// Sử dụng bộ nhớ hội thoại tổng hợp (conversationMemory.js)
// =======================================

import express from "express";
import OpenAI from "openai";
import {
  addMessage,
  getConversation,
  clearConversation,
  listSessions,
  buildContextForAI
} from "../services/memory.js";

const router = express.Router();

// Khởi tạo OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cấu hình mặc định
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE ?? 0.7);
const DEFAULT_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? "1500", 10);

// System prompt mặc định
const SYSTEM_PROMPT = {
  role: "system",
  content:
    "Bạn là Trợ lý Thông Tuệ – một giáo sư minh triết, diễn đạt rõ ràng, mạch lạc, có năng lực phân tích sâu, kết nối tri thức liên ngành. " +
    "Luôn lắng nghe ý định người hỏi, trả lời chính xác, súc tích nhưng đủ chiều sâu."
};

/**
 * POST /assistant/ask
 * Body: { sessionId: string, question: string, style?: string }
 * → Hỏi AI, lưu hội thoại, trả về câu trả lời
 */
router.post("/ask", async (req, res) => {
  try {
    const { sessionId, question, style } = req.body;
    if (!sessionId || !question) {
      return res.status(400).json({ error: "Thiếu sessionId hoặc question" });
    }

    // Lưu tin nhắn user
    addMessage(sessionId, "user", question);

    // Lấy hội thoại để gửi cho AI
    const messages = await getConversationForAI(sessionId);

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [SYSTEM_PROMPT, ...messages],
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS
    });

    const assistantReply = response.choices?.[0]?.message?.content?.trim() || "";

    // Lưu phản hồi
    addMessage(sessionId, "assistant", assistantReply);

    return res.json({
      sessionId,
      style: style || "default",
      question,
      answer: assistantReply
    });
  } catch (err) {
    console.error("❌ Lỗi /ask:", err.message);
    res.status(500).json({ error: "Lỗi server khi xử lý câu hỏi" });
  }
});

/**
 * POST /assistant/summarize
 * Body: { sessionId: string, style?: string }
 * → Tóm tắt hội thoại (nếu backend hỗ trợ)
 */
router.post("/summarize", async (req, res) => {
  try {
    const { sessionId, style } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Thiếu sessionId" });
    }

    // Nếu backend là Redis+Summary thì tóm tắt tự động
    // Nếu không, trả về thông báo
    return res.json({
      message:
        process.env.MEMORY_BACKEND === "summary"
          ? `✅ Redis+Summary backend sẽ tự động tóm tắt khi vượt ngưỡng.`
          : "⚠️ Backend hiện tại không hỗ trợ tóm tắt thủ công.",
      summary: null
    });
  } catch (err) {
    console.error("❌ Lỗi /summarize:", err.message);
    res.status(500).json({ error: "Lỗi server khi tóm tắt hội thoại" });
  }
});

/**
 * POST /assistant/reset
 * Body: { sessionId: string }
 * → Xóa sạch hội thoại của session
 */
router.post("/reset", (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Thiếu sessionId" });
    }

    clearConversation(sessionId);

    return res.json({
      message: `✅ Đã xóa sạch hội thoại cho session: ${sessionId}`,
      sessionId
    });
  } catch (err) {
    console.error("❌ Lỗi /reset:", err.message);
    res.status(500).json({ error: "Lỗi server khi reset hội thoại" });
  }
});

export default router;