const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
