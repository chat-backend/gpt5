// routes/memory.js (ESM version) 

import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

// ==========================
// ⚙️ Cấu hình
// ==========================
const conversations = {};
const MAX_MESSAGES = Number(process.env.MAX_MESSAGES || 40);
const SUMMARIZE_INTERVAL = 30;
const SESSION_TTL = Number(process.env.SESSION_TTL || 86400); // giây

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================
// 🧹 Dọn session hết hạn
// ==========================
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of Object.entries(conversations)) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (now - updatedAt > SESSION_TTL * 1000) {
      delete conversations[id];
    }
  }
}

// ==========================
// ➕ Thêm tin nhắn & autoSummarize
// ==========================
export function addMessage(sessionId, role, content, metadata = {}) {
  if (!["user", "assistant", "system"].includes(role)) return;
  const text = String(content || "").trim();
  if (!text) return;

  if (!conversations[sessionId]) {
    conversations[sessionId] = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      summary: "",
      topic: "",
    };
  }

  const session = conversations[sessionId];
  session.messages.push({
    role,
    content: text,
    timestamp: new Date().toISOString(),
    metadata,
  });
  session.updatedAt = new Date().toISOString();

  if (metadata.topic && !session.topic) {
    session.topic = metadata.topic;
  }

  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  if (session.messages.length % SUMMARIZE_INTERVAL === 0) {
    autoSummarize(sessionId).then((summary) => {
      if (summary) {
        console.log(`ℹ️ AutoSummarized session ${sessionId}`);
      }
    });
  }

  cleanupSessions();
}

// ==========================
// 🧠 Tự động tóm tắt hội thoại
// ==========================
export async function autoSummarize(sessionId) {
  const session = conversations[sessionId];
  if (!session || session.messages.length < MAX_MESSAGES) return null;

  const text = session.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tóm tắt hội thoại thành 3-4 câu ngắn, giữ mạch chính. Nếu có thể, xác định chủ đề chính.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 200,
    });

    const summary = response?.choices?.[0]?.message?.content?.trim();
    if (!summary) return null;

    session.summary = summary;
    session.updatedAt = new Date().toISOString();

    if (!session.topic) {
      session.topic = summary.split(/[.?!]/)[0];
    }

    session.messages = [
      {
        role: "system",
        content: `📌 Tóm tắt: ${summary}`,
        metadata: { type: "summary" },
        timestamp: new Date().toISOString(),
      },
      ...session.messages.slice(-15),
    ];

    return summary;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ Lỗi khi tóm tắt:", err);
    }
    return null;
  }
}

// ==========================
// 📖 Truy xuất hội thoại
// ==========================
export function getConversation(sessionId) {
  cleanupSessions();
  return conversations[sessionId]?.messages || [];
}

export function getMessages(sessionId) {
  return getConversation(sessionId);
}

export function getLastMessage(sessionId) {
  const conv = getConversation(sessionId);
  return conv.length > 0 ? conv[conv.length - 1] : null;
}

export function getLastAnswer(sessionId) {
  const conv = getConversation(sessionId);
  return [...conv].reverse().find((m) => m.role === "assistant")?.content || null;
}

export function getLastUserMessage(sessionId) {
  const conv = getConversation(sessionId);
  return [...conv].reverse().find((m) => m.role === "user")?.content || null;
}

export function clearConversation(sessionId) {
  delete conversations[sessionId];
}

export function getSessionInfo(sessionId) {
  const s = conversations[sessionId];
  return s
    ? {
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        length: s.messages.length,
        topic: s.topic,
        summary: s.summary,
      }
    : null;
}

export function listSessions() {
  cleanupSessions();
  return Object.keys(conversations);
}

// ==========================
// 🧠 Xây dựng context cho AI
// ==========================
export async function buildContextForAI(sessionId) {
  const session = conversations[sessionId];
  if (!session) return [];

  const conv = session.messages;
  const lastMsg = conv[conv.length - 1];
  const lastUser = getLastUserMessage(sessionId);
  const lastAssistant = getLastAnswer(sessionId);

  const extendedIntents = [
    "expand",
    "conclude",
    "summarize",
    "explain",
    "knowledge",
    "short",
    "compare",
    "analyze",
  ];

  const needMore = extendedIntents.includes(lastMsg?.metadata?.intent);
  const recent = needMore ? conv.slice(-20) : conv.slice(-10);

  const systemPrompt = {
    role: "system",
    content: `
Bạn là một trợ lý thông minh, luôn nối mạch hội thoại.
Chủ đề: ${session.topic || "chưa xác định"}.
Tóm tắt: ${session.summary || "chưa có"}.
Intent gần nhất: ${lastMsg?.metadata?.intent || "general"}.

⚠️ Quy tắc quan trọng:
- Nếu intent là "expand": hãy viết tiếp và mở rộng nội dung từ câu trả lời trước đó.
- Nếu intent là "conclude": hãy viết đoạn kết luận ngắn gọn, tổng hợp ý chính từ nội dung trước đó.
- Nếu intent là "summarize": hãy tóm tắt ngắn gọn, chỉ nêu ý chính.
- Nếu intent là "explain": hãy giải thích rõ ràng, có ví dụ minh họa, dễ hiểu.
- Nếu intent là "knowledge": hãy trả lời chính xác, có dẫn giải, nối mạch hội thoại.
- Nếu intent là "short": hãy trả lời ngắn gọn, súc tích.
- Nếu intent là "compare": hãy so sánh rõ ràng, có cấu trúc.
- Nếu intent là "analyze": hãy phân tích sâu, logic, nhiều chiều cạnh.
- Tuyệt đối không hỏi lại người dùng trong các trường hợp này.
- Luôn nối mạch từ câu trả lời trước, giữ giọng văn nhất quán, không lặp lại nguyên văn đoạn trước.`,
  };

  const summaryNote = session.summary
    ? { role: "system", content: `📌 Tóm tắt trước đó: ${session.summary}` }
    : null;

  const assistantNote = lastAssistant
    ? { role: "assistant", content: `📌 Câu trả lời trước: ${lastAssistant}` }
    : null;

  const userNote = lastUser
    ? { role: "user", content: `📌 Yêu cầu gần nhất: ${lastUser}` }
    : null;

  return [
    systemPrompt,
    ...(summaryNote ? [summaryNote] : []),
    ...(assistantNote ? [assistantNote] : []),
    ...(userNote ? [userNote] : []),
    ...recent.map((m) => ({
      role: m.role,
      content: m.metadata?.intent
        ? `[${m.metadata.intent.toUpperCase()}] ${m.content}`
        : m.content,
    })),
  ];
}