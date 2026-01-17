const Transaction = require('../models/Transaction');

exports.getAll = async (req, res) => {
  const tx = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
  res.json(tx);
};

exports.create = async (req, res) => {
  const { amount, currency = 'INR', type, category, date, description, source, metadata } = req.body;
  const tx = await Transaction.create({
    user: req.user._id,
    amount,
    currency,
    type,
    category,
    date,
    description,
    source,
    metadata,
  });
  res.status(201).json(tx);
};

exports.update = async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx || tx.user.toString() !== req.user._id.toString()) return res.status(404).json({ message: 'Not found' });
  Object.assign(tx, req.body);
  await tx.save();
  res.json(tx);
};

exports.remove = async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx || tx.user.toString() !== req.user._id.toString()) return res.status(404).json({ message: 'Not found' });
  await tx.deleteOne();
  res.json({ message: 'Deleted' });
};
