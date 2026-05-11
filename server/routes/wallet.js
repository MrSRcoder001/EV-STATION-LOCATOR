const express = require('express');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('walletBalance ecoStats');
  const transactions = await WalletTransaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
  res.json({ balance: user?.walletBalance || 0, ecoStats: user?.ecoStats || {}, transactions });
});

router.post('/top-up', auth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Valid amount required' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.walletBalance += amount;
  await user.save();
  const transaction = await WalletTransaction.create({
    userId: user._id,
    type: 'credit',
    amount,
    balanceAfter: user.walletBalance,
    description: req.body.description || 'Wallet top-up'
  });
  res.status(201).json({ balance: user.walletBalance, transaction });
});

module.exports = router;
