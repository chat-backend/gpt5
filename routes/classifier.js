// routes/classifier.js (ESM version)
import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import { logger, SOURCES } from "./logger.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ OPENAI_API_KEY chưa được thiết lập. Bot không thể hoạt động nếu thiếu key.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
logger.info("✅ OPENAI_API_KEY đã được nạp thành công.", { source: SOURCES.OPENAI });

export default openai;

// -----------------------
// Rule-based intent classifier (chỉ giữ intent đặc biệt)
// -----------------------
export function ruleBasedCategory(q) {
  const text = (q || "").toLowerCase().trim();
  if (!text) return null;

  if (/^(xin chào|chào|hello|hi|hey)/i.test(text)) return "general";
  if (/^(thêm|tiếp tục|mở rộng|viết tiếp)$/i.test(text)) return "expand";
  if (/(tóm tắt|tóm gọn|ngắn gọn|nói ngắn)/i.test(text)) return "short";
  if (/(giải thích|định nghĩa|có nghĩa là)/i.test(text)) return "explain";
  if (/(thời tiết|nhiệt độ|mưa|nắng|gió|độ ẩm|bão|áp thấp|khí hậu|trời hôm nay|ngoài trời)/i.test(text)) return "weather";
  if (/(tin tức|tin\s+mới|tin\s+mới\s+nhất|tin\s+hôm\s+nay|tin\s+nóng|tin\s+nhanh|tin\s+hot|bản tin|thời sự|headline|news|breaking(\s+news)?|hot\s+news|cập nhật|sự kiện\s+(mới|hôm nay|nổi bật)|chuyện gì mới|đáng chú ý)/i.test(text)) return "news";
  if (/(mấy giờ|bây giờ|thời gian|hôm nay là ngày|ngày tháng|time|giờ việt nam|đồng hồ|giờ hiện tại)/i.test(text)) return "time";
  if (/(kể.*câu chuyện|truyện cười|chuyện vui|joke|funny story|tell.*story)/i.test(text)) return "creative";
  if (/(hiện tại|bây giờ|current|now|đang là)/i.test(text)) {
  return "global";
}

  return "general";
}

// -----------------------
// AI classifier (fallback thông minh)
// -----------------------
export async function aiClassifier(q) {
  if (!openai) return "general";

  const prompt = `
Bạn là bộ phân loại thông minh. Người dùng có thể hỏi bất kỳ điều gì.
Hãy phân loại câu hỏi vào 1 trong 10 nhóm sau:
["weather","news","time","global","knowledge","general","expand","short","explain","creative"]

Câu hỏi: "${q}"
Chỉ trả về đúng 1 từ trong danh sách trên, không thêm bất kỳ ký tự nào khác.
Nếu không chắc chắn, hãy chọn "knowledge".
`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3,
      temperature: 0,
    });

    const raw = res?.choices?.[0]?.message?.content || "";
    const cat = raw.trim().toLowerCase();

    const allowed = [
      "weather","news","time","global",
      "knowledge","general","expand","short","explain","creative"
    ];

    return allowed.includes(cat) ? cat : "knowledge";
  } catch (err) {
    console.error("❌ AI classifier error:", err.message);
    return "knowledge";
  }
}

// -----------------------
// Hàm phân loại tổng hợp 
// -----------------------
export async function classifyQuery(q) {
  try {
    if (!q || !q.trim()) return "general";

    const MODE = process.env.CLASSIFIER_MODE || "hybrid";

    // Rule-based
    if (MODE === "rule") {
      return ruleBasedCategory(q) || "general";
    }

    // AI classifier
    if (MODE === "ai") {
      return await aiClassifier(q);
    }

    // hybrid (mặc định)
    const ruleCat = ruleBasedCategory(q);

    // Các intent đặc biệt → dùng luôn rule-based
    const specialIntents = [
      "weather",
      "news",
      "global",
      "time",
      "expand",
      "short",
      "explain",
      "creative",
    ];

    if (specialIntents.includes(ruleCat)) {
      return ruleCat;
    }

    // ❗ Fallback sang AI classifier
    const aiCat = await aiClassifier(q);

    // Nếu AI classifier trả "general" → ép thành "knowledge"
    const finalCat = aiCat === "general" ? "knowledge" : aiCat;

    if (process.env.NODE_ENV === "development") {
      console.log(`👉 classifyQuery: "${q}" → ${finalCat}`);
    }

    return finalCat || "knowledge";
  } catch (err) {
    console.error("❌ classifyQuery error:", err.message);
    return "knowledge";
  }
}

// -----------------------
// Phân loại bài báo tin tức
// -----------------------
export function classifyNewsArticle(article) {
  if (!article) return "general";
  const text = ((article.title||"")+" "+(article.description||"")+" "+(article.content||"")).toLowerCase();

  if (/(thời tiết|mưa|nắng|bão|khí hậu|nhiệt độ)/.test(text)) return "weather";
  if (/(chính trị|quốc hội|bầu cử|tổng thống|nghị viện)/.test(text)) return "politics";
  if (/(kinh tế|thị trường|tài chính|chứng khoán|doanh nghiệp)/.test(text)) return "economy";
  if (/(thể thao|bóng đá|cầu thủ|giải đấu|world cup|olympic)/.test(text)) return "sports";
  if (/(giải trí|showbiz|ca sĩ|phim|diễn viên|âm nhạc)/.test(text)) return "entertainment";
  if (/(y tế|sức khỏe|bệnh viện|dịch bệnh|vaccine|tiêm chủng|thuốc|khám bệnh|điều trị)/.test(text)) return "health";
  if (/(khoa học|công nghệ|ai|robot|vũ trụ|nasa|space|innovation|phát minh|nghiên cứu)/.test(text)) return "science-tech";
  if (/(giáo dục|học sinh|sinh viên|trường học|thi cử|giảng dạy|học tập)/.test(text)) return "education";
 if (/(hiện tại|bây giờ|current|now|đang là)/i.test(text)) {
  return "global";
}

  return "general";
}

// -----------------------
// Mapping group
// -----------------------
export function mapGroup(intent) {
  switch (intent) {
    case "weather":
    case "news":
    case "global":
    case "politics":
    case "economy":
    case "sports":
    case "entertainment":
    case "science-tech":
    case "education":
    case "health":
      return "external";

    case "time":
    case "chat-history":
      return "internal";

    case "knowledge":
    case "general":
    case "expand":
    case "short":
    case "explain":
    case "creative":
    case "ai":
    case "openai":
    default:
      return "ai";
  }
}