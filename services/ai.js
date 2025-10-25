// services/ai.js (ESM version, full fallback 4 sources, nâng cấp minh triết)
import dotenv from "dotenv";
import OpenAI from "openai";
import {
  addMessage,
  buildContextForAI,
  clearConversation,
  getSessionInfo,
  autoSummarize,
  getLastMessage,
  getLastAnswer
} from "./memory.js";
import {
  fetchWikiSummary,
  fetchBuddhismDictionary,
  fetchGeneralDictionary
} from "./knowledge.js";
import { googleSearch } from "./search.js";

dotenv.config();

// --- OpenAI client ---
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: Number(process.env.OPENAI_TIMEOUT ?? 20000)
    });
  } catch (err) {
    console.error("❌ Không thể khởi tạo OpenAI client:", err.message);
  }
} else {
  console.warn("⚠️ OPENAI_API_KEY chưa được cấu hình trong .env");
}

// --- Cấu hình mặc định ---
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE ?? 0.7);
const DEFAULT_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? "800", 10);

// --- System prompt mạnh mẽ ---
const BASE_SYSTEM_PROMPT =
  "Bạn là Trợ lý Thông Tuệ – một bậc thầy minh triết, diễn đạt rõ ràng, mạch lạc, có năng lực phân tích sâu, kết nối tri thức liên ngành. " +
  "Luôn lắng nghe ý định người hỏi, trả lời chính xác, súc tích nhưng đủ chiều sâu. " +
  "Giữ phong cách ôn hoà, lập luận logic, văn phong thiền vị, tránh liệt kê khô cứng. " +
  "Luôn nối mạch từ câu trả lời trước, không lặp lại nguyên văn. " +
  "Khi chủ đề liên quan Phật học, triết học, nhân sinh: hãy đào sâu minh triết, liên hệ thực hành (thiền, quán chiếu, ứng dụng đời sống). " +
  "Nếu người dùng yêu cầu 'viết tiếp', 'mở rộng', 'kết luận' hoặc 'tóm tắt', hãy nối mạch từ câu trả lời trước đó thay vì lặp lại.";

// --- Hàm tiện ích ---
function normalizeUserMessage(text) {
  const cleaned = String(text || "").trim();
  return cleaned.length ? cleaned : null;
}
function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length > 0;
}

// --- Retry khi gọi OpenAI ---
async function callOpenAIWithRetry(payload, retries = 1, delayMs = 800) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await openai.chat.completions.create(payload);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

// --- Default answer theo intent ---
function defaultAnswerByIntent(intent, userMsg = "") {
  if (intent === "explain") return "Đây là khái niệm thuộc Phật học. Bạn muốn mình giải thích theo cách ngắn gọn hay chi tiết?";
  if (intent === "short") return "Tóm gọn: hiện chưa có dữ liệu sẵn. Bạn muốn mình thử tìm nhanh nguồn đáng tin?";
  if (intent === "expand") return "Bạn muốn mở rộng nội dung theo hướng nào: lịch sử, thực hành, hay ví dụ ứng dụng?";
  if (intent === "conclude") return "Bạn muốn mình viết đoạn kết luận ngắn gọn, tổng hợp ý chính từ nội dung trước đó?";
  if (intent === "summarize") return "Bạn muốn mình tóm tắt ngắn gọn, chỉ nêu ý chính từ nội dung trước đó?";
  if (intent === "knowledge") return "Mình đang thiếu dữ liệu tức thì. Bạn muốn mình tra cứu nhanh từ Wikipedia, Google hoặc Từ điển?";
  return "Mình chưa có dữ liệu tức thời. Bạn có thể nêu rõ hơn ý định để mình hỗ trợ chính xác?";
}

// --- Fallback 4 nguồn + bọc AI ---
async function getFallbackAnswer(userMsg, intent) {
  let fallback = null;
  let source = "default";

  try {
    // 1. Wikipedia
    const wiki = await fetchWikiSummary(userMsg);
    if (wiki?.extract && isNonEmptyString(wiki.extract)) {
      fallback = wiki.extract.trim();
      source = "wiki";
    }

    // 2. Google
    if (!fallback) {
      const googleResults = await googleSearch(userMsg);
      if (googleResults && googleResults.length > 0) {
        const snippets = googleResults.map(r => r.snippet).filter(Boolean).join(" | ");
        if (isNonEmptyString(snippets)) {
          fallback = snippets.trim();
          source = "google";
        }
      }
    }

    // 3. Từ điển Phật học
    if (!fallback) {
      const buddhism = await fetchBuddhismDictionary(userMsg);
      if (isNonEmptyString(buddhism)) {
        fallback = buddhism.trim();
        source = "buddhism";
      }
    }

    // 4. Từ điển tổng hợp
    if (!fallback) {
      const general = await fetchGeneralDictionary(userMsg);
      if (isNonEmptyString(general)) {
        fallback = general.trim();
        source = "general";
      }
    }
  } catch (e) {
    console.error("❌ Fallback fetch error:", e.message);
  }

  let safeFallback = isNonEmptyString(fallback)
    ? fallback
    : defaultAnswerByIntent(intent, userMsg);

  // Bọc fallback bằng AI để giữ phong cách minh triết
  if (openai && isNonEmptyString(fallback)) {
    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: BASE_SYSTEM_PROMPT },
          { role: "user", content: `Hãy diễn đạt lại đoạn sau thành văn phong minh triết, mạch lạc, nối mạch hội thoại:\n\n${fallback}` }
        ],
        temperature: 0.6,
        max_tokens: DEFAULT_MAX_TOKENS
      });
      const refined = response?.choices?.[0]?.message?.content;
      if (isNonEmptyString(refined)) {
        safeFallback = refined.trim();
      }
    } catch (err) {
      console.error("❌ Fallback rephrase error:", err.message);
    }
  }

  return { answer: safeFallback, source };
}

