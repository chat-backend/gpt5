// db.js (ESM version)
import mongoose from 'mongoose';

const user = process.env.MONGO_USER;
const pass = process.env.MONGO_PASS;

// Ghép lại connection string
const mongoUri = `mongodb+srv://${user}:${pass}@cluster0.qbg9jtn.mongodb.net/chatgpt?retryWrites=true&w=majority&appName=Cluster0`;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;