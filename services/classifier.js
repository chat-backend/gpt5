// services/classifier.js (ESM version, tự nhiên hơn, không ép từ khóa)
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------
// Rule-based intent/category classifier
// -----------------------
export function ruleBasedCategory(q) {
  const text = (q || "").toLowerCase().trim();
  if (!text) return null;

  // Intent đặc biệt (nên giữ rule-based)
  if (/^(thêm|tiếp tục|mở rộng)$/i.test(text)) return "expand";
  if (/(tóm tắt|ngắn gọn|nói ngắn)/i.test(text)) return "short";

  // Category nội dung rõ ràng
  if (/(thời tiết|nhiệt độ|mưa|nắng|dự báo|khí hậu)/i.test(text)) return "weather";
  if (/(tin tức|bản tin|thời sự|headline|tin nóng|24h|24 giờ)/i.test(text)) return "news";

  // Các câu hỏi tri thức chung, định nghĩa, giải thích...
  // → để AI classifier xử lý, không ép từ khóa
  return null;
}

// -----------------------
// AI classifier (fallback thông minh)
// -----------------------
export async function aiClassifier(q) {
  const prompt = `
Bạn là bộ phân loại thông minh. Người dùng có thể hỏi bất kỳ điều gì.
Hãy phân loại câu hỏi vào 1 trong 8 nhóm sau:
- "weather": liên quan đến thời tiết, khí hậu, dự báo.
- "news": liên quan đến tin tức, sự kiện, báo chí.
- "search": liên quan đến nhân vật hiện tại, địa lý, chính trị, cần tìm kiếm web.
- "knowledge": kiến thức phổ thông, triết học, khoa học, văn hóa, tôn giáo, Phật giáo, Wikipedia.
- "general": các câu hỏi trò chuyện tự nhiên.
- "expand": khi người dùng nói "thêm", "tiếp tục", "mở rộng".
- "short": khi người dùng yêu cầu trả lời ngắn gọn, tóm tắt.
- "explain": khi người dùng muốn định nghĩa, giải thích khái niệm.

Ví dụ:
- "Tam bảo là gì?" → knowledge
- "Ý nghĩa của Tam Bảo trong Phật giáo" → knowledge
- "Thêm" → expand
- "Tóm tắt ngắn gọn về Bát Chánh Đạo" → short
- "Thời tiết hôm nay thế nào?" → weather
- "Tin tức 24h mới nhất" → news
- "Tổng thống Mỹ hiện tại là ai?" → search
- "Xin chào bạn" → general

Câu hỏi: "${q}"
Chỉ trả về đúng 1 từ trong danh sách trên.
Nếu không chắc chắn, hãy chọn "general".
`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3,
      temperature: 0,
    });

    const raw = res?.choices?.[0]?.message?.content || "";
    const cat = typeof raw === "string" && raw.trim().length > 0
      ? raw.trim().toLowerCase()
      : "general";

    const allowed = [
      "weather",
      "news",
      "search",
      "knowledge",
      "general",
      "expand",
      "short",
      "explain",
    ];

    return allowed.includes(cat) ? cat : "general";
  } catch (err) {
    console.error("❌ AI classifier error:", err.message);
    return "general";
  }
}

// -----------------------
// Hàm phân loại tổng hợp
// -----------------------
export async function classifyQuery(q) {
  try {
    if (!q || !q.trim()) return "general";

    const MODE = process.env.CLASSIFIER_MODE || "hybrid";

    if (MODE === "rule") {
      return ruleBasedCategory(q) || "general";
    }

    if (MODE === "ai") {
      return await aiClassifier(q);
    }

    // hybrid (mặc định)
    let category = ruleBasedCategory(q);
    if (!category) {
      category = await aiClassifier(q);
    }

    console.log(`👉 classifyQuery: "${q}" → ${category}`);
    return category || "general";
  } catch (err) {
    console.error("❌ classifyQuery error:", err.message);
    return "general";
  }
}

// -----------------------
// Mapping group
// -----------------------
export function mapGroup(source) {
  const groupMap = {
    weather: "external",
    news: "external",
    search: "external",
    knowledge: "internal",
    general: "internal",
    expand: "internal",   // nối mạch hội thoại
    short: "internal",    // tóm tắt ngắn gọn
    explain: "internal",  // giải thích khái niệm
    ai: "external",
    openai: "external",
    "chat-history": "internal",
  };
  return groupMap[source] || "other";
}