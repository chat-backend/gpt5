// test-db.js
import mongoose from "mongoose";

const user = process.env.MONGO_USER || "chatuser";
const pass = encodeURIComponent(process.env.MONGO_PASS || "kimcangtrinhulai");

const mongoUri = `mongodb+srv://${user}:${pass}@cluster0.qbg9jtn.mongodb.net/chatgpt?retryWrites=true&w=majority&authSource=admin`;

const options = {
  serverSelectionTimeoutMS: 5000,
};

const testConnection = async () => {
  try {
    await mongoose.connect(mongoUri, options);
    console.log("✅ Kết nối MongoDB thành công!");
    console.log(`📂 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔎 Connection state: ${mongoose.connection.readyState}`);
  } catch (err) {
    console.error(`❌ [${err.name}] (${err.code || "no-code"}) Lỗi kết nối MongoDB: ${err.message}`);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    console.log("🔌 Đã đóng kết nối test");
    process.exit(0);
  }
};

testConnection();