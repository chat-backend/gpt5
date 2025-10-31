// routes/askAI.js (ESM version)

import dotenv from "dotenv";
import OpenAI from "openai";
import { addMessage, buildContextForAI } from "./memory.js";
import { classifyQuery } from "./classifier.js";

dotenv.config();

// --- Khởi tạo OpenAI client ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- System prompt cơ bản ---
const BASE_SYSTEM_PROMPT = `
Bạn là một trợ lý AI thông minh, hãy trả lời tự nhiên, chính xác và dễ hiểu.
Bạn luôn nối mạch hội thoại, phân tích và mở rộng khi cần.
`;

// --- Hàm chính: askAI ---
export async function askAI(sessionId, userMessage) {
  // 1. Phân loại intent
  const intent = await classifyQuery(userMessage);
  addMessage(sessionId, "user", userMessage, { intent });

  let answer;
  let source = "ai"; // mặc định

  // 2. Luôn để AI trả lời trực tiếp (không còn gọi Wikipedia)
  const contextMessages = await buildContextForAI(sessionId);
  const messages = [
    { role: "system", content: BASE_SYSTEM_PROMPT },
    ...contextMessages,
    { role: "user", content: userMessage }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 800
    });
    answer = response.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Lỗi gọi OpenAI:", err.message);
    return { message: "⚠️ Không thể kết nối AI, vui lòng thử lại.", source: "ai", error: true };
  }

  // 3. Lưu vào memory
  addMessage(sessionId, "assistant", answer, { intent: "ai-response", source });

 // 4. Trả về object chuẩn
return {
  message: answer,
  source: "ai",
  error: false
  };
}

