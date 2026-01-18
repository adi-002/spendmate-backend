const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Gmail integration fields
  gmailRefreshToken: { type: String }, // OAuth refresh token
  gmailAccessToken: { type: String }, // Current access token (temporary)
  gmailTokenExpiry: { type: Date }, // Token expiration timestamp
  emailSyncEnabled: { type: Boolean, default: false }, // Enable/disable email sync
  lastEmailSync: { type: Date }, // Timestamp of last successful sync
  // Sync preferences
  autoSyncEnabled: { type: Boolean, default: true }, // Enable automatic scheduled syncing
  emailSyncFrequency: { type: String, default: '6h' }, // Sync frequency: 1h, 6h, 12h, 24h
  syncWindowHours: { type: Number, default: 24 }, // How far back to look for emails
  lastSyncStatus: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  syncErrorCount: { type: Number, default: 0 }, // Track consecutive failures
});

module.exports = mongoose.model('User', userSchema);
