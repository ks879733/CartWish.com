const express = require('express');
const authMidlleware = require('../middleware/auth');
const checkRole = require('../middleware/checkRole')
const Razorpay = require("razorpay")
const crypto = require('crypto')
const router = express.Router();
const Orders = require('../models/order');
const Cart = require('../models/cart');
const Address = require('../models/adress');


router.get("/", authMidlleware, async (req, res) => {
  try {
    const orders = await Orders.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Unable to load orders" });
  }
});

router.post("/checkout", authMidlleware ,async (req, res) => {
  const {addressId} = req.body;
  if(!addressId) {
    return res.status(400).json({message: "Please provide shipping Address"})
  }
  const cart = await Cart.findOne({user: req.user._id})

  if(!cart || cart.products.length === 0) {
    return res.status(404).json({message: "product not found"})
  }

  const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECTRET
  })

  const order = await razorpayInstance.orders.create({
    amount: cart.totalCartPrice * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  })

  res.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency
  })

})

router.post("/paymentverify", authMidlleware, async(req, res) => {
  const {razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId} = req.body
  if(!addressId) {
    return res.status(400).json({message: "Please provide shipping Address"})
  }
  const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECTRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

  if(generatedSignature !== razorpay_signature) {
    return res.status(400).json({success: false, message: "Invalid signature"})
  }
  const address = await Address.findOne({_id: addressId, user: req.user._id});

  if(!address) {
    return res.status(404).json({
        success: false,
        message: "Address not found"
      });
  }

  const cart = await Cart.findOne({user: req.user._id})
  if (!cart || cart.products.length === 0) {
  return res.status(404).json({
    success: false,
    message: "Cart is empty"
  });
}
  const newOrder = new Orders({
    user: req.user._id,
    products: cart.products,
    totalProducts: cart.totalProducts,
    totalPrice: cart.totalCartPrice,
    shippingAddress: `${address.name}, ${address.phone},${address.village}, ${address.city}, ${address.state} - ${address.pincode}`,
    paymentStatus: "paid",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id
  })

  await newOrder.save()
  await cart.deleteOne()

  return res.json({
    success: true,
    message: "Payment verified successfuly"
  })
});

router.patch("/order-status/:orderId", authMidlleware, checkRole("admin"), async (req, res) =>{
  const status = req.body.status;

  const allowedStatus = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled"
  ]
  if(!allowedStatus.includes(status)){
    return res.status(400).json({
    message: "Invalid order status"
  });
  }

  const updatedOrder = await Orders.findByIdAndUpdate(req.params.orderId, {orderStatus: status}, {new: true});

  if(!updatedOrder) {
    return res.status(404).json({message: "Order not found"})
  }
  res.json({message: "Order status updated Successfully", updatedOrder: updatedOrder});
});

router.get("/admin/all-orders", authMidlleware, checkRole("admin"), async (req, res) => {
  try {
    const orders = await Orders.find({}).populate("user", "name email")
    .sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({message: "Unalbe to load orders"})
  }
})


module.exports = router