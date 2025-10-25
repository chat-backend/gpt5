// utils/errorHandler.js (ESM version)
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

/* ---------------- Format lỗi ---------------- */
function formatError(err) {
  const stackLines = (err.stack || "").split("\n");
  const traceLine = stackLines.find(line => line.includes(".js:"));
  let location = "Không xác định";
  let file, line, col;

  if (traceLine) {
    const match = traceLine.match(/\((.*):(\d+):(\d+)\)/) || traceLine.match(/(.*):(\d+):(\d+)/);
    if (match) {
      [, file, line, col] = match;
      location = `${file}:${line}:${col}`;
    }
  }

  let codeContext = "";
  if (file && line) {
    try {
      const content = fs.readFileSync(file, "utf8").split("\n");
      const lineNum = parseInt(line, 10);
      const start = Math.max(0, lineNum - 3);
      const end = Math.min(content.length, lineNum + 2);
      codeContext = content
        .slice(start, end)
        .map((l, i) => {
          const currentLine = start + i + 1;
          return (currentLine === lineNum ? ">>> " : "    ") + currentLine + " | " + l;
        })
        .join("\n");
    } catch {
      codeContext = "Không đọc được file để hiển thị context.";
    }
  }

  return { name: err.name, message: err.message, location, stack: err.stack, codeContext };
}

/* ---------------- Gợi ý xử lý ---------------- */
function suggestSolution(message) {
  if (/not a function/i.test(message)) return "Có thể bạn đang gọi một hàm chưa được export hoặc biến không phải function.";
  if (/Cannot find module/i.test(message)) return "Kiểm tra lại đường dẫn import/export hoặc cài đặt package.";
  if (/undefined/i.test(message)) return "Biến chưa được khởi tạo hoặc chưa có giá trị.";
  if (/SyntaxError/i.test(message)) return "Có thể thiếu dấu ngoặc, dấu chấm phẩy, hoặc sai cú pháp JS/ESM.";
  if (/Unexpected token/i.test(message)) return "Có thể bạn viết sai cú pháp (thiếu hoặc thừa dấu { } hoặc () ).";
  if (/export|import/i.test(message)) return "Kiểm tra lại cú pháp import/export và đường dẫn file.";
  return "Kiểm tra lại code tại vị trí báo lỗi.";
}

/* ---------------- Logging ---------------- */
async function logToFile(content) {
  const logDir = path.resolve("logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const logFile = path.join(logDir, `error-${dateStr}.log`);

  // Xoá file log cũ hơn 24h
  const files = await fs.promises.readdir(logDir);
  for (const file of files) {
    if (file.startsWith("error-") && file.endsWith(".log")) {
      const filePath = path.join(logDir, file);
      const stats = await fs.promises.stat(filePath);
      const age = now - stats.mtime;
      if (age > 24 * 60 * 60 * 1000) {
        await fs.promises.unlink(filePath);
      }
    }
  }

  await fs.promises.appendFile(logFile, content + "\n", "utf8");
}

/* ---------------- Notify ---------------- */
async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  } catch (e) {
    console.error("Không gửi được cảnh báo Telegram:", e.message);
  }
}

async function notifySlack(text) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
  } catch (e) {
    console.error("Không gửi được cảnh báo Slack:", e.message);
  }
}

async function notifyAllChannels(message) {
  await Promise.all([notifyTelegram(message), notifySlack(message)]);
}

/* ---------------- Middleware Express ---------------- */
export async function errorMiddleware(err, req, res, next) {
  const { name, message, location, stack, codeContext } = formatError(err);
  const suggestion = suggestSolution(message);

  const logContent = [
    `❌ [${process.env.NODE_ENV || "dev"}] Express Error:`,
    `   ➤ Loại lỗi: ${name}`,
    `   ➤ File/Lỗi: ${location}`,
    `   ➤ Thông điệp: ${message}`,
    `   ➤ Gợi ý xử lý: ${suggestion}`,
    `   ➤ Code context:\n${codeContext}`,
    `   ➤ Stack: ${stack}`
  ].join("\n");

  console.error(logContent);
  await logToFile(`[${new Date().toISOString()}] ${logContent}`);
  await notifyAllChannels(`🚨 *Express Error*\n${logContent}`);

  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: true,
    message,
    location: isProd ? undefined : location,
    suggestion,
    codeContext: isProd ? undefined : codeContext,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
}

/* ---------------- Global Error Handler ---------------- */
export function setupGlobalErrorHandler() {
  process.on("uncaughtException", async (err) => {
    const { message, location, stack, codeContext } = formatError(err);
    const suggestion = suggestSolution(message);

    const logContent = [
      "💥 Uncaught Exception:",
      `   ➤ File/Lỗi: ${location}`,
      `   ➤ Thông điệp: ${message}`,
      `   ➤ Gợi ý xử lý: ${suggestion}`,
      `   ➤ Code context:\n${codeContext}`,
      `   ➤ Stack: ${stack}`
    ].join("\n");

    console.error(logContent);
    await logToFile(`[${new Date().toISOString()}] ${logContent}`);
    await notifyAllChannels(`🚨 *Uncaught Exception*\n${logContent}`);
  });

  process.on("unhandledRejection", async (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    const { message, location, stack, codeContext } = formatError(err);
    const suggestion = suggestSolution(message);

    const logContent = [
      "💥 Unhandled Rejection:",
      `   ➤ File/Lỗi: ${location}`,
      `   ➤ Thông điệp: ${message}`,
      `   ➤ Gợi ý xử lý: ${suggestion}`,
      `   ➤ Code context:\n${codeContext}`,
      `   ➤ Stack: ${stack}`
    ].join("\n");

    console.error(logContent);
    await logToFile(`[${new Date().toISOString()}] ${logContent}`);
    await notifyAllChannels(`🚨 *Unhandled Rejection*\n${logContent}`);
  });
}