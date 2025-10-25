// sources/generalSource.js (ESM version)

import { askOpenAIWithHistory, refineAnswer } from "../ai.js";

export async function fetchGeneral(query, sessionId = "default") {
  try {
    const prompt = `
      Hãy cung cấp thông tin tổng quát, rõ ràng, dễ hiểu về chủ đề sau:
      "${query}"
      - Viết thành một đoạn văn mạch lạc, không liệt kê danh sách.
      - Nếu là khái niệm, hãy giải thích ngắn gọn.
      - Nếu là sự kiện, hãy tóm tắt chính xác.
      - Không nhắc lại nguyên văn câu hỏi.
      - Trình bày trực tiếp, súc tích, dễ hiểu.
      - Giữ văn phong tự nhiên, không vượt quá 150 từ.
    `;

    const result = await askOpenAIWithHistory(
      [{ role: "user", content: prompt }],
      sessionId,
      "",
      "knowledge"
    );

    const safeText = refineAnswer(result.answer);

    return {
      text: safeText,
      link: null, // có thể bổ sung link Wikipedia nếu muốn
      source: "ai-general",
      queryUsed: query,
      fetchedAt: new Date().toISOString(),
      confidence: "medium"
    };
  } catch (err) {
    return {
      text: `Không thể lấy thông tin tổng quát cho: "${query}". Vui lòng thử lại với câu hỏi cụ thể hơn.`,
      link: null,
      source: "error",
      error: err.message,
      queryUsed: query,
      fetchedAt: new Date().toISOString(),
      confidence: "low"
    };
  }
}