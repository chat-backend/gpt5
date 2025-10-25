const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true,
      minlength: 2,
      maxlength: 3 // ISO Alpha-2 hoặc Alpha-3
    },

    name_vi: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },
    official_name: { type: String, trim: true },
    capital: { type: String, trim: true, index: true },

    continent: { 
      type: String, 
      trim: true,
      enum: ["Asia", "Europe", "Africa", "North America", "South America", "Oceania", "Antarctica"],
      index: true
    },

    population: { 
      type: Number, 
      default: 0, 
      min: 0,
      validate: {
        validator: v => v < 2_000_000_000, // giới hạn hợp lý
        message: "Population quá lớn, không hợp lệ"
      }
    },

    area: { 
      type: Number, 
      default: 0, 
      min: 0,
      validate: {
        validator: v => v < 20_000_000, // diện tích lớn nhất ~17 triệu km² (Nga)
        message: "Area quá lớn, không hợp lệ"
      }
    },

    languages: [{ type: String, trim: true, lowercase: true }],
    religions: [{ type: String, trim: true, lowercase: true }]
  },
  { timestamps: true }
);

// ⚡ Index
countrySchema.index({ name_en: 1 });
countrySchema.index({ name_vi: 1 });

// Full-text search (đa ngôn ngữ) với trọng số
countrySchema.index(
  { name_en: "text", name_vi: "text", official_name: "text" },
  { weights: { name_en: 3, name_vi: 2, official_name: 1 } }
);

module.exports =
  mongoose.models.Country || mongoose.model("Country", countrySchema);