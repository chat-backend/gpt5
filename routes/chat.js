// routes/chat.js (ESM version, hoàn chỉnh, chuẩn REST)
import express from "express";

import { provincesVN34 } from "../utils/normalizeCity.js";
import { extractMessage } from "../services/chatService.js";
import { answerByIntent } from "../services/qaService.js";
import { classifyQuery, mapGroup } from "../services/classifier.js";
import { formatAnswer } from "../services/answerFormatter.js";
import { knowledgeBaseMiddleware } from "../services/knowledgeBaseRouter.js";
import { answerLogger } from "../middleware/logger.js";
import {
  addMessage,
  getConversation,
  clearConversation,
  listSessions,
  autoSummarize,
} from "../services/memory.js";
import { askAIWithRetry } from "../services/aiWrapper.js";
import { handleChat } from "../controllers/chatController.js";

// ✅ MongoDB models
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const router = express.Router();

/* ---------------- API quản lý hội thoại (Memory) ---------------- */

// Lấy lịch sử hội thoại từ memory (20 tin nhắn gần nhất)
router.get("/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const conv = (await getConversation(sessionId)) || [];
  const recent = conv.slice(-20);

  res.json({ success: true, sessionId, count: recent.length, messages: recent });
});

// Danh sách session (memory)
router.get("/sessions", async (_req, res) => {
  const sessions = await listSessions();
  res.json({ success: true, sessions });
});

// Xóa hội thoại (memory)
router.delete("/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  await clearConversation(sessionId);
  res.json({ success: true, sessionId, message: "Đã xóa hội thoại" });
});

/* ---------------- API quản lý hội thoại (MongoDB) ---------------- */

