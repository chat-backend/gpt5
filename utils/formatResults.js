// utils/formatResults.js (ESM version)

/**
 * Format kết quả JSON từ Google Search thành văn bản thuần + Markdown
 * @param {Array} results - danh sách kết quả [{ title, link, snippet }]
 * @param {string} query - câu hỏi gốc
 * @returns {Object} - { text_plain, text_markdown }
 */
export function formatSearchResults(results, query) {
  if (!results || results.length === 0) {
    return {
      text_plain: `🌐 Không tìm thấy kết quả nào cho: ${query}`,
      text_markdown: `🌐 **Không tìm thấy kết quả nào cho:** *${query}*`
    };
  }

  // --- Thuần văn bản ---
  let plain = `🌐 Kết quả tìm kiếm web cho: ${query}\n\n`;

  results.forEach((item, index) => {
    const snippet = item.snippet
      ? (item.snippet.length > 200 ? item.snippet.slice(0, 200) + "..." : item.snippet)
      : "Không có mô tả ngắn gọn";

    plain += `${index + 1}. ${item.title}\n${snippet}\nXem chi tiết: ${item.link}\n\n`;
  });

  plain += `👉 Đây là toàn bộ kết quả đã được tổng hợp và trình bày đầy đủ cho câu hỏi: ${query}`;

  // --- Markdown ---
  let markdown = `🌐 **Kết quả tìm kiếm web cho:** *${query}*\n\n`;

  results.forEach((item, index) => {
    const snippet = item.snippet
      ? (item.snippet.length > 200 ? item.snippet.slice(0, 200) + "..." : item.snippet)
      : "Không có mô tả ngắn gọn";

    markdown += `${index + 1}. **${item.title}**\n${snippet}\n[🔗 Xem chi tiết](${item.link})\n\n`;
  });

  markdown += `👉 *Đây là toàn bộ kết quả đã được tổng hợp và trình bày đầy đủ cho câu hỏi:* **${query}**`;

  return {
    text_plain: plain.trim(),
    text_markdown: markdown.trim()
  };
}