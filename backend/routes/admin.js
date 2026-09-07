const express = require('express');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const User = require('../models/User');

const router = express.Router();

router.get('/users', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password -refreshToken').sort('name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users' });
  }
});

router.get('/sellers', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('-password -refreshToken').sort('name');
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load sellers' });
  }
});

router.patch('/sellers/:id/role', authMiddleware, checkRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['user', 'seller'].includes(role)) {
    return res.status(400).json({ message: 'Role must be user or seller' });
  }

  try {
    const seller = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['user', 'seller'] } },
      { role },
      { new: true, runValidators: true },
    ).select('-password -refreshToken');

    if (!seller) return res.status(404).json({ message: 'User not found' });
    res.json(seller);
  } catch (error) {
    res.status(400).json({ message: 'Invalid user id' });
  }
});

module.exports = router;
