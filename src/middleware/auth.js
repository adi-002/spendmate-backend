const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.log('🔒 Auth Middleware: Missing or malformed Authorization header');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('🔒 Auth Middleware: User not found for token ID:', decoded.id);
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.log('🔒 Auth Middleware: Token verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
