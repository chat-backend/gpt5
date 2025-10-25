// routes/statusRouter.js (ESM version)

import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os"; // ✅ Dùng để lấy thông tin CPU, RAM

const router = Router();

/**
 * 📌 Hàm tiện ích: đọc file JSON an toàn
 */
function readJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    return fallback;
  } catch (err) {
    console.error(`❌ Lỗi khi đọc file ${filePath}:`, err.message);
    return fallback;
  }
}

/**
 * 📌 Route giám sát hệ thống (/status)
 * - Đọc dữ liệu từ các file cache (news.json, weather.json, time.json)
 * - Trả về thông tin tổng quan: số lượng tin tức, thời tiết hiện tại, thời gian cập nhật
 * - Bổ sung: CPU load trung bình + RAM khả dụng
 */
router.get("/", (_req, res) => {
  try {
    // --- Xác định đường dẫn tới các file cache ---
    const newsPath = path.resolve("./data/news.json");
    const weatherPath = path.resolve("./data/weather.json");
    const timePath = path.resolve("./data/time.json");

    // --- Đọc dữ liệu từ file ---
    const newsData = readJsonSafe(newsPath, []);
    const weatherData = readJsonSafe(weatherPath, {});
    const timeData = readJsonSafe(timePath, {});

    // --- Lấy thông tin hệ thống ---
    const loadAvg = os.loadavg(); // [1 phút, 5 phút, 15 phút]
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const freePercent = (freeMem / totalMem) * 100;

    // --- Chuẩn bị dữ liệu trả về ---
    res.json({
      status: "ok",
      newsCount: Array.isArray(newsData)
        ? newsData.length
        : (newsData.items?.length || 0),
      weather: weatherData?.city || "N/A",
      temperature: weatherData?.temperature || "N/A",
      lastUpdateTime: timeData?.formatted || "N/A",
      uptime: process.uptime().toFixed(0) + "s",
      memoryUsage: process.memoryUsage().rss, // RAM Node.js đang dùng
      systemMemory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        freePercent: freePercent.toFixed(2) + "%" // thêm % RAM free
      },
      cpuLoad: {
        "1m": loadAvg[0].toFixed(2),
        "5m": loadAvg[1].toFixed(2),
        "15m": loadAvg[2].toFixed(2)
      }
    });
  } catch (err) {
    console.error("❌ Lỗi khi xử lý /status:", err.message);
    res.status(500).json({ error: "Không thể lấy trạng thái hệ thống" });
  }
});

export { router as statusRouter };