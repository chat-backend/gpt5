// services/chatService.js (ESM version)

// --- Intent classification ---
export async function classifyIntent(q) {
  const text = q.toLowerCase();
  if (/(thời tiết|nhiệt độ|mưa|nắng|gió|bão|dự báo)/.test(text)) return "weather";
  if (/(tin tức\s*24h)/.test(text)) return "24h";
  if (/(tin tức|bản tin|thời sự|mới nhất|sự kiện)(?!\s*24h)/.test(text)) return "news";
  if (/(là ai|là gì|định nghĩa|tiểu sử|ở đâu|bao nhiêu tuổi|năm nào)/.test(text)) return "google";
  return "ai";
}

// --- Helper: remove diacritics ---
function removeDiacritics(str = "") {
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

// --- Helper: extract message từ request ---
export function extractMessage(req) {
  return req.body?.message || req.query?.q || "";
}

// --- Helper: extract & normalize city ---
export function extractCity(q = "") {
  const text = removeDiacritics(q.toLowerCase())
    .replace(/thoi tiet|hom nay|ngay mai|ngay kia|bay gio|hien tai|o|tai/g, "")
    .trim();

  for (const key in CITY_MAP) {
    if (text.includes(key)) {
      return CITY_MAP[key];
    }
  }
  return "Hanoi";
}

// Bản đồ city: đủ 34 tỉnh/thành phố trọng điểm
const CITY_MAP = {
  "ha noi": "Hanoi",
  "hn": "Hanoi",
  "ho chi minh": "Ho Chi Minh City",
  "sai gon": "Ho Chi Minh City",
  "da nang": "Da Nang",
  "hai phong": "Hai Phong",
  "can tho": "Can Tho",
  "nha trang": "Nha Trang",
  "hue": "Hue",
  "quy nhon": "Quy Nhon",
  "vung tau": "Vung Tau",
  "da lat": "Da Lat",
  "quang ninh": "Quang Ninh",
  "bac ninh": "Bac Ninh",
  "thai nguyen": "Thai Nguyen",
  "nam dinh": "Nam Dinh",
  "ninh binh": "Ninh Binh",
  "thanh hoa": "Thanh Hoa",
  "nghe an": "Nghe An",
  "ha tinh": "Ha Tinh",
  "quang binh": "Quang Binh",
  "quang tri": "Quang Tri",
  "quang nam": "Quang Nam",
  "quang ngai": "Quang Ngai",
  "binh dinh": "Binh Dinh",
  "phu yen": "Phu Yen",
  "khanh hoa": "Khanh Hoa",
  "binh thuan": "Binh Thuan",
  "binh duong": "Binh Duong",
  "dong nai": "Dong Nai",
  "tay ninh": "Tay Ninh",
  "long an": "Long An",
  "an giang": "An Giang",
  "kien giang": "Kien Giang",
  "soc trang": "Soc Trang",
  "tra vinh": "Tra Vinh",
  "ben tre": "Ben Tre",
  "vinh long": "Vinh Long",
  "hau giang": "Hau Giang",
  "bac lieu": "Bac Lieu",
  "ca mau": "Ca Mau"
};

export function normalizeCity(raw = "") {
  const key = removeDiacritics(raw.toLowerCase().trim());
  return CITY_MAP[key] || raw;
}

// --- Rule-based quick answers ---
export function handleUserQuestion(message) {
  const text = message.toLowerCase();
  if (/^xin chào|chào bạn|hello|hi$/.test(text)) {
    return "Chào bạn 👋! Rất vui được trò chuyện cùng bạn.";
  }
  if (/cảm ơn/.test(text)) {
    return "Không có gì, mình luôn sẵn sàng hỗ trợ bạn.";
  }
  return null;
}

// --- Bộ nhớ hội thoại trong RAM ---
const conversations = {};

export function getConversation(sessionId) {
  if (!conversations[sessionId]) conversations[sessionId] = [];
  return conversations[sessionId];
}

export function getConversationForAI(sessionId) {
  return getConversation(sessionId);
}

export function addMessage(sessionId, role, content) {
  if (!conversations[sessionId]) conversations[sessionId] = [];
  conversations[sessionId].push({ role, content });
}

export function clearConversation(sessionId) {
  conversations[sessionId] = [];
}

export function summarizeConversation(sessionId) {
  const conv = getConversation(sessionId) || [];
  return conv.map(m => `${m.role}: ${m.content}`).join("\n");
}