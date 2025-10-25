// services/smartAssistant.js (ESM version)

// =======================
// 1. Intent Service
// =======================
const LIGHT_KEYWORDS = ["ngắn", "tóm tắt", "brief", "nhanh", "ngắn gọn"];
const DEEP_KEYWORDS = ["phân tích", "chi tiết", "giải thích sâu", "lý giải", "kết luận", "mở bài", "thân bài"];
const EXPAND_KEYWORDS = ["thêm", "tiếp tục", "mở rộng", "viết tiếp", "phân tích thêm"];

async function classifyIntent(message, sessionId = "default") {
  const q = String(message || "").toLowerCase().trim();
  if (q.length < 10 && !DEEP_KEYWORDS.some(k => q.includes(k))) return "light";
  if (EXPAND_KEYWORDS.some(k => q.includes(k))) return "expand";
  if (DEEP_KEYWORDS.some(k => q.includes(k))) return "deep";
  return "knowledge";
}

// =======================
// 2. QA Service + Fallback
// =======================
async function askOpenAIWithHistory(context) {
  const lastUser = context.filter(m => m.role === "user").pop()?.content || "";
  return `Tiếp nối mạch hội thoại, mở rộng: ${lastUser}`;
}

async function buildContextForAI(sessionId) {
  return [
    { role: "system", content: "Bạn là Trợ lý Thông Tuệ, nối mạch hội thoại mạch lạc, tự nhiên." },
    { role: "assistant", content: "Đã sẵn sàng tiếp nối chủ đề." }
  ];
}

async function withTimeout(promise, ms, fallback = null) {
  return await Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

function getRandomFallback() {
  const picks = [
    "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.",
    "Hệ thống đang bận, bạn thử diễn đạt lại hoặc hỏi cụ thể hơn nhé.",
    "Tạm thời tôi chưa có đáp án phù hợp, xin bạn chờ trong giây lát."
  ];
  return picks[Math.floor(Math.random() * picks.length)];
}

async function getFallbackAnswer(sessionId, message, context) {
  return `Tiếp nối ý trước, xin bổ sung: ${message}`;
}

async function fallbackAI(message, sessionId = "default") {
  try {
    const context = await buildContextForAI(sessionId);
    context.unshift({
      role: "system",
      content:
        "Bạn là một trợ lý uyển chuyển, ưu tiên nối mạch hội thoại theo chủ đề trước đó. " +
        "Nếu người dùng gõ 'thêm', 'tiếp tục', 'mở rộng', hãy bổ sung ý mới, không lặp lại toàn bộ."
    });
    context.push({ role: "user", content: message });

    const aiAnswer = await withTimeout(askOpenAIWithHistory(context), 8000, null);
    if (aiAnswer && typeof aiAnswer === "string" && aiAnswer.trim()) return aiAnswer.trim();

    const fb = await getFallbackAnswer(sessionId, message, context);
    return typeof fb === "string" ? fb : String(fb ?? getRandomFallback());
  } catch (err) {
    console.error("❌ Lỗi fallbackAI:", err);
    return getRandomFallback();
  }
}

// =======================
// 3. Answer By Intent
// =======================
async function getKnowledgeAnswer(query, sessionId, mode, history) {
  return {
    answer: `Trả lời (${mode}) cho câu hỏi: ${query}`,
    source: "ai-knowledge"
  };
}

function formatAnswer(intent, answer, source) {
  return { answer, source };
}

async function answerByIntent(intent, query, sessionId = "default", history = []) {
  try {
    console.log("=== [answerByIntent] ===", { intent, sessionId });

    if (intent === "expand") {
      const fbExpand = await fallbackAI(query, sessionId);
      return formatAnswer("knowledge", fbExpand, "ai-fallback");
    }

    if (intent === "short" || intent === "light") {
      const res = await getKnowledgeAnswer(query, sessionId, "short", history);
      return formatAnswer("light", String(res?.answer ?? ""), res?.source || "ai");
    }

    if (intent === "deep") {
      const res = await getKnowledgeAnswer(query, sessionId, "deep", history);
      return formatAnswer("deep", String(res?.answer ?? ""), res?.source || "ai");
    }

    const res = await getKnowledgeAnswer(query, sessionId, "knowledge", history);
    return formatAnswer("knowledge", String(res?.answer ?? ""), res?.source || "ai");
  } catch (err) {
    console.error("❌ Lỗi answerByIntent:", err);
    try {
      const fb = await getFallbackAnswer(sessionId, query, history);
      return formatAnswer(intent, typeof fb === "string" ? fb : String(fb ?? getRandomFallback()), "ai-fallback");
    } catch (fbErr) {
      console.error("❌ Lỗi getFallbackAnswer:", fbErr);
      return formatAnswer(intent, "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.", "system");
    }
  }
}

// =======================
// 4. Smart Assistant
// =======================
export async function smartAssistant(message, sessionId = "default") {
  try {
    const intent = await classifyIntent(message, sessionId);
    console.log(`[smartAssistant] intent=${intent}, session=${sessionId}`);

    let result = await answerByIntent(intent, message, sessionId);
    if (!result || !result.answer) {
      result = { answer: "Xin lỗi, tôi chưa thể xử lý yêu cầu này.", source: "system" };
    }

    const ans = String(result.answer || "").trim();
    let formattedAnswer;

    switch (intent) {
      case "short":
      case "light":
        formattedAnswer = `👉 ${ans}`;
        break;
      case "expand":
        formattedAnswer = `🔄 Tiếp nối ý trước:\n${ans}`;
        break;
      case "deep":
        formattedAnswer = `📚 Mở bài: Đặt vấn đề.\n\n📝 Thân bài: ${ans}\n\n✅ Kết luận: Khái quát và nhấn mạnh ý nghĩa.`;
        break;
      case "knowledge":
      default:
        const intros = ["💡", "📖", "🔍", "✨"];
        const intro = intros[Math.floor(Math.random() * intros.length)];
        formattedAnswer = `${intro} ${ans}`;
        break;
    }

    return {
      success: true,
      intent,
      answer: formattedAnswer,
      source: result.source || "AI",
      sessionId,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ smartAssistant error:", err);
    return {
      success: false,
      intent: "general",
      answer: "Xin lỗi, tôi chưa thể trả lời câu hỏi này ngay lúc này.",
      source: "system",
      sessionId,
      timestamp: new Date().toISOString()
    };
  }
}