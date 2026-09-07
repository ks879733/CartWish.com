const express = require('express')
const router = express.Router();
const User = require('../models/User')
const bcrypt = require('bcrypt');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const authMidlleware = require('../middleware/auth');

const createUserSchema = Joi.object({
  name: Joi.string().required().min(3),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  deleveryAdress: Joi.string().min(5).required()
})

router.post("/",async (req, res) => {
  const { name, email, password, deleveryAdress } = req.body
  const validation = createUserSchema.validate(req.body);
  if(validation.error) {
    return res.status(400).json(validation.error.details[0].message)
  }
  const users = await User.findOne({email})
  if(users) {
    return res.status(400).json({message: "User Already exist."})
  }
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    deleveryAdress
  })
  await newUser.save()
  const { accessToken, refreshToken } = geenerateTokens({_id:newUser._id, name:newUser.name, role: newUser.role});

  const newHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  newUser.refreshToken = newHashedRefreshToken;
  await newUser.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.status(201).json(accessToken)
})

router.post('/login',async (req, res) => {
  const {email, password} = req.body
  const user = await User.findOne({email})

  if(!user) {
    return res.status(401).json({message: "User Not found.."})
  }
  const validPassword = await bcrypt.compare(password, user.password)
  if(!validPassword){
    return res.status(401).json({message: "Invalid credential"})
  }
  const { accessToken, refreshToken } = geenerateTokens({_id:user._id, name:user.name, role:user.role});
  const newHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = newHashedRefreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7d
  })

  res.status(201).json(accessToken)
})

router.get("/",authMidlleware, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password")
  res.json(user);
  
})
router.post('/refresh', async (req, res) => {
 const userRefreshToken = req.cookies.refreshToken
 
 if(!userRefreshToken) return res.status(401).json({message: "No RefreshToken provided"})
  let decodedRefreshuser
  try {
    decodedRefreshuser = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_KEY)
    
  } catch (error) {
    return res.status(403).json({message: "Invalid refresh Token"})
  }
  const user = await User.findById(decodedRefreshuser._id)
  if(!user) return res.status(404).json({message: "User Not found"})

  const isVallid = await bcrypt.compare(userRefreshToken, user.refreshToken);
  
  if(!isVallid) return res.status(403).json({message: "Refresh token is not valid"})
  const { accessToken, refreshToken } = geenerateTokens({_id:user._id, name:user.name, role:user.role});
  const newHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = newHashedRefreshToken;
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.status(201).json(accessToken)
})

router.post('/logout',async (req, res) => {
 const userRefreshToken = req.cookies.refreshToken
 
 if(!userRefreshToken) return res.status(401).json({message: "No RefreshToken provided"})
  let decodedRefreshuser
  try {
    decodedRefreshuser = jwt.verify(userRefreshToken, process.env.REFRESH_TOKEN_KEY)
    
  } catch (error) {
    return res.status(403).json({message: "Invalid refresh Token"})
  }

  const user = await User.findById(decodedRefreshuser._id)
  if(!user) return res.status(404).json({message: "User Not found"})
  
  user.refreshToken = null;
  await user.save();
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({message: "Logout successfully"})
})

const geenerateTokens = (data) => {
  const accessToken = jwt.sign(data,process.env.ACCESS_TOKEN_KEY,{expiresIn: "1d"});
  const refreshToken = jwt.sign({_id:data._id},process.env.REFRESH_TOKEN_KEY,{expiresIn: "7d"});
  return { accessToken, refreshToken }
}

module.exports = router