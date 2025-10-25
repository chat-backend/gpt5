// services/fallback.js (ESM version)
import { askAIWithRetry } from "./aiWrapper.js";

/**
 * Fallback cuối cùng: luôn gọi AI để cố gắng trả lời bất kỳ câu hỏi nào.
 * Đồng thời log lại sessionId + query để dễ debug.
 * @param {string} sessionId
 * @param {string} query
 * @param {Array} history
 * @returns {Promise<string>}
 */
export async function getFallbackAnswer(sessionId, query, history = []) {
  console.log("⚠️ [FALLBACK] Rơi vào fallback");
  console.log("   👉 sessionId:", sessionId);
  console.log("   👉 query:", query);

  try {
    const aiAnswer = await askAIWithRetry(
      sessionId,
      { message: query, history },
      12000,
      2
    );

    // Chuẩn hóa kết quả thành string
    if (typeof aiAnswer === "object" && aiAnswer !== null) {
      return aiAnswer.answer || aiAnswer.content || JSON.stringify(aiAnswer);
    }
    return String(aiAnswer ?? "");
  } catch (err) {
    console.error("❌ Lỗi getFallbackAnswer:", err.message);
    // Nếu AI cũng lỗi, mới trả về câu fallback mặc định
    return "Xin lỗi, hiện tại mình chưa thể xử lý yêu cầu này.";
  }
}