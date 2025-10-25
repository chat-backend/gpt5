// utils/loggerMiddleware.js
import fs from "fs";
import path from "path";

// Tạo thư mục logs nếu chưa có
const LOG_DIR = path.resolve("logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

/**
 * Ghi log ra file theo định dạng JSON (async, không block event loop)
 */
async function writeLog(entry, filename = "app.log") {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, ...entry };
  const logFile = path.join(LOG_DIR, filename);
  try {
    await fs.promises.appendFile(logFile, JSON.stringify(logEntry) + "\n", "utf8");
  } catch (err) {
    console.error("Không ghi được log:", err.message);
  }
}

/**
 * Middleware log request
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // ns → ms

    const logEntry = {
      type: "request",
      level: "info",
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ip: req.ip,
      body: req.body || null,
      query: req.query || null,
    };

    writeLog(logEntry, "requests.log");
    console.info(`[REQ] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration.toFixed(2)}ms`);
  });

  next();
}

/**
 * Middleware log error (dùng chung với errorHandler)
 */
export function errorLogger(err, req, res, next) {
  const logEntry = {
    type: "error",
    level: "error",
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
    ip: req.ip,
  };

  writeLog(logEntry, "errors.log");
  console.error(`[ERR] ${req.method} ${req.originalUrl} - ${err.message}`);
  next(err); // chuyển tiếp cho errorHandler xử lý
}