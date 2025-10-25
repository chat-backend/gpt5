// config/db.js (ESM version)
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatgpt');

    const { host, name } = mongoose.connection;
    console.log(`✅ Kết nối MongoDB thành công: host=${host}, database=${name}`);
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  }
};

export default connectDB;