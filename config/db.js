// db.js (ESM)
import mongoose from 'mongoose';

// Lấy user/pass từ biến môi trường
const user = process.env.MONGO_USER;
const pass = encodeURIComponent(process.env.MONGO_PASS);

if (!user || !pass) {
  console.error("❌ Thiếu MONGO_USER hoặc MONGO_PASS trong biến môi trường");
  process.exit(1);
}

// Connection string Atlas
const mongoUri = `mongodb+srv://${user}:${pass}@cluster0.qbg9jtn.mongodb.net/chatgpt?retryWrites=true&w=majority&authSource=admin`;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // timeout sau 5s nếu không kết nối được
      maxPoolSize: 10,                // giới hạn số kết nối đồng thời
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  }
};

// Lắng nghe sự kiện kết nối
mongoose.connection.on("connected", () => {
  console.log("🔌 Mongoose đã kết nối tới MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("⚠️ Lỗi kết nối Mongoose:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ Mongoose bị ngắt kết nối");
});

// Đóng kết nối khi app tắt
const gracefulExit = async (signal) => {
  await mongoose.connection.close();
  console.log(`👋 Đã đóng kết nối MongoDB do nhận ${signal}`);
  process.exit(0);
};

process.on("SIGINT", () => gracefulExit("SIGINT"));
process.on("SIGTERM", () => gracefulExit("SIGTERM"));

export default connectDB;