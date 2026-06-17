const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({


customerName: String,

phone: String,

address: String,

items: [
    {
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food"
        },

        name: String,

        price: Number,

        quantity: Number,

        note: String
    }
],

totalPrice: Number,

status: {
    type: String,

    enum: [
        "pending",
        "confirmed",
        "preparing",
        "delivering",
        "completed",
        "cancelled"
    ],

    default: "pending"
},

paymentCode: {
    type: String,
    default: ""
},

placedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},

confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
}


}, {
timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);