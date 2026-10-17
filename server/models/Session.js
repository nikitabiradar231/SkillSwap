const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  skillRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillRequest',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  learner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skill: {
    type: String,
    required: true,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    default: 60,
  },
  meetLink: {
    type: String,
    default: '',
  },
  totalDays: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
