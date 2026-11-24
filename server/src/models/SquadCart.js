const mongoose = require('mongoose');

const squadCartItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  isVeg: { type: Boolean, default: true },
  addedBy: {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userPhone: { type: String, default: '' },
    socketId: { type: String, default: '' }
  },
  selectedAddOns: [{
    name: String,
    price: Number
  }],
  itemTotal: { type: Number, required: true }
}, { _id: true });

const squadCartMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isHost: { type: Boolean, default: false },
  isReady: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
}, { _id: true });

const squadCartSchema = new mongoose.Schema({
  shareCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'locked', 'ordered', 'expired'],
    default: 'active'
  },
  members: [squadCartMemberSchema],
  items: [squadCartItemSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SquadCart', squadCartSchema);