// Lấy lịch sử hội thoại từ MongoDB
router.get("/history/db/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      conversationId,
      count: messages.length,
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("❌ Lỗi lấy lịch sử từ MongoDB:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/* ---------------- MAIN CHAT ENDPOINT ---------------- */
router.post("/", knowledgeBaseMiddleware, async (req, res) => {
  try {
    const message =
      (req.body?.message || req.body?.q || extractMessage(req) || "").trim();
    const sessionId = req.body.sessionId || req.query.sessionId || "default";
    const userId = req.body.userId || sessionId;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, error: "Thiếu message trong request" });
    }
    if (message.length > 2000) {
      return res
        .status(400)
        .json({ success: false, error: "Message quá dài (tối đa 2000 ký tự)" });
    }

   // ✅ Tạo conversation nếu chưa có
let conversation = await Conversation.findOne({ sessionId, isActive: true });
if (!conversation) {
  conversation = await Conversation.create({
    sessionId,
    userId,
    isActive: true,
    startedAt: new Date(),
  });
}
const conversationId = conversation._id;

// ✅ Chuẩn hóa text để tìm tỉnh/thành
const normMsg = message.toLowerCase();
const foundProvince = provincesVN34.find((p) => normMsg.includes(p.toLowerCase()));

if (foundProvince) {
  const reply = `Bạn đang hỏi về **${foundProvince}**. Đây là một trong 34 tỉnh/thành sau sáp nhập hành chính 2025.`;

  // Lưu vào memory
  await addMessage(sessionId, "user", message);
  await addMessage(sessionId, "assistant", reply);

  // Lưu vào MongoDB
  await Message.insertMany([
    {
      conversationId,
      sessionId,
      userId, // user thật từ request
      role: "user",
      content: message,
      createdAt: new Date(),
    },
    {
      conversationId,
      sessionId,
      userId: "assistant", // cố định cho bot
      role: "assistant",
      content: reply,
      createdAt: new Date(),
    },
  ]);

  return res.json({
    success: true,
    intent: "province-check",
    reply,
    answer: reply,
    sessionId,
    conversationId,
    timestamp: new Date().toISOString(),
    source: "chat-backend",
  });
}

// 👉 Gọi handleChat để xử lý tin tức (đảm bảo giá trị mặc định an toàn)
const newsResult =
  (await handleChat(userId, message)) ||
  { type: null, reply: null, category: null, history: [] };

if (newsResult.type === "news") {
  // Lưu vào memory
  await addMessage(sessionId, "user", message);
  await addMessage(sessionId, "assistant", newsResult.reply);

  // Lưu vào MongoDB
  await Message.insertMany([
    {
      conversationId,
      sessionId,
      userId,
      role: "user",
      content: message,
      createdAt: new Date(),
    },
    {
      conversationId,
      sessionId,
      userId: "assistant",
      role: "assistant",
      content: newsResult.reply,
      createdAt: new Date(),
    },
  ]);

  return res.json({
    success: true,
    intent: "news",
    reply: newsResult.reply,
    answer: newsResult.reply,
    sessionId,
    conversationId,
    timestamp: new Date().toISOString(),
    source: "news-cache",
    category: newsResult.category,
  });
}

// Nếu không có category hoặc không có tin → fallback QA/AI
const intent = await classifyQuery(message);
const group = mapGroup(intent);

// Lưu user message vào memory và DB
await addMessage(sessionId, "user", message, {
  intent,
  category: newsResult.category,
});

await Message.create({
  conversationId,
  sessionId,
  userId,
  role: "user",
  content: message,
  createdAt: new Date(),
});

// Thử trả lời theo intent trước, rồi fallback AI nếu cần
let rawAnswer;
let source;

try {
  const result = (await answerByIntent(intent, message, sessionId)) || {};
  rawAnswer = result.answer;
  source = result.source || "qa";
} catch (e) {
  console.error("❌ answerByIntent error:", e.message);
  rawAnswer = null;
  source = "qa-error";
}

if (!rawAnswer) {
  try {
    rawAnswer = await askAIWithRetry(
      sessionId,
      { message, history: newsResult.history || [] },
      8000,
      1
    );
    source = "AI";
  } catch (e) {
    console.error("❌ askAIWithRetry error:", e.message);
    rawAnswer = "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.";
    source = "AI-fallback";
  }
}

// Định dạng câu trả lời cuối
let formatted;
try {
  formatted = formatAnswer(intent, rawAnswer, source) || rawAnswer;
} catch {
  formatted = rawAnswer;
}

// Lưu assistant message vào memory và DB
await addMessage(sessionId, "assistant", formatted);
await autoSummarize(sessionId);

await Message.create({
  conversationId,
  sessionId,
  userId: "assistant",
  role: "assistant",
  content: formatted,
  createdAt: new Date(),
});

// Log và trả về
answerLogger(message, intent, formatted, group);
console.log(`✅ Reply to [${sessionId}]: ${formatted}`);

return res.json({
  success: true,
  intent,
  reply: formatted,
  answer: formatted,
  sessionId,
  conversationId,
  timestamp: new Date().toISOString(),
  source: source || "chat-backend",
  category: newsResult.category,
});
  } catch (err) {
    console.error("❌ Error in POST /chat:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Lấy lịch sử hội thoại kết hợp (memory + MongoDB)
router.get("/history/combined/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);

    // 1. Lấy từ memory trước
    let messages = (await getConversation(sessionId)) || [];

    // 2. Nếu memory không đủ → bổ sung từ MongoDB
    if (messages.length < limit) {
      const conv = await Conversation.findOne({ sessionId, isActive: true })
        .sort({ startedAt: -1 })
        .lean();

      if (conv) {
        const dbMessages = await Message.find({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .limit(limit - messages.length)
          .lean();

       messages = [...dbMessages.reverse(), ...messages];
      }
    }

    // 3. Đảm bảo không vượt quá limit
    if (messages.length > limit) {
      messages = messages.slice(-limit);
    }

    res.json({
      success: true,
      sessionId,
      count: messages.length,
      messages,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy lịch sử kết hợp:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Kết thúc hội thoại (theo sessionId)
router.post("/end/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conv = await Conversation.findOneAndUpdate(
      { sessionId, isActive: true },
      { isActive: false, endedAt: new Date() },
      { new: true }
    ).lean();

    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hội thoại đang mở",
      });
    }

    return res.json({
      success: true,
      message: "Hội thoại đã được kết thúc",
      conversation: conv,
    });
  } catch (err) {
    console.error("❌ Lỗi khi kết thúc hội thoại:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

export default router;