// services/qaService.js (ESM version, optimized)
import axios from "axios";
import { askOpenAIWithHistory } from "./ai.js";
import { extractCity } from "./chatService.js";
import { formatWeatherResponse } from "../utils/formatWeather.js";
import { getTimeCache, getWeatherCache } from "./cacheService.js";
import { getNews } from "./newsService.js";
import { fetchAllCountries, fetchCountryInfo } from "./countryWebService.js";
import { getKnowledgeAnswer } from "./knowledge.js";
import { getWeatherByCity } from "./weatherService.js";
import { classifyIntent } from "./intentService.js";
import {
  addMessage,
  buildContextForAI
} from "../services/memory.js";
import { getFallbackAnswer } from "./fallback.js";

// --- Timeout helper ---
export function withTimeout(promise, ms, fallbackValue = null) {
  if (!promise || typeof promise.then !== "function") {
    console.error("⚠️ withTimeout: promise không hợp lệ");
    return Promise.resolve(fallbackValue);
  }

  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI timeout")), ms)
    )
  ]).catch(err => {
    if (err.message === "AI timeout") {
      console.error(`⏱️ Timeout khi gọi AI (sau ${ms}ms)`);
    } else {
      console.error(`❌ Lỗi khi gọi AI:`, err.message);
    }
    return fallbackValue;
  });
}

// --- Fallback AI: dùng history để nối mạch hội thoại ---
export async function fallbackAI(message, sessionId = "default") {
  try {
    const context = await buildContextForAI(sessionId);

    context.unshift({
      role: "system",
      content:
        "Bạn là một trợ lý thông tuệ, ưu tiên nối mạch hội thoại. " +
        "Nếu người dùng gõ 'thêm', 'phân tích thêm', hoặc 'viết tiếp', " +
        "hãy tiếp nối và mở rộng chủ đề trước đó, không chuyển sang chủ đề khác."
    });

    context.push({ role: "user", content: message });

    const aiAnswer = await withTimeout(
      askOpenAIWithHistory(context),
      8000,
      null
    );

    if (aiAnswer && typeof aiAnswer === "string" && aiAnswer.trim()) {
      console.log("✅ fallbackAI trả lời từ askOpenAIWithHistory");
      return aiAnswer.trim();
    }

    const fb = await getFallbackAnswer(sessionId, message, context);
    console.log("✅ fallbackAI trả lời từ getFallbackAnswer");
    return typeof fb === "string"
      ? fb
      : String(fb ?? "Xin lỗi, hiện tại tôi chưa thể xử lý yêu cầu này.");
  } catch (err) {
    console.error("❌ Lỗi fallbackAI:", err.message);
    return getRandomFallback(); // phương án cuối cùng
  }
}

// --- Helper: chạy logic chính + fallback ---
async function withFallback(message, sessionId, source, fn) {
  try {
    const result = await fn();
    console.log(`ℹ️ withFallback: source=${source}, success=${!!result}, sessionId=${sessionId}, message="${message}"`);
    if (result) {
      return { answer: result, source, suggestions: [], timestamp: new Date().toISOString() };
    }
    return { answer: await fallbackAI(message, sessionId), source: "AI", suggestions: [], timestamp: new Date().toISOString() };
  } catch (err) {
    console.error("❌ Lỗi intent:", err.message);
    return { answer: await fallbackAI(message, sessionId), source: "AI", suggestions: [], timestamp: new Date().toISOString() };
  }
}

