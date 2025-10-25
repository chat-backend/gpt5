// models/Conversation.js (ESM version)
import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },        // ID người dùng
    sessionId: { type: String, required: true },     // mapping với session
    topic: { type: String },                         // nhãn chủ đề hội thoại (tùy chọn)
    isActive: { type: Boolean, default: true },      // hội thoại còn mở?
    endedAt: { type: Date }                          // thời điểm kết thúc (nếu có)
  },
  {
    timestamps: true,   // tự động thêm createdAt, updatedAt
    versionKey: false
  }
);

/* ---------------- Index tối ưu ---------------- */
// Truy vấn nhanh hội thoại theo userId (lấy mới nhất)
conversationSchema.index({ userId: 1, createdAt: -1 });

// Truy vấn nhanh hội thoại theo sessionId (lấy mới nhất)
conversationSchema.index({ sessionId: 1, createdAt: -1 });

// Truy vấn nhanh hội thoại đang mở theo userId
conversationSchema.index({ userId: 1, isActive: 1 });

// Đảm bảo mỗi session chỉ có 1 hội thoại đang mở
conversationSchema.index(
  { sessionId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default mongoose.model('Conversation', conversationSchema);