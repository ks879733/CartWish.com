const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, require: true, minlength: 3 },
  email: { type: String, require: true, unique: true, lowercase: true },
  password: { type: String, require: true },
  deleveryAdress: { type: String, require: true, minlength: 5 },
  role: { type: String, enum: ["user", "admin", "seller"], default: "user" },
  refreshToken: { type: String },
   
})

const User = mongoose.model("User", userSchema);
module.exports = User