export async function answerByIntent(intent, message, sessionId = "default") {
  console.log(`🎯 [answerByIntent] intent=${intent}, message="${message}"`);
  const q = (message || "").toLowerCase().trim();
  const cityRaw = extractCity(message);

  switch (intent) {
    case "weather":
      return withFallback(message, sessionId, "WeatherAPI", async () => {
        try {
          const weather = await getWeatherByCity(cityRaw);
          if (weather && !weather.error) return formatWeatherResponse(weather);
          const w = getWeatherCache();
          if (w && w.city) return formatWeatherResponse(w);
        } catch (err) {
          console.error("⚠️ Lỗi WeatherAPI:", err.message);
        }
        return null;
      });

    case "time": {
      const t = getTimeCache();
      if (t && t.formatted) {
        return {
          answer: `Bây giờ là ${t.formatted} (${t.timezone}).`,
          source: "Cache",
          suggestions: [],
          timestamp: new Date().toISOString()
        };
      }
      return {
        answer: await fallbackAI(message, sessionId),
        source: "AI",
        suggestions: [],
        timestamp: new Date().toISOString()
      };
    }

        case "news-24h":
      return withFallback(message, sessionId, "NewsAPI", async () => {
        try {
          const data = await getNews("", 20, "24h");
          if (Array.isArray(data) && data.length > 0) {
            const limit = 20;

            // Bộ lọc: bỏ domain không mong muốn + loại bỏ tiêu đề trùng
            const blacklistDomains = ["wikidata.org", "wikipedia.org"];
            const seen = new Set();
            const filtered = data.filter(a => {
              if (blacklistDomains.some(d => a.url.includes(d))) return false;
              if (seen.has(a.title)) return false;
              seen.add(a.title);
              return true;
            });

            const list = filtered
              .slice(0, limit)
              .map(
                (a, i) =>
                  `${i + 1}. [${a.title}](${a.url})\n🏷️ ${a.source} | ⏰ ${
                    a.publishedAt
                      ? new Date(a.publishedAt).toLocaleString("vi-VN")
                      : ""
                  }`
              )
              .join("\n\n");

            return `📰 Tin tức 24h mới nhất (Top ${limit}):\n\n${list}`;
          }
        } catch (err) {
          console.error("⚠️ Lỗi NewsAPI:", err.message);
        }
        return null;
      });

    case "news":
      return withFallback(message, sessionId, "NewsAPI", async () => {
        try {
          const latest = await getNews("", 20);
          if (Array.isArray(latest) && latest.length > 0) {
            const limit = 20;

            // Bộ lọc: bỏ domain không mong muốn + loại bỏ tiêu đề trùng
            const blacklistDomains = ["wikidata.org", "wikipedia.org"];
            const seen = new Set();
            const filtered = latest.filter(a => {
              if (blacklistDomains.some(d => a.url.includes(d))) return false;
              if (seen.has(a.title)) return false;
              seen.add(a.title);
              return true;
            });

            const body = filtered
              .slice(0, limit)
              .map((a, i) => `${i + 1}. [${a.title}](${a.url}) (${a.source})`)
              .join("\n");

            return `📰 Tin mới nhất (Top ${limit}):\n${body}`;
          }
        } catch (err) {
          console.error("⚠️ Lỗi NewsAPI:", err.message);
        }
        return null;
      });

    case "country": {
      const normMsg = q
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (/bao nhieu|how many|tong so|so luong/i.test(normMsg)) {
        const countries = await fetchAllCountries();
        if (countries.length > 0) {
          return {
            answer: `Hiện nay trên thế giới có khoảng ${countries.length} quốc gia.`,
            source: "REST Countries API",
            suggestions: [],
            timestamp: new Date().toISOString()
          };
        }
        return {
          answer: await fallbackAI(message, sessionId),
          source: "AI",
          suggestions: [],
          timestamp: new Date().toISOString()
        };
      }

      const words = normMsg.split(/\s+/);
      for (let i = words.length; i > 0; i--) {
        const candidate = words.slice(i - 2, i).join(" ");
        const country = await fetchCountryInfo(candidate.trim());
        if (country && country.success) {
          return {
            answer: country.summary,
            source: "REST Countries API",
            suggestions: [],
            timestamp: new Date().toISOString()
          };
        }
      }

      return {
        answer: await fallbackAI(message, sessionId),
        source: "AI",
        suggestions: [],
        timestamp: new Date().toISOString()
      };
    }

    case "search":
      return withFallback(message, sessionId, "Google", async () => {
        try {
          if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) return null;
          const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(
            message
          )}`;
          const gRes = await axios.get(url);
          const data = (gRes.data.items || []).slice(0, 3);
          if (data.length > 0) {
            return data
              .map(
                (it, i) =>
                  `${i + 1}. [${it.title}](${it.link})\n${it.snippet}`
              )
              .join("\n\n");
          }
        } catch (err) {
          console.error("⚠️ Lỗi Google Search:", err.message);
        }
        return null;
      });

   case "knowledge": {
      const kbAnswer = await getKnowledgeAnswer(message, sessionId);
      if (kbAnswer) {
        return {
          answer: kbAnswer.answer || kbAnswer,
          source: kbAnswer.source || "KnowledgeBase",
          suggestions: kbAnswer.suggestions || [],
          timestamp: new Date().toISOString()
        };
      }
      return {
        answer: await fallbackAI(message, sessionId),
        source: "AI",
        suggestions: [],
        timestamp: new Date().toISOString()
      };
    }

    // 👉 Case riêng cho intent "expand"
    case "expand": {
      const answer = await fallbackAI(message, sessionId);
      return {
        answer,
        source: "AI",
        suggestions: [],
        timestamp: new Date().toISOString()
      };
    }

    default:
      return {
        answer: await fallbackAI(message, sessionId),
        source: "AI",
        suggestions: [],
        timestamp: new Date().toISOString()
      };
  }
}

// --- Hàm chính: xử lý câu hỏi người dùng ---
export async function handleUserQuestion(sessionId, query) {
  try {
    const intent = await classifyIntent(query, sessionId);
    await addMessage(sessionId, "user", query, { intent });

    let result = {};
    try {
      result = (await answerByIntent(intent, query, sessionId)) || {};
    } catch (err) {
      console.error("❌ Lỗi answerByIntent:", err.message);
      result = {};
    }

    let finalAnswer = result.answer;
    let source = result.source || "AI";

    // Nếu answer rỗng → fallbackAI
    if (!finalAnswer || !finalAnswer.trim()) {
      finalAnswer = await fallbackAI(query, sessionId);
      source = "AI";
    }

    await addMessage(sessionId, "assistant", finalAnswer, { intent });

    return {
      answer: finalAnswer,
      source,
      suggestions: result.suggestions || [],
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ Lỗi handleUserQuestion:", err.message);
    const fallback = await fallbackAI(query, sessionId);
    await addMessage(sessionId, "assistant", fallback, { intent: "fallback" });

    return {
      answer: fallback,
      source: "AI",
      suggestions: [],
      timestamp: new Date().toISOString()
    };
  }
}
