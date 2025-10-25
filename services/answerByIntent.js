// services/answerByIntent.js (ESM version)
import { getKnowledgeAnswer } from "./knowledge.js";
import { formatAnswer } from "./answerFormatter.js";
import { getFallbackAnswer } from "./fallback.js";
import { fallbackAI } from "./qaService.js"; // thêm import fallbackAI

/**
 * Điều phối intent và trả về câu trả lời đã format
 * @param {string} intent - intent đã phân loại
 * @param {string} query - câu hỏi gốc của user
 * @param {string} sessionId - id phiên hội thoại
 * @param {Array} history - lịch sử hội thoại (nếu có)
 */
export async function answerByIntent(intent, query, sessionId = "default", history = []) {
  try {
    let result;
    let targetIntent = intent;

    console.log("=== [answerByIntent] DEBUG ===");
    console.log("👉 Intent gốc:", intent);
    console.log("👉 Query:", query);
    console.log("👉 SessionId:", sessionId);

    switch (intent) {
      case "knowledge":
        result = await getKnowledgeAnswer(query, sessionId, "knowledge", history);
        break;

      case "expand":
        // dùng fallbackAI để nối mạch hội thoại
        const fbExpand = await fallbackAI(query, sessionId);
        return formatAnswer("knowledge", fbExpand, "ai-fallback");

      case "short":
        result = await getKnowledgeAnswer(query, sessionId, "short", history);
        targetIntent = "knowledge"; // format như knowledge
        break;

      default:
        result = await getKnowledgeAnswer(query, sessionId, "knowledge", history);
        targetIntent = "knowledge";
        break;
    }

    // Chuẩn hóa kết quả
    const safeAnswer =
      typeof result?.answer === "string"
        ? result.answer
        : String(result?.answer ?? "");

    const safeSource = result?.source || "ai";

    console.log("🎯 Intent sau map:", targetIntent);
    console.log("📝 Preview answer:", safeAnswer.slice(0, 120));

    return formatAnswer(targetIntent, safeAnswer, safeSource);
  } catch (err) {
    console.error("❌ Lỗi answerByIntent:", err.message);
    console.error("   👉 intent:", intent);
    console.error("   👉 query:", query);
    console.error("   👉 sessionId:", sessionId);

    try {
      // Gọi fallback AI
      const fb = await getFallbackAnswer(sessionId, query, history);

      const safeFb =
        typeof fb === "string"
          ? fb
          : String(fb ?? "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.");

      return formatAnswer(intent, safeFb, "ai-fallback");
    } catch (fbErr) {
      console.error("❌ Lỗi getFallbackAnswer:", fbErr.message);
      return formatAnswer(
        intent,
        "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.",
        "system"
      );
    }
  }
}