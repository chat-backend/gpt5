// sources/philosophySource.js (ESM version)

import { askOpenAIWithHistory, refineAnswer } from "../ai.js";

export async function fetchPhilosophy(query, sessionId = "default") {
  try {
    const prompt = `
      Hãy phân tích và diễn giải triết lý, minh triết nhân sinh dựa trên câu hỏi sau:
      "${query}"
      - Trình bày rõ ràng, sâu sắc, dễ hiểu.
      - Không liệt kê danh sách, mà viết thành một đoạn văn mạch lạc.
      - Không nhắc lại nguyên văn câu hỏi.
      - Trả lời trực tiếp, súc tích, nhưng vẫn sâu sắc.
      - Văn phong tự nhiên, dễ hiểu.
      - Độ dài khoảng 1–2 đoạn văn, không quá ngắn cũng không quá dài.
    `;

    const result = await askOpenAIWithHistory(
      [{ role: "user", content: prompt }],
      sessionId,
      "",
      "philosophy"
    );

    const safeText = refineAnswer(result.answer);

    return {
      text: safeText,
      link: null, // có thể bổ sung link tham khảo nếu muốn
      source: "ai-philosophy",
      queryUsed: query,
      fetchedAt: new Date().toISOString(),
      confidence: "high"
    };
  } catch (err) {
    return {
      text: `Không thể phân tích triết lý cho câu hỏi: "${query}". Vui lòng thử lại hoặc đặt câu hỏi khác.`,
      link: null,
      source: "error",
      error: err.message,
      queryUsed: query,
      fetchedAt: new Date().toISOString(),
      confidence: "low"
    };
  }
}