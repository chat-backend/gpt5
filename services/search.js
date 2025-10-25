// services/search.js (ESM version)
import axios from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

/**
 * Gọi Google Custom Search API
 * @param {string} query - từ khóa tìm kiếm
 * @returns {Promise<Array>} - danh sách kết quả [{ title, link, snippet }]
 */
export async function googleSearch(query) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.error("❌ Chưa cấu hình GOOGLE_API_KEY hoặc GOOGLE_CX");
    return [];
  }

  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: query,
        lr: "lang_vi", // ưu tiên kết quả tiếng Việt
        num: 5         // số kết quả trả về
      },
      timeout: 20000,
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status !== 200) {
      console.error("⚠️ Google API trả về lỗi:", response.status, response.data?.error || response.data);
      return [];
    }

    const items = response.data.items || [];
    return items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    }));
  } catch (err) {
    console.error("❌ Lỗi khi gọi Google Search:", {
      code: err.code,
      message: err.message
    });
    return [];
  }
}