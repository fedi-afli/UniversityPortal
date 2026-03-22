const mongoose = require('mongoose');

// baseOptions tells Mongoose to use 'role' to differentiate the sub-models
const baseOptions = { 
  discriminatorKey: 'role', 
  collection: 'users', 
  timestamps: true 
};

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  profilePicture: { type: String, default: '/uploads/default-avatars/default.png' },
  
  // Auth & Security
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  verificationToken: String,
  passwordChangeToken: String,
  passwordChangeExpires: Date,
}, baseOptions);

module.exports = mongoose.model('User', userSchema);