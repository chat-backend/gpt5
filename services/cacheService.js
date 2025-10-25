// services/cacheService.js (ESM version)
import axios from "axios";
import cron from "node-cron";
import {
  fetchVNExpress,
  fetchDanTri,
  fetchTuoiTre,
  fetchThanhNien,
  fetchNguoiLaoDong,
  fetchVOV,
  fetchPhatTuVN,
  fetchGoogleNews,
  fetchGoogleCustomSearch,
  fetchWeather,
  fetchWikipedia,
  // nguồn mới
  fetchVietnamBizStock,
  fetchMITTechAI,
  fetchVentureBeatAI,
  fetchSyncedAI,
  fetchVNExpressBiz,
  fetchTuoiTreEdu,
  fetchThanhNienEdu
} from "./newsSources.js";

// RAM cache
let newsCache = [];
let newsStats = { savedToRAM: 0, totalFetched: 0, totalRemoved: 0 };
let weatherCache = {};
let timeCache = {};
let countriesCache = [];

/* ---------------- REFRESH NEWS ---------------- */
export async function refreshNews() {
  const start = Date.now();
  console.log("⏰ Bắt đầu cập nhật tin tức...");

  try {
    const results = await Promise.allSettled([
      fetchGoogleCustomSearch(),
      fetchGoogleNews(),
      fetchVNExpress(),
      fetchDanTri(),
      fetchTuoiTre(),
      fetchThanhNien(),
      fetchNguoiLaoDong(),
      fetchVOV(),
      fetchPhatTuVN(),
      fetchWikipedia(),
      // nguồn mới
      fetchVietnamBizStock(),
      fetchMITTechAI(),
      fetchVentureBeatAI(),
      fetchSyncedAI(),
      fetchVNExpressBiz(),
      fetchTuoiTreEdu(),
      fetchThanhNienEdu()
    ]);

    const allArticles = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const totalFetched = allArticles.length;
    const seen = new Set();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const uniqueArticles = allArticles.filter((a) => {
      const key = (a.url || a.title || "").toLowerCase().split("?")[0];
      if (!key) return false;
      if (seen.has(key)) return false;
      if (!a.title || !a.url || !a.description) return false;
      if (a.publishedAt && now - a.publishedAt > sevenDays) return false;
      seen.add(key);
      return true;
    });

    // Sort theo publishedAt (mới nhất trước)
    uniqueArticles.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
    newsCache = uniqueArticles.slice(0, 1000);

    const duration = Date.now() - start;
    newsStats = {
      totalFetched,
      totalRemoved: totalFetched - uniqueArticles.length,
      totalAfterFilter: uniqueArticles.length,
      savedToRAM: newsCache.length,
      lastUpdated: new Date().toISOString(),
      duration
    };

    console.log(
      `📊 Tin tức: lấy ${totalFetched}, loại ${newsStats.totalRemoved}, còn lại ${newsStats.totalAfterFilter}. Lưu ${newsCache.length} bài (⏱ ${duration}ms).`
    );
  } catch (err) {
    console.error("❌ Lỗi refreshNews:", err.message);
  }
}

/* ---------------- GET NEWS BY CATEGORY ---------------- */
export function getNewsByCategory(category) {
  if (!category) return [];
  return newsCache.filter(
    (a) =>
      a.category &&
      a.category.toLowerCase() === category.toLowerCase()
  );
}

/* ---------------- REFRESH WEATHER ---------------- */
export async function refreshWeather(city = "Hanoi", countryCode = "VN") {
  try {
    const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        q: `${city},${countryCode}`,
        appid: process.env.OPENWEATHER_API_KEY,
        units: "metric",
        lang: "vi"
      }
    });
    const data = res.data;
    weatherCache = {
      city: data.name,
      country: data.sys?.country,
      temperature: Math.round(data.main?.temp),
      description: data.weather?.[0]?.description,
      humidity: data.main?.humidity,
      wind_speed: data.wind?.speed,
      collectedAt: new Date().toISOString()
    };
    console.log(`🌤️ Weather cập nhật: ${weatherCache.city} ${weatherCache.temperature}°C`);
  } catch (err) {
    console.error("❌ Lỗi weather:", err.message, err.response?.data || "");
  }
}

/* ---------------- REFRESH TIME ---------------- */
export async function refreshTime() {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "full",
      timeStyle: "long"
    });
    timeCache = {
      datetime: now.toISOString(),
      timezone: "Asia/Ho_Chi_Minh",
      formatted: formatter.format(now),
      weekday: now.toLocaleDateString("vi-VN", { weekday: "long" }),
      day_of_week: now.getDay(),
      collectedAt: new Date().toISOString()
    };
    console.log(`🕒 Time cập nhật: ${timeCache.formatted}`);
  } catch (err) {
    console.error("❌ Lỗi time:", err.message);
  }
}

/* ---------------- REFRESH COUNTRIES ---------------- */
export async function refreshCountries() {
  try {
    const res = await axios.get(
      "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flags,region,population",
      { timeout: 20000 }
    );

    if (!Array.isArray(res.data) || res.data.length === 0) {
      console.warn("⚠️ API restcountries trả về rỗng!");
      return;
    }

    countriesCache = res.data
      .map((c) => ({
        code: c.cca2 || "",
        name: c.name?.common || "",
        region: c.region || "",
        population: c.population || 0,
        flag: c.flags?.png || c.flags?.svg || ""
      }))
      .filter((c) => c.name);

    console.log(`🌍 Countries cập nhật: ${countriesCache.length} quốc gia`);
  } catch (err) {
    console.error("❌ Lỗi countries:", err.message, err.response?.data || "");
  }
}

/* ---------------- GETTERS ---------------- */
export function getCountriesCache() {
  if (!countriesCache || countriesCache.length === 0) {
    console.warn("⚠️ Countries cache hiện đang rỗng. Hãy kiểm tra refreshCountries().");
  }
  return [...countriesCache];
}

export function getNewsStats() {
  return {
    message: `Hiện tại có ${newsStats.savedToRAM || 0} bài trong RAM, tổng lấy ${newsStats.totalFetched || 0}, loại bỏ ${newsStats.totalRemoved || 0}.`,
    ...newsStats
  };
}

export const getNewsCache = () => [...newsCache];
export const getWeatherCache = () => ({ ...weatherCache });
export const getTimeCache = () => ({ ...timeCache });

/* ---------------- INIT CRON JOBS ---------------- */
export function initAutoUpdate() {
  refreshNews().catch(console.error);
  refreshWeather().catch(console.error);
  refreshTime().catch(console.error);
  refreshCountries().catch(console.error);

  cron.schedule("*/30 * * * *", refreshTime);       // mỗi 30 phút
  cron.schedule("0 * * * *", refreshWeather);       // mỗi giờ
  cron.schedule("0 */3 * * *", refreshNews);        // mỗi 3 giờ
  cron.schedule("0 0 * * *", refreshCountries);     // mỗi ngày
}