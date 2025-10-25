// logger.js (ESM version, đặt ở gốc dự án chat-backend)
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    // Có thể thêm file log nếu cần:
    // new winston.transports.File({ filename: "app.log" })
  ],
});

export default logger;