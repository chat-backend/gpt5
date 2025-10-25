// updateNews.js (ESM version)
import fs from "fs";
import path from "path";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { NEWS_SOURCES } from "./autoupdateSources.js";

// Nếu Node >= 18 có sẵn fetch, nếu không thì import node-fetch
// import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- Hàm cập nhật tin tức từ 10 nguồn ---
export async function updateNews() {
  try {
    let allArticles = [];

    for (const source of NEWS_SOURCES) {
      try {
        const articles = await source.fetch();
        console.log(`✅ [News] ${source.name}: lấy được ${articles.length} tin`);
        allArticles = allArticles.concat(articles);
      } catch (err) {
        console.error(`❌ [News] Lỗi khi lấy tin từ ${source.name}:`, err.message);
      }
    }

    const filePath = path.join(DATA_DIR, "news.json");
    fs.writeFileSync(filePath, JSON.stringify({
      updatedAt: new Date().toISOString(),
      articles: allArticles
    }, null, 2), "utf8");

    console.log(`📌 [News] Đã cập nhật news.json (${allArticles.length} tin)`);
    return allArticles;
  } catch (err) {
    console.error("❌ [News] Lỗi updateNews:", err.message);
    fs.writeFileSync(path.join(DATA_DIR, "news.json"), "[]", "utf8");
    return [];
  }
}

// --- Hàm cập nhật danh sách quốc gia ---
export async function updateCountries() {
  try {
    const url = "https://restcountries.com/v3.1/all";
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ [Countries] API error:", text);
      fs.writeFileSync(path.join(DATA_DIR, "countries.json"), "[]", "utf8");
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error("❌ [Countries] API không trả về mảng:", data);
      fs.writeFileSync(
        path.join(DATA_DIR, "countries-error.json"),
        JSON.stringify(data, null, 2),
        "utf8"
      );
      return [];
    }

    const countries = data.map(c => ({
      name: c.name?.common || "",
      code: c.cca2 || "",
      region: c.region || ""
    }));

    fs.writeFileSync(
      path.join(DATA_DIR, "countries.json"),
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        countries
      }, null, 2),
      "utf8"
    );

    console.log(`📌 [Countries] Đã cập nhật countries.json (${countries.length} quốc gia)`);
    return countries;
  } catch (err) {
    console.error("❌ [Countries] Lỗi updateCountries:", err.message);
    fs.writeFileSync(path.join(DATA_DIR, "countries.json"), "[]", "utf8");
    return [];
  }
}

// --- Hàm khởi động autoUpdate ---
export function initAutoUpdate() {
  // chạy ngay khi start
  updateNews();
  updateCountries();

  // chạy lại mỗi 5 phút
  cron.schedule("*/5 * * * *", () => {
    console.log("🔄 [AutoUpdate] Đang chạy...");
    updateNews();
    updateCountries();
  });
}