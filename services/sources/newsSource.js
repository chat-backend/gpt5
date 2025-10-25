// sources/newsSource.js (ESM version)
import fetch from "node-fetch";

export async function fetchNews(query) {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    throw new Error("Thiếu NEWSAPI_KEY trong biến môi trường");
  }

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    query
  )}&language=vi&pageSize=5&sortBy=publishedAt&apiKey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`News API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.status === "error") {
    throw new Error(data.message || "News API trả về lỗi");
  }
  if (!data.articles || !Array.isArray(data.articles)) {
    throw new Error("News API trả về dữ liệu không hợp lệ");
  }

  const articles = data.articles
    .filter(a => a && (a.title || a.description))
    .slice(0, 5)
    .map(a => ({
      summary: a.title && a.description 
        ? `${a.title} - ${a.description}`
        : a.title || a.description || "Không có tiêu đề",
      url: a.url || null,
      source: a.source?.name || null,
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toLocaleString("vi-VN") : null,
    }));

  return {
    queryUsed: query,
    totalResults: data.totalResults || articles.length,
    fetchedAt: new Date().toISOString(),
    articles,
  };
}