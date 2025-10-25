// services/webSearch.js (ESM version)
import axios from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

/**
 * Hàm tìm kiếm web bằng Google Custom Search API
 * @param {string} query - Câu hỏi hoặc từ khóa
 * @returns {Promise<Array>} - Danh sách kết quả
 */
export async function searchWeb(query) {
  try {
    const url = "https://www.googleapis.com/customsearch/v1";
    const res = await axios.get(url, {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: query,
        lr: "lang_vi" // ưu tiên kết quả tiếng Việt
      }
    });

    const items = res.data.items || [];
    return items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    }));
  } catch (err) {
    console.error("❌ Lỗi searchWeb:", err.message);
    return [];
  }
}