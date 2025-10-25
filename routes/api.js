// routes/api.js (ESM version, tối ưu hóa)
import express from "express";
import { askOpenAIWithHistory, refineAnswer } from "../services/ai.js";
import { classifyIntent } from "../services/intentService.js";
import { logger, SOURCES } from "../utils/logger.js";

const apiRouter = express.Router();

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages phải là một mảng và không được rỗng";
  }
  for (const m of messages) {
    if (!m.role || !m.content) {
      return "Mỗi message phải có role và content";
    }
  }
  return null;
}

apiRouter.post("/ask", async (req, res) => {
  const start = Date.now();
  try {
    const { messages, sessionId } = req.body;
    const sid = sessionId || "anonymous";

    // Validate input
    const validationError = validateMessages(messages);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
        timestamp: new Date().toISOString(),
      });
    }

    // Xác định intent từ message cuối của user
    const lastUserMsg = messages.filter(m => m.role === "user").pop();
    const intent = lastUserMsg ? classifyIntent(lastUserMsg.content) : "general";

    logger.info("📩 [API /ask] Nhận request", {
      source: SOURCES.CHAT,
      sessionId: sid,
      messagesCount: messages.length,
      intent,
    });

    // Gọi AI service
    const result = await askOpenAIWithHistory(messages, sid, "", intent);
    const safeAnswer = result.answer ? refineAnswer(result.answer) : "";

    logger.info("✅ [API /ask] Trả lời thành công", {
      source: result.source,
      sessionId: sid,
      intent,
      usage: result.usage || null,
      durationMs: Date.now() - start,
      answerPreview: safeAnswer.slice(0, 120) + "...",
    });

    res.json({
      success: true,
      answer: safeAnswer,
      usage: result.usage || null,
      messages: result.messages || messages,
      source: result.source || "ai",
      intent,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("❌ [API /ask] Lỗi xử lý", {
      source: SOURCES.CHAT,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

export default apiRouter;