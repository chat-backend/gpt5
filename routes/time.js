// routes/time.js (ESM version)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function timeHandler() {
  try {
    // đi lên 1 cấp từ routes/ để tới thư mục data/
    const filePath = path.resolve(__dirname, "../data/time.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    // Ưu tiên formatted, fallback sang current
    const msg =
      data.formatted ||
      data.current ||
      "⚠️ Không có dữ liệu thời gian.";

    return {
      message: msg,
      source: "time",
      error: false
    };
  } catch (err) {
    console.error("❌ timeHandler error:", err.message);
    return {
      message: "⚠️ Không đọc được dữ liệu thời gian.",
      source: "time",
      error: true
    };
  }
}