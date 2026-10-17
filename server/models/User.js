const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: '',
  },
  skills: [
    {
      name: { type: String, required: true },
      price: { type: Number, default: 0 }
    }
  ],
  skillsToLearn: {
    type: [String],
    default: [],
  },
  profilePic: {
    type: String,
    default: '',
  },
  walletAddress: {
    type: String,
    default: '',
  },
  upiId: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
