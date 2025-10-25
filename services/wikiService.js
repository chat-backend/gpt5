// services/wikiService.js (ESM version)
import axios from "axios";
import { fetchWikiSummary } from "./wikiService.js"; // dùng hàm nâng cấp đã viết

// Hàm tìm kiếm nhiều kết quả và lấy tóm tắt chi tiết
export async function fetchWikiSearchWithSummaries(query, limit = 5) {
  try {
    const url = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&utf8=&format=json&srlimit=${limit}&origin=*`;

    const res = await axios.get(url, { timeout: 5000 });
    const searchResults = res.data?.query?.search || [];

    // Gọi song song fetchWikiSummary cho từng bài
    const summaries = await Promise.all(
      searchResults.map(async (item) => {
        const summary = await fetchWikiSummary(item.title);
        return {
          title: item.title,
          snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""), // bỏ thẻ HTML
          url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          ...summary, // gộp thêm dữ liệu từ fetchWikiSummary (title, extract, thumbnail…)
        };
      })
    );

    return summaries;
  } catch (err) {
    if (err.response) {
      console.error("❌ Lỗi fetchWikiSearchWithSummaries:", err.response.status, err.response.data);
    } else {
      console.error("❌ Lỗi fetchWikiSearchWithSummaries:", err.code || err.message);
    }
    return [];
  }
}