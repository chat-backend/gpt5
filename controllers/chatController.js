// controllers/chatController.js (ESM version)
import { getNewsByCategory } from "../services/cacheService.js";
import { keywordToCategory } from "../config/keywordMapping.js";
import { classifyQuery } from "../services/classifier.js"; // hoặc intentService.js
import { answerByIntent } from "../services/answerByIntent.js";

let conversationState = {};

/* ---------------- Tiện ích quản lý bộ nhớ ---------------- */
function getUserState(userId) {
  if (!conversationState[userId]) {
    conversationState[userId] = { lastCategory: null, history: [] };
  }
  return conversationState[userId];
}

function updateUserState(userId, { category, userMsg, botReply }) {
  const state = getUserState(userId);
  if (category) state.lastCategory = category;
  if (userMsg) state.history.push({ role: "user", content: userMsg });
  if (botReply) state.history.push({ role: "assistant", content: botReply });

  // Giới hạn history tối đa 50 lượt
  if (state.history.length > 50) state.history.shift();
}

/* ---------------- Xử lý hội thoại ---------------- */
export async function handleChat(userId, message) {
  const state = getUserState(userId);
  updateUserState(userId, { userMsg: message });

  // 1. Phân loại intent
  const intent = await classifyQuery(message);

  // 2. Nếu intent là news → xử lý riêng
  if (intent === "news") {
    let detectedCategory = null;
    const lowerMsg = message.toLowerCase();

    // map từ khóa → chủ đề
    for (const [keyword, category] of Object.entries(keywordToCategory)) {
      if (lowerMsg.includes(keyword)) {
        detectedCategory = category;
        break;
      }
    }

    // fallback dùng chủ đề trước
    if (!detectedCategory && state.lastCategory) {
      detectedCategory = state.lastCategory;
    }

    if (!detectedCategory) {
      return { type: "no-category", history: state.history };
    }

    // lấy tin từ cache
    let newsList = [];
    try {
      newsList = await getNewsByCategory(detectedCategory);
    } catch (e) {
      console.error("Lỗi lấy tin:", e);
    }

    if (!newsList || newsList.length === 0) {
      return { type: "no-news", category: detectedCategory, history: state.history };
    }

    // Có tin tức
    const latestNews = newsList.slice(0, 2);
    let reply = `📰 Tin mới nhất về **${detectedCategory}**:\n`;
    latestNews.forEach((news, idx) => {
      reply += `\n${idx + 1}. ${news.title}\n   👉 ${news.link}`;
      if (news.description) {
        reply += `\n   Tóm tắt: ${news.description.slice(0, 120)}...`;
      }
    });

    updateUserState(userId, { category: detectedCategory, botReply: reply });

    return {
      type: "news",
      reply,
      category: detectedCategory,
      history: state.history,
      historyLength: state.history.length
    };
  }

  // 3. Các intent khác → gọi answerByIntent
  const aiReply = await answerByIntent(intent, message, userId, state.history);
  updateUserState(userId, { botReply: aiReply });

  return {
    type: intent,
    reply: aiReply,
    history: state.history,
    historyLength: state.history.length
  };
}