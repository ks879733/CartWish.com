const checkRole = (role) => (req, res, next) => {
  if(!req.user || req.user.role !== role ) {
    return res.status(403).json({message: `Acces denied only ${role} can access`})
  }
  next();
}

module.exports = checkRole