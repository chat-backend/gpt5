// update.js
require("dotenv").config(); // nạp biến môi trường từ .env
const { initAutoUpdate } = require("./autoUpdate");

// Gọi autoUpdate ngay khi chạy file
(async () => {
  try {
    console.log("🚀 Bắt đầu chạy autoUpdate...");
    await initAutoUpdate();
    console.log("✅ AutoUpdate hoàn tất");
    process.exit(0); // thoát sau khi xong
  } catch (err) {
    console.error("❌ Lỗi khi chạy autoUpdate:", err);
    process.exit(1);
  }
})();