const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  isAvailable: { type: Boolean, default: true }
}, { _id: true });

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  isVeg: {
    type: Boolean,
    default: false,
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  calories: {
    type: Number,
    default: 0
  },
  // SafeBite Allergen & Dietary Metadata
  dietaryTags: {
    type: [String],
    enum: ['pure_veg', 'jain', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'diabetic_friendly', 'keto', 'halal', 'eggless'],
    default: []
  },
  allergens: {
    type: [String],
    enum: ['peanuts', 'tree_nuts', 'dairy', 'gluten', 'soy', 'eggs', 'shellfish', 'fish', 'onion_garlic', 'mustard', 'sesame'],
    default: []
  },
  addOns: [addOnSchema]
}, {
  timestamps: true
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;
