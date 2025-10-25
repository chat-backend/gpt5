const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Country = require("../models/Country");   // sửa đường dẫn
const connectDB = require("../config/db");             // sửa đường dẫn

async function importCountries() {
  try {
    await connectDB();

    // Đọc file countries.json
    const filePath = path.join(__dirname, "../countries.json");
    if (!fs.existsSync(filePath)) {
      console.error("❌ Không tìm thấy file countries.json");
      process.exit(1);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const countries = JSON.parse(raw);

    let inserted = 0;
    let updated = 0;

    for (const c of countries) {
      const name = c.name || c.name_en || "Unknown";

      const doc = {
        code: c.code?.toUpperCase() || "",
        name,
        name_en: c.name_en || name,
        name_vi: c.name_vi || "",
        official_name: c.official_name || ""
      };

      if (!doc.code || !doc.name) {
        console.warn("⚠️ Bỏ qua country vì thiếu code hoặc name:", c);
        continue;
      }

      // Dùng updateOne để check upsertedCount
      const result = await Country.updateOne(
        { code: doc.code },
        { $set: doc },
        { upsert: true, runValidators: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
        console.log(`➕ Inserted: ${doc.code} - ${doc.name}`);
      } else if (result.modifiedCount > 0) {
        updated++;
        console.log(`✏️ Updated: ${doc.code} - ${doc.name}`);
      }
    }

    console.log(`✅ Import hoàn tất: ${inserted} mới, ${updated} cập nhật`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi import:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importCountries();