// services/intentService.js (ESM version, optimized with philosophy intent)

let lastIntentBySession = {};

export function classifyIntent(message = "", sessionId = "default") {
  const text = message.toLowerCase().trim();

  // --- continuity ---
  const prev = lastIntentBySession[sessionId];
  if (
    prev === "knowledge" &&
    !/(thời tiết|nhiệt độ|dự báo|tin tức|mấy giờ|giờ hiện tại)/.test(text)
  ) {
    return "knowledge";
  }
  if (
    prev === "philosophy" &&
    !/(thời tiết|nhiệt độ|dự báo|tin tức|mấy giờ|giờ hiện tại)/.test(text)
  ) {
    return "philosophy";
  }

  // --- expand ---
  if (/^(thêm|tiếp tục|mở rộng)$/i.test(text)) {
    lastIntentBySession[sessionId] = "expand";
    return "expand";
  }

  // --- philosophy / spiritual ---
  if (/(phật|pháp|tánh|giác ngộ|linh thiêng|minh triết|thiền|đạo)/.test(text)) {
    lastIntentBySession[sessionId] = "philosophy";
    return "philosophy";
  }

  // --- weather ---
  if (/(thời tiết|nhiệt độ|dự báo)/.test(text)) {
    lastIntentBySession[sessionId] = "weather";
    return "weather";
  }
  if (
    /(mưa|gió|bão|nắng)/.test(text) &&
    /(hà nội|đà nẵng|sài gòn|hồ chí minh|huế|vn|việt nam)/.test(text) &&
    /(thời tiết|dự báo|nhiệt độ|hôm nay|ngày mai)/.test(text)
  ) {
    lastIntentBySession[sessionId] = "weather";
    return "weather";
  }

  // --- time ---
  if (/mấy giờ|giờ hiện tại|bây giờ là|thời gian hiện tại/.test(text)) {
    lastIntentBySession[sessionId] = "time";
    return "time";
  }
  if (/hôm nay là ngày/.test(text)) {
    lastIntentBySession[sessionId] = "time";
    return "time";
  }

  // --- news ---
  if (/tin tức|thời sự|báo chí/.test(text)) {
    lastIntentBySession[sessionId] = "news";
    return "news";
  }

  // --- country ---
  if (/quốc gia|nước nào|country|nation/.test(text)) {
    lastIntentBySession[sessionId] = "country";
    return "country";
  }

  // --- search ---
  if (/search|tìm kiếm|google/.test(text)) {
    lastIntentBySession[sessionId] = "search";
    return "search";
  }

  // --- fallback: knowledge ---
  lastIntentBySession[sessionId] = "knowledge";
  return "knowledge";
}