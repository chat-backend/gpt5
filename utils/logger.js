// utils/logger.js (ESM version)
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
  SYSTEM: "system"
};

// 7. Bộ đếm source invalid
let invalidSourceCount = 0;
const INVALID_THRESHOLD = 5;
let invalidSourcesHistory = [];

// 8. Helper logWithSource
export function logWithSource(level, message, source, meta = {}) {
  const validSources = Object.values(SOURCES);

  if (!validSources.includes(source)) {
    invalidSourceCount++;
    invalidSourcesHistory.push(source);

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