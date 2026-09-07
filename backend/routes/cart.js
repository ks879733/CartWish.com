const express = require('express');
const authmiddleware = require("../middleware/auth");
const Product = require('../models/product');
const Cart = require("../models/cart");
// const { exist } = require('joi');
const router = express.Router();

router.get("/", authmiddleware, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).lean();
  res.json(cart || { products: [], totalProducts: 0, totalCartPrice: 0 });
});

router.post("/:productId", authmiddleware, async(req, res) => {
  const { quantity } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

  if(!productId || !quantity || quantity < 1) {
    return res.status(400).json({message: "Missing required properties"})
  };
  const product = await Product.findById(productId);
  if(!product) {
    return res.status(404).json({message: "Product not Found"});
  }

  if(product.stock < quantity) {
    return res.status(400).json({message: "Stock is not enough"})
  }
  let cart = await Cart.findOne({user: userId});
  if(!cart) {
    cart = new Cart({
      user: userId,
      products: [],
      totalProducts: 0,
      totalCartPrice: 0
    })
  }

  const existingProductIndex = cart.products.findIndex((product) => product.productId.toString() === productId.toString());

  if(existingProductIndex!== -1){
    if(cart.products[existingProductIndex].quantity + quantity >= product.stock){
      return res.status(400).json({message: "Stock is not enough"})
    }
    cart.products[existingProductIndex].quantity += quantity;
  }
  else{
    cart.products.push({
      productId: productId,
      quantity: quantity,
      title: product.title,
      price: product.price,
      image: product.images[0],
    });

  }

  
  cart.totalProducts = cart.products.reduce((total, product) => {
    return total + product.quantity
  }, 0);

  cart.totalCartPrice = cart.products.reduce((total, product) => {
    return total + product.price * product.quantity
  }, 0)
  await cart.save()
  res.status(200).json({message: "Product added to cart successfully", cart: cart})
})


router.patch("/increase/:productId", authmiddleware ,async (req, res) => {
  const productId = req.params.productId
  const product = await Product.findById(productId);
  if(!product) {
    return res.status(404).json({message: "Product not found"})
  }

  const cart = await Cart.findOne({user: req.user._id});
  if(!cart) {
    return res.status(404).json({message: "Cart not found"})
  }
  // find the product in the product array
 const index = cart.products.findIndex((product) => product.productId.toString() === productId)
 
 if(index === -1) {
  return res.status(404).json({message: "Product not found"})
 }

 if(cart.products[index].quantity === product.stock) {
  return res.status(400).json({message: "Product run out of stock, cant't increase procut quantity"})
 }
  //increase the produt quantity
 cart.products[index].quantity += 1

 //update total product and totalcartprice

 cart.totalProducts = cart.products.reduce((total, cartProduct) => {
   return total + cartProduct.quantity
 }, 0);
 cart.totalCartPrice = cart.products.reduce((total, cartProduct) => {
   return total + Number(cartProduct.price) * cartProduct.quantity
 }, 0);

 await cart.save();
 res.json({message: "Product quantity increased successfully", cart})
})

//decreasing quantity
router.patch("/decrease/:productId", authmiddleware ,async (req, res) => {
  const productId = req.params.productId
  const product = await Product.findById(productId);
  if(!product) {
    return res.status(404).json({message: "Product not found"})
  }

  const cart = await Cart.findOne({user: req.user._id});
  if(!cart) {
    return res.status(404).json({message: "Cart not found"})
  }
  // find the product in the product array
 const index = cart.products.findIndex((product) => product.productId.toString() === productId)
 
 if(index === -1) {
  return res.status(404).json({message: "Product not found"})
 }
  //check condition for quantity
 if(cart.products[index].quantity > 1) {
   cart.products[index].quantity -= 1
 }else {
  cart.products.splice(index, 1)
 }
  //decrease the produt quantity

 //update total product and totalcartprice

 cart.totalProducts = cart.products.reduce((total, cartProduct) => {
   return total + cartProduct.quantity
 }, 0);
 cart.totalCartPrice = cart.products.reduce((total, cartProduct) => {
   return total + Number(cartProduct.price) * cartProduct.quantity
 }, 0);

 await cart.save();
 res.json({message: "Product quantity decreased successfully", cart})
})

router.delete("/:productId", authmiddleware, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });
  cart.products = cart.products.filter(
    (product) => product.productId.toString() !== req.params.productId,
  );
  cart.totalProducts = cart.products.reduce((total, product) => total + product.quantity, 0);
  cart.totalCartPrice = cart.products.reduce(
    (total, product) => total + Number(product.price) * product.quantity,
    0,
  );
  await cart.save();
  res.json(cart);
});

module.exports = router