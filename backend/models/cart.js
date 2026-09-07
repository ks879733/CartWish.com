const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
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
  totalCartPrice: { type: Number, default: 0 }
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart