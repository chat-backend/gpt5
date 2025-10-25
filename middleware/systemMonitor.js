// middleware/systemMonitor.js (ESM version)

import os from "os";

/**
 * 📌 Middleware giám sát hệ thống
 * - Kiểm tra CPU load trung bình (1 phút)
 * - Kiểm tra RAM free (%)
 * - Nếu vượt ngưỡng thì log cảnh báo ra console (kèm timestamp)
 */
export function systemMonitor(req, _res, next) {
  // --- Lấy thông tin hệ thống ---
  const loadAvg = os.loadavg()[0]; // CPU load trung bình 1 phút
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const freePercent = (freeMem / totalMem) * 100;

  // --- Thời gian hiện tại để log ---
  const now = new Date().toISOString();

  // --- Kiểm tra ngưỡng ---
  if (loadAvg > 1.0) {
    console.warn(
      `[${now}] ⚠️ Cảnh báo: CPU load cao (${loadAvg.toFixed(2)}) > 1.0`
    );
  }

  if (freePercent < 20) {
    console.warn(
      `[${now}] ⚠️ Cảnh báo: RAM khả dụng thấp (${freePercent.toFixed(2)}%) < 20%`
    );
  }

  // --- Tiếp tục request ---
  next();
}