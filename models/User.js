const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: ["admin", "staff", "customer"],
      default: "customer"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);