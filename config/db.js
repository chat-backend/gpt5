// db.js (ESM version)
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;