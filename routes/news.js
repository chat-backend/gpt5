// routes/news.js (ESM version)
import express from "express";
import Parser from "rss-parser";
import fs from "fs/promises";
import { logger } from "./logger.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, "../data");
const newsFilePath = join(dataDir, "news.json");

const parser = new Parser();
const router = express.Router();

/** Chuẩn hóa item RSS */
function normalizeItem(source, item) {
  const publishedRaw = item.isoDate || item.pubDate || null;
  return {
    source,
    title: (item.title || "").trim(),
    url: (item.link || "").trim(),
    description: (item.contentSnippet || item.content || "").trim(),
    publishedAt: publishedRaw ? new Date(publishedRaw).getTime() : Date.now(),
    guid: item.guid || item.id || item.link || ""
  };
}

/** Tạo fetcher cho RSS */
function createRSSFetcher(sourceName, url) {
  return async function () {
    try {
      const feed = await parser.parseURL(url);
      return feed.items.map(item => normalizeItem(sourceName, item));
    } catch (err) {
      console.error(`❌ Lỗi fetch ${sourceName}:`, err.message);
      return [];
    }
  };
}

/** Đọc cache và trả lời dạng văn bản thuần + có đường link */
export async function readNewsFromFile(limit = 20) {
  try {
    const raw = await fs.readFile(newsFilePath, "utf8");
    const data = JSON.parse(raw);
    const items = Array.isArray(data) ? data : data.articles;

    if (!items || !items.length) {
      logger.warn("⚠️ [News] Cache rỗng, không có tin để trả lời.");
      return { message: "Hiện chưa có tin tức trong cache.", source: "news", error: true };
    }

    const top = items.slice(0, limit);

    logger.info(
      `📊 [News] Đọc file news.json: tổng ${items.length} tin, bot sẽ trả lời ${top.length} tin.`
    );

    let text = `📰 Trong 24 giờ qua, có ${top.length} sự kiện nổi bật:\n\n`;
    top.forEach((item, idx) => {
      const timeStr = item.publishedAt
        ? new Date(item.publishedAt).toLocaleString("vi-VN")
        : "Không rõ thời gian";
      text += `${idx + 1}. ${item.title}\n`;
      if (item.description) text += `   ${item.description}\n`;
      text += `   🕒 ${timeStr}\n`;
      if (item.url) text += `   🔗 ${item.url}\n\n`;   // 👉 thêm đường link
    });

    return { message: text.trim(), source: "news", error: false };
  } catch (err) {
    logger.error("❌ Lỗi đọc news.json:", { error: err.message });
    return { message: "⚠️ Không đọc được dữ liệu tin tức.", source: "news", error: true };
  }
}

/** Handler nhanh cho app.js hoặc router */
export async function newsHandler(limit = 20) {
  return await readNewsFromFile(limit);
}

/* --- Nguồn RSS Việt Nam --- */
export const fetchVNExpress = createRSSFetcher("VNExpress", "https://vnexpress.net/rss/tin-moi-nhat.rss");
export const fetchDanTri = createRSSFetcher("DanTri", "https://dantri.com.vn/rss/home.rss");
export const fetchTuoiTre = createRSSFetcher("TuoiTre", "https://tuoitre.vn/rss/tin-moi-nhat.rss");
export const fetchThanhNien = createRSSFetcher("ThanhNien", "https://thanhnien.vn/rss/home.rss");
export const fetchNguoiLaoDong = createRSSFetcher("NguoiLaoDong", "https://nld.com.vn/rss/home.rss");
export const fetchPhatTuVN = createRSSFetcher("PhatTuVN", "https://www.phattuvietnam.net/feed/");
export const fetchGoogleNews = createRSSFetcher("GoogleNews", "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi");

export const NEWS_SOURCES = [
  { name: "VNExpress", fetch: fetchVNExpress },
  { name: "DanTri", fetch: fetchDanTri },
  { name: "TuoiTre", fetch: fetchTuoiTre },
  { name: "ThanhNien", fetch: fetchThanhNien },
  { name: "NguoiLaoDong", fetch: fetchNguoiLaoDong },
  { name: "PhatTuVN", fetch: fetchPhatTuVN },
  { name: "GoogleNews", fetch: fetchGoogleNews },
    
];

