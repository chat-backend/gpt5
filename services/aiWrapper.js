// services/aiWrapper.js (ESM version, optimized & sanitized)
import { askAI } from "./ai.js";

/**
 * Làm sạch output AI: bỏ các intro lỗi kỹ thuật, xin lỗi thừa
 */
function sanitizeAIOutput(text = "") {
  return text
    .replace(/^Có vẻ như.*?(sự cố|lỗi|trục trặc|vấn đề).*?\.\s*/gi, "")
    .replace(/^(Xin lỗi|Tôi xin lỗi|Rất tiếc).*?\.\s*/gi, "")
    .replace(/^(Tuy nhiên, )?nếu bạn.*?(muốn|cần).*?(viết tiếp|mở rộng|kết luận).*?\.\s*/gi, "")
    .trim();
}

/**
 * Gọi askAI với timeout + retry + hỗ trợ history (liền mạch hội thoại)
 * @param {string} sessionId
 * @param {string|object} payload - message hoặc { message, history }
 * @param {number} timeoutMs - thời gian tối đa (ms) cho mỗi lần gọi
 * @param {number} maxRetries - số lần thử lại
 * @returns {Promise<string>} - câu trả lời hoặc fallback
 */
export async function askAIWithRetry(
  sessionId,
  payload,
  timeoutMs = 8000,
  maxRetries = 1
) {
  async function callWithTimeout() {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Timeout")), timeoutMs)
    );
    return Promise.race([askAI(sessionId, payload), timeoutPromise]);
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      attempt++;
      if (process.env.NODE_ENV !== "production") {
        console.log(`🚀 askAI attempt ${attempt} (session=${sessionId})`);
      }
      let answer = await callWithTimeout();

      // Chuẩn hóa kiểu dữ liệu
      if (typeof answer === "object" && answer !== null) {
        answer = answer.answer || answer.content || JSON.stringify(answer);
      }
      if (typeof answer !== "string") {
        answer = String(answer || "");
      }

      // Nếu trả về rỗng → thử lại
      if (!answer.trim()) {
        throw new Error("Empty AI response");
      }

      // Làm sạch output trước khi trả về
      return sanitizeAIOutput(answer);
    } catch (err) {
      console.error(`⚠️ askAI attempt ${attempt} failed:`, err.message);

      if (attempt > maxRetries) {
        // fallback thông minh hơn: nếu có history thì gợi ý user
        if (typeof payload === "object" && payload.history?.length) {
          const lastUserMsg = payload.history
            .slice()
            .reverse()
            .find((m) => m.role === "user")?.content;

          return `Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này (AI quá tải hoặc phản hồi chậm).
Tuy nhiên, bạn vừa hỏi: "${lastUserMsg}". Bạn có thể thử diễn đạt lại hoặc hỏi chi tiết hơn.`;
        }

        return "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này (AI quá tải hoặc phản hồi chậm).";
      }

      // exponential backoff: 500ms, 1000ms, 2000ms...
      const delay = 500 * Math.pow(2, attempt - 1);
      if (process.env.NODE_ENV !== "production") {
        console.log(`⏳ Retry sau ${delay}ms...`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}