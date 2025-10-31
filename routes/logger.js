// routes/logger.js (ESM version)
import fs from "fs";
import os from "os";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

// 1. Đảm bảo thư mục logs tồn tại
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs", { recursive: true });
}

// 2. Format cho file log (JSON)
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.json()
);

// 3. Format cho console
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, source, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}] [source=${source || "unknown"}]: ${message} ${metaStr}`;
  })
);

// 4. Transports xoay vòng file
const infoTransport = new transports.DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "info",
  format: fileFormat
});
const warnTransport = new transports.DailyRotateFile({
  filename: "logs/warn-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "21d",
  level: "warn",
  format: fileFormat
});
const errorTransport = new transports.DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
  format: fileFormat
});

// 5. Khởi tạo logger
export const logger = createLogger({
  level: "info",
  defaultMeta: {
    service: "chat-backend",
    host: os.hostname(),
    pid: process.pid,
    env: process.env.NODE_ENV || "development"
  },
  transports: [
    new transports.Console({ format: consoleFormat }),
    infoTransport,
    warnTransport,
    errorTransport
  ],
  exceptionHandlers: [
    new transports.File({ filename: "logs/exceptions.log", format: fileFormat }),
    new transports.Console({ format: consoleFormat })
  ],
  rejectionHandlers: [
    new transports.File({ filename: "logs/rejections.log", format: fileFormat }),
    new transports.Console({ format: consoleFormat })
  ],
  exitOnError: false
});

// 6. Enum nguồn
export const SOURCES = {
  NEWS: "news",
  WEATHER: "weather",
  SEARCH: "search",
  KNOWLEDGE: "knowledge",
  OPENAI: "openai",
  TIME: "time",
  SYSTEM: "system",
  AI: "ai",           // thêm
  INTERNAL: "internal", // thêm
  EXTERNAL: "external",  // thêm
  GLOBAL: "global" // ✅ thêm
};

// 7. Danh sách 8 nguồn tin tức chính thức
const NEWS_SOURCES = [
  "vnexpress",
  "dantri",
  "tuoitre",
  "thanhnien",
  "nguoilaodong",
  "phattuvn",
  "googlenews"
  ];

// 8. Mapping nguồn -> nhóm
const GROUP_BY_SOURCE = Object.fromEntries(
  NEWS_SOURCES.map(src => [src, "external"])
);
Object.assign(GROUP_BY_SOURCE, {
  openai: "external",
  googlerss: "external",
  weather: "external",
  news: "external",
  global: "external",   // ✅ thêm
  ai: "internal",        // thêm
  knowledge: "internal",
  chat: "internal",
  time: "internal",      // thêm
  system: "internal"
});

// 9. Mapping nguồn -> enum
const SOURCE_ENUM = Object.fromEntries(
  NEWS_SOURCES.map(src => [src, SOURCES.NEWS])
);
Object.assign(SOURCE_ENUM, {
  openai: SOURCES.OPENAI,
  googlerss: SOURCES.SEARCH,
  weather: SOURCES.WEATHER,
  news: SOURCES.NEWS,
  global: SOURCES.GLOBAL,   // ✅ thêm
  ai: SOURCES.AI,             // thêm
  knowledge: SOURCES.KNOWLEDGE,
  chat: SOURCES.KNOWLEDGE,
  time: SOURCES.TIME,         // thêm
  system: SOURCES.SYSTEM
});

// 10. Bộ đếm source invalid
let invalidSourceCount = 0;
const INVALID_THRESHOLD = 5;
let invalidSourcesHistory = [];

// 11. Helper logWithSource
export function logWithSource(level, message, source, meta = {}) {
  const validSources = Object.values(SOURCES);
  if (!validSources.includes(source) && !NEWS_SOURCES.includes(source)) {
    invalidSourceCount++;
    invalidSourcesHistory.push(source);
    if (invalidSourcesHistory.length > 20) {
      invalidSourcesHistory = invalidSourcesHistory.slice(-20);
    }
    logger.warn("Nguồn không hợp lệ, fallback sang 'unknown'", {
      source,
      invalidSourceCount,
      invalidSourcesHistory,
      ...meta
    });
    if (invalidSourceCount >= INVALID_THRESHOLD) {
      logger.error("Phát hiện nhiều nguồn invalid liên tiếp, cần kiểm tra bộ phân loại!", {
        invalidSourceCount,
        recentInvalid: invalidSourcesHistory.slice(-INVALID_THRESHOLD)
      });
      invalidSourceCount = 0;
      invalidSourcesHistory = [];
    }
    source = "unknown";
  }
  logger.log(level, message, { source, ...meta });
}

// 12. Helper log update
export function logUpdateStart() {
  logger.info("⏰ Bắt đầu cập nhật tin tức...");
}
export function logUpdateTime() {
  const now = new Date();
  logger.info(`🕒 Time cập nhật: ${now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`);
}
export function logWeather(city, temp) {
  logger.info(`🌤️ Weather cập nhật: ${city} ${temp}°C`);
}
export function logNews(total, filtered, saved, durationMs) {
  logger.info(`📊 Tin tức: lấy ${total}, loại ${filtered}, còn lại ${saved}. Lưu ${saved} bài (⏱ ${durationMs}ms)`);
}
export function logError(err, context = "Unknown") {
  logger.error(`❌ Lỗi [${context}]: ${err.message}`, { stack: err.stack });
}

// 13. Middleware log request
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    let source = res.locals.source;
    if (!source && req.path) {
      source = NEWS_SOURCES.find(s => req.path.includes(s)) || null;
    }
    if (!source || !(source in GROUP_BY_SOURCE)) {
      logWithSource("warn", "⚠️ Unknown source", SOURCES.SYSTEM, {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration: `${durationMs}ms`,
        query: req.body?.query || req.query?.q || null
      });
      return;
    }
    const group = GROUP_BY_SOURCE[source];
    const sourceEnum = SOURCE_ENUM[source] || SOURCES.SYSTEM;
    logWithSource("info", "📥 Request", sourceEnum, {
      source,
      group,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs}ms`,
      query: req.body?.query || req.query?.q || null
    });
  });

  next();
}

// 14. Middleware log answer
export function answerLogger(query, source, answer, intent = null, link = null) {
  const sourceEnum = SOURCE_ENUM[source] || SOURCES.SYSTEM;

  // Giới hạn preview để tránh log quá dài
  const MAX_PREVIEW_LENGTH = 120;
  const preview =
    typeof answer === "string"
      ? (answer.length > MAX_PREVIEW_LENGTH
          ? answer.substring(0, MAX_PREVIEW_LENGTH) + "..."
          : answer)
      : "(no answer)";

  logWithSource("info", "📤 Answer", sourceEnum, {
    source,
    group: GROUP_BY_SOURCE[source] || "other",
    intent,
    query,
    preview,
    link: link || null // chuẩn hóa: luôn có field link, null nếu không có
  });
}
// 15. Helper log search (global search)
export function logSearch(query, total, durationMs, source = "global") {
  const sourceEnum = SOURCE_ENUM[source] || SOURCES.SEARCH;
  logWithSource("info", "🔎 Global Search", sourceEnum, {
    query,
    total,
    duration: `${durationMs}ms`
  });
}