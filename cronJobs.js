// cronjobs.js (ESM version - tinh gọn)
import cron from "node-cron";
import { logWithSource, SOURCES } from "./utils/logger.js";
import {
  updateNews,
  updateWeather,
  updateTime,
  updateCountries
} from "./autoUpdate.js";

// --- Cron jobs ---
export function startCronJobs() {
  // Tin tức: mỗi 10 phút
  cron.schedule("*/10 * * * *", async () => {
    logWithSource("info", "🔄 [Cron] Refresh News...", SOURCES.NEWS);
    await updateNews().catch(err =>
      logWithSource("error", `❌ Cron News: ${err.message}`, SOURCES.NEWS)
    );
  });

  // Thời tiết: mỗi giờ
  cron.schedule("0 * * * *", async () => {
    logWithSource("info", "🔄 [Cron] Refresh Weather...", SOURCES.WEATHER);
    await updateWeather("Hanoi", "VN").catch(err =>
      logWithSource("error", `❌ Cron Weather: ${err.message}`, SOURCES.WEATHER)
    );
  });

  // Thời gian: mỗi 30 phút
  cron.schedule("*/30 * * * *", async () => {
    logWithSource("info", "🔄 [Cron] Refresh Time...", SOURCES.TIME);
    await updateTime().catch(err =>
      logWithSource("error", `❌ Cron Time: ${err.message}`, SOURCES.TIME)
    );
  });

  // Quốc gia: mỗi ngày lúc 0h
  cron.schedule("0 0 * * *", async () => {
    logWithSource("info", "🔄 [Cron] Refresh Countries...", SOURCES.SYSTEM);
    await updateCountries().catch(err =>
      logWithSource("error", `❌ Cron Countries: ${err.message}`, SOURCES.SYSTEM)
    );
  });

  logWithSource(
    "info",
    "✅ Cron jobs (News + Weather + Time + Countries) đã khởi động.",
    SOURCES.SYSTEM
  );
}