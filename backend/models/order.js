const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    products: [
      {
        productId: {type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true},
        quantity: {type: Number, required: true, min: 1, default: 1},
        title: {type: String, required: true},
        price: { type: String, required: true },
        image: { type: String, required: true },
      }
    ],
    totalProducts: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    shippingAddress: { type: String, required: true },
    razorpayOrderId: String,
    paymentId: { type: String, required: true },
    paymentStatus: { type: String, required: true },
    orderStatus: { type: String, enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], default: "Pending" },
    createdAt: { type: Date, default: Date.now() },
    deliveredAt: { type: Date }
});

const Orders = mongoose.model("Order", orderSchema)

module.exports = Orders