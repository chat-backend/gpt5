// app.js (ESM version)
import express from "express";
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import axios from "axios";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import { newsHandler } from "./routes/news.js";

const app = express();

export const autoUpdateEvents = new EventEmitter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

await fs.mkdir(DATA_DIR, { recursive: true });

function nowISO() { return new Date().toISOString(); }
function logError(context, err) { console.error(`❌ [${context}]`, err?.message || err); }
async function saveJSON(file, data) {
  try {
    await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
  } catch (err) { logError(`Ghi file ${file}`, err); }
}

// --- News ---
export async function updateNews() {
  try {
    // Lấy 100 tin mới nhất và lưu vào news.json (theo logic trong newsHandler)
    const result = await newsHandler(100);

    console.log(`✅ [News] Đã cập nhật ${result.content.split("\n").length - 1} tin`);
    autoUpdateEvents.emit("newsUpdate", {
      updatedAt: new Date().toISOString(),
      count: (result.content.match(/\n/g) || []).length
    });

    return result;
  } catch (err) {
    logError("News - Tổng thể", err);
    return { source: "news", content: "Hệ thống gặp sự cố khi cập nhật tin tức." };
  }
}

// --- Weather ---
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
    autoUpdateEvents.emit("weatherUpdate", weather);
    return weather;
  } catch (err) { logError("Weather", err); return null; }
}

// --- Time ---
export async function updateTime() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full", timeStyle: "long"
    });
    const timeData = {
      datetime: now.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      formatted: formatter.format(now),
      collectedAt: nowISO()
    };
    await saveJSON("time.json", timeData);
    autoUpdateEvents.emit("timeUpdate", timeData);
    return timeData;
  } catch (err) { logError("Time", err); return null; }
}

// --- Init & Cron ---
export async function initAutoUpdate() {
  console.log("🚀 [AutoUpdate] Khởi động lần đầu...");
  try {
    await Promise.all([ updateNews(), updateWeather("Hanoi", "VN"), updateTime() ]);
    console.log("✅ [AutoUpdate] Hoàn tất lần chạy đầu tiên.");
    autoUpdateEvents.emit("done");
  } catch (err) { logError("initAutoUpdate", err); }
}

export function startCronJobs() {
  cron.schedule("0 */3 * * *", async () => { try { await updateNews(); } finally { autoUpdateEvents.emit("done"); } });
  cron.schedule("0 * * * *", async () => { try { await updateWeather("Hanoi", "VN"); } finally { autoUpdateEvents.emit("done"); } });
  cron.schedule("*/30 * * * *", async () => { try { await updateTime(); } finally { autoUpdateEvents.emit("done"); } });
}

export default app;
