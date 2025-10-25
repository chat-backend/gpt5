// services/nlpService.js (ESM version)
import {
  getNewsStats,
  getNewsCache,
  getWeatherCache,
  getTimeCache,
  getCountriesCache
} from "./cacheService.js";

/**
 * Chuẩn hóa chuỗi (bỏ dấu, lowercase)
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Xác định intent từ câu hỏi
 */
function detectIntent(q) {
  if (!q) return "other";
  if (q.includes("thời tiết") || q.includes("nhiệt độ") || q.includes("trời thế nào")) return "weather";
  if (q.includes("mấy giờ") || q.includes("bây giờ") || q.includes("thời gian")) return "time";
  if (q.includes("tin tức") || q.includes("báo chí") || q.includes("news")) return "news";
  if (q.includes("quốc gia") || q.includes("nước") || q.includes("country")) return "country";
  return "other";
}

/**
 * Trả lời câu hỏi người dùng
 */
export function handleUserQuestion(question) {
  const q = normalize(question || "");
  const intent = detectIntent(q);

  console.log(`[NLP] intent=${intent}, query="${question}"`);

  switch (intent) {
    case "weather": {
      const weather = getWeatherCache();
      if (weather && weather.city) {
        return `Thời tiết hiện tại ở ${weather.city}: ${weather.temperature}°C, ${weather.description}, độ ẩm ${weather.humidity}%, gió ${weather.wind_speed} m/s.`;
      }
      return "Xin lỗi, hiện chưa có dữ liệu thời tiết.";
    }

    case "time": {
      const time = getTimeCache();
      if (time && time.formatted) {
        return `Bây giờ là ${time.formatted} (${time.timezone}).`;
      }
      return "Xin lỗi, hiện chưa có dữ liệu thời gian.";
    }

    case "news": {
      const latest = (getNewsCache() || []).slice(0, 3);
      if (latest.length > 0) {
        return "📰 Tin mới nhất:\n" + latest.map((a, i) => `${i + 1}. ${a.title} (${a.source})`).join("\n");
      }
      const stats = getNewsStats();
      return stats?.message || "Hiện chưa có dữ liệu tin tức.";
    }

    case "country": {
      const countries = getCountriesCache() || [];
      if (countries.length === 0) {
        return "Xin lỗi, hiện chưa có dữ liệu quốc gia.";
      }
      // Nếu người dùng hỏi cụ thể tên quốc gia
      for (const c of countries) {
        const allNames = [c.name, c.code, ...(c.aliases || [])].map(normalize);
        if (allNames.some(n => q.includes(n))) {
          return `${c.name}: ${c.summary}`;
        }
      }
      // Nếu không hỏi cụ thể → trả về thống kê
      return `Hệ thống hiện có dữ liệu của ${countries.length} quốc gia. Ví dụ: ${countries.slice(0, 3).map(c => c.name).join(", ")}...`;
    }

    default:
      return "Xin lỗi, tôi chưa hiểu câu hỏi. Bạn có thể hỏi về thời tiết, giờ, tin tức hoặc quốc gia.";
  }
}