// middleware/logger.js (ESM version)
import { logWithSource, SOURCES } from "../utils/logger.js";

// =======================
// 1. Mapping đường dẫn -> nguồn
// =======================
const SOURCE_BY_PATH = {
  // External APIs
  "/api/openai": "openai",
  "/api/google": "google",
  "/search": "google",
  "/api/openweather": "weather",
  "/weather": "weather",

  // News sources
  "/vnexpress": "vnexpress",
  "/dantri": "dantri",
  "/tuoitre": "tuoitre",
  "/thanhnien": "thanhnien",
  "/nld": "nguoilaodong",
  "/weather": "weather",
  "/vov": "vov",
  "/phattuvietnam": "phattuvietnam",
  "/google-rss": "googlerss",
  "/news": "news",

  // Knowledge base
  "/api/kb": "knowledge",
  "/ask": "knowledge",
  "/ask-auto": "knowledge",
  "/wikipedia": "wikipedia",

  // Chat & System
  "/chat": "chat",       
  "/status": "system"   
};

// =======================
// 2. Mapping nguồn -> nhóm
// =======================
const GROUP_BY_SOURCE = {
  // External
  openai: "external",
  google: "external",
  googlerss: "external",
  weather: "external",
  news: "external",
  vnexpress: "external",
  dantri: "external",
  tuoitre: "external",
  thanhnien: "external",
  nguoilaodong: "external",
  weather: "external",
  vov: "external",
  phattuvietnam: "external",
  wikipedia: "external",


  // Internal
  knowledge: "internal",
  chat: "internal",      
  system: "internal"     
};

// =======================
// 3. Mapping nguồn -> enum trong logger
// =======================
const SOURCE_ENUM = {
  openai: SOURCES.OPENAI,
  google: SOURCES.SEARCH,
  googlerss: SOURCES.SEARCH,
  weather: SOURCES.WEATHER,
  news: SOURCES.NEWS,
  vnexpress: SOURCES.NEWS,
  dantri: SOURCES.NEWS,
  tuoitre: SOURCES.NEWS,
  thanhnien: SOURCES.NEWS,
  nguoilaodong: SOURCES.NEWS,
  weather: SOURCES.NEWS,
  vov: SOURCES.NEWS,
  phattuvietnam: SOURCES.NEWS,
  wikipedia: SOURCES.WIKIPEDIA,

  knowledge: SOURCES.KNOWLEDGE,
  chat: SOURCES.KNOWLEDGE,   
  system: SOURCES.SYSTEM     
};

// =======================
// 4. Middleware log request
// =======================
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;

    let source = res.locals.source;
    if (!source && req.path) {
      for (const prefix in SOURCE_BY_PATH) {
        if (req.path.startsWith(prefix)) {
          source = SOURCE_BY_PATH[prefix];
          break;
        }
      }
    }

    if (!source || !(source in GROUP_BY_SOURCE)) {
      console.warn(
        `⚠️ Không xác định được source cho path: ${req.method} ${req.originalUrl}`
      );
      return;
    }

    const group = GROUP_BY_SOURCE[source];
    const sourceEnum = SOURCE_ENUM[source] || SOURCES.SYSTEM;

    logWithSource("info", "📥 Request", sourceEnum, {
      service: "chat-backend",
      source,
      group,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      method: req.method,
      path: req.originalUrl,
      query: req.body?.query || req.query?.q || null
    });
  });

  next();
}

// =======================
// 5. Hàm log answer
// =======================
export function answerLogger(query, source, answer, intent = null) {
  const sourceEnum = SOURCE_ENUM[source] || SOURCES.SYSTEM;
  const preview =
    typeof answer === "string"
      ? (answer.length > 100 ? answer.substring(0, 100) + "..." : answer)
      : "(no answer)";

  logWithSource("info", "📤 Answer", sourceEnum, {
    service: "chat-backend",
    source,
    group: GROUP_BY_SOURCE[source] || "other",
    intent,
    query,
    preview
  });
}