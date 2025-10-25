// services/googleSearch.js (ESM version)
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Chuẩn hóa kết quả từ Google Custom Search
function normalizeGoogleResult(item) {
  return {
    title: item.title || "",
    description: item.snippet || "",
    url: item.link || "",
    source: "Google Custom Search",
    publishedAt: new Date(), // Google không trả pubDate
    collectedAt: new Date().toISOString()
  };
}

// Hàm truy vấn Google Custom Search
export async function searchGoogleWeb(query = "tin tức Việt Nam", num = 10, lang = "lang_vi") {
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
    console.warn("⚠️ GOOGLE_API_KEY hoặc GOOGLE_CX chưa được cấu hình trong .env");
    return [];
  }

  try {
    const url = "https://www.googleapis.com/customsearch/v1";
    const res = await axios.get(url, {
      params: {
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CX,
        q: query,
        num,
        lr: lang
      }
    });

    if (!res.data.items || !Array.isArray(res.data.items)) return [];

    return res.data.items.map(normalizeGoogleResult);
  } catch (err) {
    console.error("❌ Google Custom Search error:", err.response?.data || err.message);
    return [];
  }
}