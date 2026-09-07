const express = require('express');
const Joi = require('joi');
const router = express.Router();
const authmiddleware = require("../middleware/auth");
// const { validate } = require('../models/order');
const Address = require('../models/adress');

const createAddressSchema = Joi.object({
  name: Joi.string().required().min(3),
  phone: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
  village: Joi.string().required().min(5).max(100),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  isDefault: Joi.boolean().default(false),
})

router.get("/", authmiddleware, async (req, res) => {
  try {
    const addresses = await Address.find({user: req.user._id});

    if(addresses.length === 0) {
      return res.status(404).json({message: "Address not found"})
    }
    return res.status(200).json({success: true, addresses});
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch addresses",
    });
  }

})

router.post("/",authmiddleware, async (req, res) => {
  try {
    const { name, phone, village, city, state, pincode, isDefault } = req.body
    const validation = createAddressSchema.validate(req.body);
    if(validation.error) {
      return res.status(400).json({ 
        success: false,
        message: validation.error.details[0].message})
    }
    
    const address = new Address({
      user: req.user._id,
      name,
      phone,
      village,
      city,
      state,
      pincode,
      isDefault,
    })
    await address.save();
    res.status(201).json({
      success: true,
      message: "Address saved successfully",
      address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to save address",
    });
  }

})
module.exports = router