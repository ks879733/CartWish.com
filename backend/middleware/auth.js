const jwt = require('jsonwebtoken')
const authMidlleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if(!authHeader || !authHeader.startsWith("Bearer ")){
    return res.status(401).json({message: "Authorization token required"})
  }
  const token = authHeader.split(" ")[1]

  try {
    const decodedUser = jwt.verify(token, process.env.ACCESS_TOKEN_KEY)
    req.user = decodedUser
    next()
    
  } catch (err) {
    return res.status(400).json({message: "Fir se whi problem Invalid token 🥺"})
  }
}
module.exports = authMidlleware