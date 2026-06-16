const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  description: {
    type: String
  },

  image: {
    type: String,
    default: "https://via.placeholder.com/300x200"
  },

  category: {
    type: String,
    enum: ["food", "drink"],
    default: "food"
  },

  status: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Food", foodSchema);