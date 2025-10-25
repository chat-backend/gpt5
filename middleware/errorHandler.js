// middleware/errorHandler.js (ESM version)
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- Logger configuration ---------------- */

// Transport xoay vòng log lỗi
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, "../logs/%DATE%-error.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "error",
});

// Transport xoay vòng log tổng hợp
const combinedRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, "../logs/%DATE%-combined.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${
        stack || ""
      } ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    errorRotateTransport,
    combinedRotateTransport,
  ],
});

/* ---------------- Error Handler Middleware ---------------- */

export function errorHandler(err, req, res, next) {
  // Ghi log chi tiết
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip,
  });

  // Trả về JSON thống nhất
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    hint:
      process.env.NODE_ENV === "development"
        ? "Kiểm tra lại logic trong route hoặc service liên quan."
        : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

/* ---------------- Global Error Handler ---------------- */

export function setupGlobalErrorHandler() {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection", {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export default logger;