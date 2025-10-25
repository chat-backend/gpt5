// utils/concurrency.js (ESM version)

// --- Hàm chạy nhiều tác vụ async với giới hạn song song ---
/**
 * Chạy nhiều tác vụ async với giới hạn số lượng chạy song song
 *
 * @param {Array<Function>} tasks - Mảng các hàm async (mỗi hàm trả về Promise)
 * @param {number} limit - Số lượng tác vụ tối đa chạy song song (mặc định = 5)
 * @returns {Promise<Array>} - Mảng kết quả của tất cả tác vụ
 */
export async function runWithConcurrency(tasks, limit = 5) {
  const results = [];          // Lưu kết quả trả về của các task
  const executing = new Set(); // Theo dõi các task đang chạy

  for (const task of tasks) {
    // Đảm bảo task luôn trả về Promise
    const p = Promise.resolve().then(task);
    results.push(p);
    executing.add(p);

    // Khi một task kết thúc thì loại bỏ khỏi "executing"
    p.finally(() => executing.delete(p));

    // Nếu số task đang chạy >= limit thì chờ một task kết thúc
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  // Trả về toàn bộ kết quả sau khi tất cả task hoàn thành
  return Promise.all(results);
}

// --- Ghi chú ---
// - Đây là named export (không dùng default).
// - Khi import: import { runWithConcurrency } from "./utils/concurrency.js";