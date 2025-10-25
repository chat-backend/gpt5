const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // npm install node-fetch

// 🌍 Danh mục Wikipedia đa lĩnh vực (25 mục)
const categories = [
  "Khoa học",
  "Lịch sử",
  "Văn hóa",
  "Địa lý",
  "Chính trị",
  "Thể thao",
  "Công nghệ",
  "Y học",
  "Nghệ thuật",
  "Triết học",
  "Kinh tế",
  "Giáo dục",
  "Môi trường",
  "Tôn giáo",
  "Luật pháp",
  "Xã hội học",
  "Tâm lý học",
  "Ngôn ngữ học",
  "Toán học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Thiên văn học",
  "Âm nhạc",
  "Văn học",
  // 🌍 Bổ sung toàn cầu
  "Nhân quyền",
  "Khí hậu",
  "Năng lượng",
  "Giao thông",
  "Truyền thông",
  "Internet",
  "Trí tuệ nhân tạo",
  "Robot học",
  "Nông nghiệp",
  "Ẩm thực",
  "Du lịch",
  "Kiến trúc",
  "Điện ảnh",
  "Thời trang",
  "Thiết kế",
  "Văn hóa đại chúng",
  "Trò chơi điện tử",
  "Kinh doanh",
  "Tài chính",
  "Sức khỏe cộng đồng",
  "Dân số",
  "Không gian vũ trụ"
];

// Hàm fetch có retry và User-Agent
async function fetchWikipediaSummary(title, retries = 3) {
  const url = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "ChatBackend/1.0 (https://localhost; contact@example.com)"
        }
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      console.error(`⚠️ Thử ${attempt}/${retries} thất bại với ${title}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // chờ tăng dần
    }
  }
}

async function importWikipedia() {
  const results = [];
  console.log(`🔎 Bắt đầu lấy dữ liệu từ Wikipedia (${categories.length} danh mục)...\n`);

  for (const cat of categories) {
    try {
      const data = await fetchWikipediaSummary(cat);
      results.push({
        category: cat,
        title: data.title,
        description: data.description || "",
        extract: data.extract || "",
        url: data.content_urls?.desktop?.page || "",
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Đã lấy: ${cat}`);
    } catch (err) {
      console.error(`❌ Bỏ qua ${cat} sau khi thử nhiều lần: ${err.message}`);
    }
  }

  // Ghi ra file wikipedia.json
  const filePath = path.join(__dirname, "..", "wikipedia.json");
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\n📂 Đã lưu ${results.length} mục vào wikipedia.json`);
}

// Chạy script
importWikipedia().catch(err => {
  console.error("❌ Lỗi toàn cục:", err.message);
});