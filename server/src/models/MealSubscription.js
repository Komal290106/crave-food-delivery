const mongoose = require('mongoose');

const mealSubscriptionItemSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  deliveryTime: {
    type: String,
    default: '13:30' // 24-hr format (e.g. 13:30 for 1:30 PM)
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  restaurantName: { type: String, default: '' },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  isVeg: { type: Boolean, default: true },
  category: { type: String, default: 'Lunch' }
}, { _id: true });

const mealSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planName: {
    type: String,
    default: 'Artisan Weekly Desk Routine'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active'
  },
  deskLocation: {
    addressLine: { type: String, required: true },
    city: { type: String, default: 'New Delhi' },
    pincode: { type: String, default: '110001' },
    deskOrRoom: { type: String, default: 'Desk 4B / Cabin 12' }
  },
  weeklySchedule: [mealSubscriptionItemSchema],
  weeklyTotal: {
    type: Number,
    default: 0
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MealSubscription', mealSubscriptionSchema);