/**
 * Gọi OpenAI với lịch sử hội thoại + system prompt
 */
export async function askOpenAIWithHistory(messages, sessionId = "anonymous", dynamicPrompt = "", intent = "general") {
  if (!openai) {
    return { answer: defaultAnswerByIntent(intent, messages?.at(-1)?.content || ""), messages };
  }

  try {
    const systemPrompt = { role: "system", content: BASE_SYSTEM_PROMPT + (isNonEmptyString(dynamicPrompt) ? "\n" + dynamicPrompt : "") };
    const finalMessages = messages && messages.length > 0 ? [systemPrompt, ...messages] : [systemPrompt];

    const payload = {
      model: DEFAULT_MODEL,
      messages: finalMessages,
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS
    };

    const response = await callOpenAIWithRetry(payload, 2, 1000);
    let choice = response?.choices?.[0]?.message?.content ?? "";

    if (!isNonEmptyString(choice)) {
      const lastUserMsg = finalMessages?.at(-1)?.content || "";
      const fb = await getFallbackAnswer(lastUserMsg, intent);
      return { answer: fb.answer, usage: response?.usage || null, messages: finalMessages, source: fb.source };
    }

    const answer = refineAnswer(choice);
    return { answer, usage: response?.usage || null, messages: finalMessages, source: "ai" };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ OpenAI API error:", err.message, err.stack, { sessionId });
    }
    const lastUserMsg = messages?.filter(m => m.role === "user").pop()?.content || "";
    const fb = await getFallbackAnswer(lastUserMsg, intent);
    return { answer: fb.answer, messages, source: fb.source };
  }
}

/**
 * Hỏi AI theo session, lưu và trả lời
 */
export async function askAI(sessionId, userMessage) {
  const normalized = normalizeUserMessage(userMessage);
  if (!normalized) return "⚠️ Tin nhắn rỗng, xin hãy nhập câu hỏi rõ ràng hơn.";

  // Lưu tin nhắn user
  addMessage(sessionId, "user", normalized);

  // Xây dựng context
  const messages = await buildContextForAI(sessionId);
  const lastMsg = getLastMessage(sessionId);
  const intent = lastMsg?.metadata?.intent || "general";

  // DynamicPrompt nâng cao
  let dynamicPrompt = "";
  if (intent === "expand") {
    dynamicPrompt = "Người dùng muốn bạn mở rộng và viết tiếp nội dung trước đó, đào sâu triết lý, đưa thêm ví dụ minh họa, liên hệ thực hành, tránh lặp lại.";
  } else if (intent === "conclude") {
    dynamicPrompt = "Người dùng muốn bạn viết đoạn kết luận ngắn gọn, súc tích, gom ý, nhấn mạnh minh triết, không lặp lại.";
  } else if (intent === "short") {
    dynamicPrompt = "Người dùng muốn câu trả lời ngắn gọn, súc tích, chỉ nêu ý chính.";
  } else if (intent === "summarize") {
    dynamicPrompt = "Người dùng muốn bạn tóm tắt ngắn gọn, chỉ nêu ý chính, văn phong mạch lạc.";
  } else if (intent === "explain") {
    dynamicPrompt = "Người dùng muốn bạn giải thích khái niệm rõ ràng, dễ hiểu, có ví dụ minh họa, liên hệ thực tế.";
  } else if (intent === "knowledge") {
    dynamicPrompt = "Người dùng đang hỏi kiến thức phổ thông hoặc Phật học. Hãy trả lời chính xác, có dẫn giải, nối mạch hội thoại, ưu tiên chiều sâu minh triết.";
  } else {
    dynamicPrompt = "Người dùng đang trò chuyện tự nhiên. Hãy phản hồi thân thiện, duy trì mạch hội thoại, văn phong thiền vị.";
  }

  // Gọi AI
  const result = await askOpenAIWithHistory(messages, sessionId, dynamicPrompt, intent);

  const safeAnswer = isNonEmptyString(result.answer)
    ? refineAnswer(result.answer.trim())
    : defaultAnswerByIntent(intent, normalized);

  // Lưu câu trả lời
  addMessage(sessionId, "assistant", safeAnswer, {
    intent: "ai-response",
    source: result.source || "ai|fallback",
    style: "minh-triet"
  });

  // Tóm tắt định kỳ
  await autoSummarize(sessionId);

  return safeAnswer;
}

// --- API tiện ích ---
export function resetConversation(sessionId) {
  clearConversation(sessionId);
}

export function getConversationInfo(sessionId) {
  return getSessionInfo(sessionId);
}

export function refineAnswer(answer) {
  return answer
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/g, "")
    .trim();
}

