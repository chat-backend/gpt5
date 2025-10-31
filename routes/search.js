// routes/search.js (ESM version)

import express from "express";
import axios from "axios";
import { logSearch, answerLogger } from "./logger.js";

const router = express.Router();

// Chuẩn hóa kết quả từ Google Custom Search
function normalizeSearchResult(item) {
  return {
    source: "global",
    title: item.title || "(no title)",
    url: item.link || null,
    description: item.snippet || item.htmlSnippet || "",
    publishedAt: item.pagemap?.metatags?.[0]?.["article:published_time"] || null,
    guid: item.link
  };
}

// Làm sạch description (bỏ HTML, cắt gọn)
function cleanDescription(desc) {
  if (!desc) return "";
  const cleaned = desc.replace(/<\/?[^>]+(>|$)/g, "");
  return cleaned.length > 200 ? cleaned.slice(0, 200) + "…" : cleaned;
}

// ✅ Hàm chọn snippet tốt nhất
function pickBestSnippet(results) {
  if (!results || results.length === 0) return null;

  const priorityKeywords = [
    "đương nhiệm","hiện tại","chính thức nhậm chức",
    "incumbent","current","bây giờ",
    "thành lập","ra đời","founded","established","discovered","khai sinh"
  ];

  const validResults = results.filter(r => r.description && r.description.length >= 20);

  // 1. Keyword + trusted + mới nhất
  const keywordTrusted = validResults
    .filter(r =>
      priorityKeywords.some(kw => r.description?.toLowerCase().includes(kw)) &&
      /(wikipedia\.org|bbc\.com|voanews\.com|chinhphu\.vn|reuters\.com|cnn\.com|britannica\.com|unesco\.org|nature\.com|science\.org)/i.test(r.url)
    )
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  if (keywordTrusted.length > 0) return keywordTrusted[0];

  // 2. Keyword
  const prioritized = validResults.find(r =>
    priorityKeywords.some(kw => r.description?.toLowerCase().includes(kw))
  );
  if (prioritized) return prioritized;

  // 3. Trusted
  const trusted = validResults.find(r =>
    /(wikipedia\.org|bbc\.com|voanews\.com|chinhphu\.vn|reuters\.com|cnn\.com|britannica\.com|unesco\.org|nature\.com|science\.org)/i.test(r.url)
  );
  if (trusted) return trusted;

  // 4. Mới nhất
  const sortedByDate = validResults
    .filter(r => r.publishedAt && !isNaN(new Date(r.publishedAt)))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  if (sortedByDate.length > 0) return sortedByDate[0];

  // 5. Có năm
  const withYear = validResults.find(r => /\b(1[0-9]{3}|20[0-9]{2})\b/.test(r.description));
  if (withYear) return withYear;

  // 6. Description dài
  const withDescription = validResults.find(r => r.description.length >= 50);
  if (withDescription) return withDescription;

  return validResults[0] || results[0];
}

// ✅ Hàm tổng hợp nhiều snippet (tối đa 3, đa dạng nguồn)
function summarizeResults(results) {
  const chosen = [];
  const seen = new Set();

  const groups = {
    wiki: results.filter(r => /wikipedia\.org|britannica\.com/i.test(r.url)),
    news: results.filter(r => /bbc\.com|cnn\.com|reuters\.com|voanews\.com/i.test(r.url)),
    gov: results.filter(r => /chinhphu\.vn|unesco\.org/i.test(r.url)),
    others: results.filter(r =>
      !(/wikipedia\.org|britannica\.com|bbc\.com|cnn\.com|reuters\.com|voanews\.com|chinhphu\.vn|unesco\.org/i.test(r.url))
    )
  };

  for (let group of Object.values(groups)) {
    for (let r of group) {
      if (chosen.length >= 3) break;
      if (!seen.has(r.guid)) {
        chosen.push({ ...r, description: cleanDescription(r.description) });
        seen.add(r.guid);
      }
    }
  }

  return chosen;
}

// ✅ Handler chính
export async function globalSearchHandler(query) {
  const start = Date.now();
  try {
    const [webRes, newsRes] = await Promise.all([
      axios.get("https://www.googleapis.com/customsearch/v1", {
        params: {
          key: process.env.GOOGLE_API_KEY,
          cx: process.env.GOOGLE_CX,
          q: query
        }
      }),
      axios.get("https://www.googleapis.com/customsearch/v1", {
        params: {
          key: process.env.GOOGLE_API_KEY,
          cx: process.env.GOOGLE_CX,
          q: query,
          tbm: "nws"
        }
      })
    ]);

    const webItems = webRes.data.items || [];
    const newsItems = newsRes.data.items || [];
    const results = [...newsItems, ...webItems].map(normalizeSearchResult);

    const durationMs = Date.now() - start;
    logSearch(query, results.length, durationMs);

    const chosen = pickBestSnippet(results);
    const summary = summarizeResults(results);

    if (chosen) {
      answerLogger(query, "global", chosen.description, "search", chosen.url);
    }

    return {
      source: "global",
      message: chosen
        ? `📌 ${cleanDescription(chosen.description)}\n🔗 ${chosen.url}${
            summary.length > 0
              ? `\n\n📚 Thông tin bổ sung:\n${summary
                  .map(r => `- ${r.description} (${r.url})`)
                  .join("\n")}`
              : ""
          }`
        : "❌ Không tìm thấy kết quả phù hợp.",
      total: results.length,
      data: results,
      error: null
    };
  } catch (err) {
    return {
      source: "global",
      message: "❌ Lỗi khi tìm kiếm toàn cầu",
      total: 0,
      data: [],
      error: err.message
    };
  }
}

export default router;