// autoUpdate.js (ESM version - chuẩn chỉnh)
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import axios from "axios";
import { fileURLToPath } from "url";
import { NEWS_SOURCES } from "./services/newsSources.js";
import { searchGoogleWeb } from "./services/googleSearch.js";
import { EventEmitter } from "events";
import NEWS_TOPICS from "./newsTopics.js";
import { classifyNewsArticle } from "./services/topicClassifier.js";

// --- EventEmitter để báo hiệu khi autoUpdate hoàn tất ---
export const autoUpdateEvents = new EventEmitter();

// --- Đường dẫn thư mục data ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

// Đảm bảo thư mục data tồn tại
await fs.mkdir(DATA_DIR, { recursive: true });

// -------------------- Socket.IO integration --------------------
let io = null;
export function setSocketIO(ioInstance) {
  io = ioInstance;
}

// -------------------- Tiện ích --------------------
function logError(context, err) {
  console.error(`❌ [${context}]`, err?.message || err);
}

async function saveJSON(file, data) {
  try {
    await fs.writeFile(
      path.join(DATA_DIR, file),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (err) {
    logError(`Ghi file ${file}`, err);
  }
}

function nowISO() {
  return new Date().toISOString();
}

// -------------------- Tin tức --------------------
export async function updateNews() {
  try {
    let allArticles = [];
    for (const source of NEWS_SOURCES) {
      try {
        const articles = await source.fetch();
        console.log(`✅ [News] ${source.name}: lấy được ${articles.length} tin`);
        allArticles.push(...articles);
      } catch (err) {
        logError(`News - ${source.name}`, err);
      }
    }

    // Lọc trùng
    const seen = new Set();
    const unique = allArticles.filter(a => {
      if (!a.url || seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // Phân loại theo NEWS_TOPICS
    const categorized = unique.map(a => ({
      ...a,
      category: classifyNewsArticle(a) // trả về t.query từ newsTopics.js
    }));

    await saveJSON("news.json", { updatedAt: nowISO(), articles: categorized });
    console.log(`📊 [News] Tổng: ${allArticles.length}, duy nhất: ${unique.length}`);

    // Phát sự kiện cho Socket.IO
    io?.emit("newsUpdate", { updatedAt: nowISO(), count: categorized.length });

    return categorized;
  } catch (err) {
    logError("News - Tổng thể", err);
    return [];
  }
}

// -------------------- WebSearch --------------------
export async function updateWebSearchBatchNatural({
  userQueries = [],
  lang = "lang_vi",
  num = 10,
  meta = {}
} = {}) {
  if (!Array.isArray(userQueries) || userQueries.length === 0) return [];

  const all = [];
  for (const rawQuery of userQueries) {
    const query = rawQuery?.trim();
    if (!query) continue;
    try {
      const results = await searchGoogleWeb(query, num, lang);
      all.push({ query, results, ...meta, timestamp: nowISO() });
      console.log(`✅ [WebSearch] "${query}" → ${results.length} kết quả`);
    } catch (err) {
      logError(`WebSearch - "${query}"`, err);
    }
  }

  await saveJSON("websearch-natural.json", { updatedAt: nowISO(), queries: all });
  io?.emit("websearchUpdate", { updatedAt: nowISO(), count: all.length });
  return all;
}

// -------------------- Countries --------------------
export async function updateCountries() {
  try {
    const url = "https://restcountries.com/v3.1/all?fields=name,cca2,region";
    const res = await fetch(url);
    const data = await res.json();

    const countries = data.map(c => ({
      code: c.cca2 || "",
      name: c.name?.common || "",
      region: c.region || ""
    }));

    await saveJSON("countries.json", { updatedAt: nowISO(), countries });
    console.log(`✅ [Countries] ${countries.length} quốc gia`);
    return countries;
  } catch (err) {
    logError("Countries", err);
    return [];
  }
}

// -------------------- Weather --------------------
export async function updateWeather(city = "Hanoi", countryCode = "VN") {
  try {
    if (!process.env.OPENWEATHER_API_KEY) throw new Error("Thiếu OPENWEATHER_API_KEY");

    const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { q: `${city},${countryCode}`, appid: process.env.OPENWEATHER_API_KEY, units: "metric", lang: "vi" }
    });

    const data = res.data;
    const weather = {
      city: data.name,
      country: data.sys?.country,
      temperature: data.main?.temp,
      description: data.weather?.[0]?.description,
      humidity: data.main?.humidity,
      wind_speed: data.wind?.speed,
      collectedAt: nowISO()
    };

    await saveJSON("weather.json", weather);
    console.log(`✅ [Weather] ${weather.city} - ${weather.description}`);
    io?.emit("weatherUpdate", weather);
    return weather;
  } catch (err) {
    logError("Weather", err);
    return null;
  }
}

// -------------------- Time --------------------
export async function updateTime() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "full",
      timeStyle: "long"
    });

    const timeData = {
      datetime: now.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      formatted: formatter.format(now),
      collectedAt: nowISO()
    };

    await saveJSON("time.json", timeData);
    console.log(`✅ [Time] ${timeData.formatted}`);
    io?.emit("timeUpdate", timeData);
    return timeData;
  } catch (err) {
    logError("Time", err);
    return null;
  }
}

// -------------------- Init & Cron --------------------
export async function initAutoUpdate() {
  console.log("🚀 [AutoUpdate] Khởi động lần đầu...");
  try {
    await Promise.all([
      updateNews(),
      updateCountries(),
      updateWeather("Hanoi", "VN"),
      updateTime()
    ]);
    console.log("✅ [AutoUpdate] Hoàn tất lần chạy đầu tiên.");
    autoUpdateEvents.emit("done");
  } catch (err) {
    logError("initAutoUpdate", err);
  }
}

export function startCronJobs() {
  // News mỗi 3 giờ
  cron.schedule("0 */3 * * *", async () => {
    try {
      await updateNews();
    } catch (err) {
      logError("Cron updateNews", err);
    } finally {
      autoUpdateEvents.emit("done");
    }
  });

  // Countries mỗi ngày
  cron.schedule("0 0 * * *", async () => {
    try {
      await updateCountries();
    } catch (err) {
      logError("Cron updateCountries", err);
    } finally {
      autoUpdateEvents.emit("done");
    }
  });

  // Weather mỗi giờ
  cron.schedule("0 * * * *", async () => {
    try {
      await updateWeather("Hanoi", "VN");
    } catch (err) {
      logError("Cron updateWeather", err);
    } finally {
      autoUpdateEvents.emit("done");
    }
  });

  // Time mỗi 30 phút
  cron.schedule("*/30 * * * *", async () => {
    try {
      await updateTime();
    } catch (err) {
      logError("Cron updateTime", err);
    } finally {
      autoUpdateEvents.emit("done");
    }
  });
}