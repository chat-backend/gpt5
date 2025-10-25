// services/topicClassifier.js (ESM version)
import NEWS_TOPICS from "../newsTopics.js";

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Phân loại bài báo dựa trên NEWS_TOPICS
 * - Ưu tiên match keywords trước
 * - Nếu không có, mới check query
 * - Nếu không match gì, trả về "khác"
 */
export function classifyNewsArticle(article) {
  const text = normalize(`${article.title || ""} ${article.description || ""}`);

  for (const topic of NEWS_TOPICS) {
    if (topic.keywords && topic.keywords.length > 0) {
      for (const kw of topic.keywords) {
        if (text.includes(normalize(kw))) {
          return topic.query;
        }
      }
    }
    const q = normalize(topic.query);
    if (text.includes(q)) {
      return topic.query;
    }
  }

  return "khác";
}