const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String },
  date: { type: Date, default: Date.now },
  description: { type: String },
  source: { type: String, default: 'manual' }, // later: 'email', 'bank', etc
  metadata: { type: Object }, // raw parser info, vendor, txId etc
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
