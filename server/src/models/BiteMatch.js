const mongoose = require('mongoose');

const biteMatchSchema = new mongoose.Schema({
  sessionCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['duo', 'solo'],
    default: 'duo'
  },
  creator: {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  partner: {
    name: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: null }
  },
  dietPreference: {
    type: String,
    enum: ['all', 'pure_veg', 'non_veg', 'vegan'],
    default: 'all'
  },
  dishes: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: '' },
    image: { type: String, default: '' },
    isVeg: { type: Boolean, default: false },
    description: { type: String, default: '' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    restaurantName: { type: String, default: '' }
  }],
  swipes: [{
    participantName: { type: String, required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    liked: { type: Boolean, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  matches: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: '' },
    image: { type: String, default: '' },
    isVeg: { type: Boolean, default: false },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    restaurantName: { type: String, default: '' },
    matchedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically deletes after 24 hours
  }
});

module.exports = mongoose.model('BiteMatch', biteMatchSchema);
