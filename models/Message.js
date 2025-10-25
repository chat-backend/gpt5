//  models/Message.js (ESM version)
// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Conversation', 
      required: true 
    },
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ userId: 1 });

export default mongoose.model('Message', messageSchema);