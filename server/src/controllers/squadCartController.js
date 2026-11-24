const SquadCart = require('../models/SquadCart');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const crypto = require('crypto');

// Generate unique short share code (e.g., SQUAD-7482)
const generateShareCode = () => {
  return 'SQUAD-' + crypto.randomInt(1000, 9999);
};

// POST /api/squad/create - Host creates a new Squad Cart
exports.createSquadCart = async (req, res, next) => {
  try {
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    let shareCode;
    let isUnique = false;
    while (!isUnique) {
      shareCode = generateShareCode();
      const existing = await SquadCart.findOne({ shareCode });
      if (!existing) isUnique = true;
    }

    const squadCart = new SquadCart({
      shareCode,
      restaurantId,
      hostId: req.user._id,
      hostName: req.user.name,
      members: [{
        name: req.user.name,
        userId: req.user._id,
        isHost: true,
        isReady: false
      }],
      items: []
    });

    await squadCart.save();

    res.status(201).json({
      success: true,
      message: 'Squad Cart created successfully',
      squadCart: await SquadCart.findById(squadCart._id).populate('restaurantId', 'name images location address')
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/squad/:shareCode - Fetch squad cart details
exports.getSquadCart = async (req, res, next) => {
  try {
    const { shareCode } = req.params;
    const squadCart = await SquadCart.findOne({ shareCode: shareCode.toUpperCase() })
      .populate('restaurantId', 'name images location address cuisineTypes rating');

    if (!squadCart) {
      return res.status(404).json({ success: false, message: 'Squad Cart not found or expired' });
    }

    res.status(200).json({
      success: true,
      squadCart
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/squad/:shareCode/join - Friend joins squad cart
exports.joinSquadCart = async (req, res, next) => {
  try {
    const { shareCode } = req.params;
    const { memberName } = req.body;

    if (!memberName || !memberName.trim()) {
      return res.status(400).json({ success: false, message: 'Member name is required' });
    }

    const squadCart = await SquadCart.findOne({ shareCode: shareCode.toUpperCase() });
    if (!squadCart) {
      return res.status(404).json({ success: false, message: 'Squad Cart not found' });
    }

    if (squadCart.status === 'locked' || squadCart.status === 'ordered') {
      return res.status(400).json({ success: false, message: 'This squad cart is locked or already ordered' });
    }

    // Check if member already exists
    const existing = squadCart.members.find(m => m.name.toLowerCase() === memberName.trim().toLowerCase());
    if (!existing) {
      squadCart.members.push({
        name: memberName.trim(),
        userId: req.user?._id || null,
        isHost: false,
        isReady: false
      });
      await squadCart.save();
    }

    const populated = await SquadCart.findById(squadCart._id).populate('restaurantId', 'name images location address cuisineTypes');

    res.status(200).json({
      success: true,
      message: `Welcome to ${squadCart.hostName}'s Squad!`,
      squadCart: populated
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/squad/:shareCode/item - Add or update item in squad cart
exports.addItemToSquad = async (req, res, next) => {
  try {
    const { shareCode } = req.params;
    const { menuItemId, quantity = 1, selectedAddOns = [], memberName } = req.body;

    if (!menuItemId || !memberName) {
      return res.status(400).json({ success: false, message: 'MenuItem ID and Member Name are required' });
    }

    const squadCart = await SquadCart.findOne({ shareCode: shareCode.toUpperCase() });
    if (!squadCart) {
      return res.status(404).json({ success: false, message: 'Squad Cart not found' });
    }

    const itemDoc = await MenuItem.findById(menuItemId);
    if (!itemDoc) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const addOnsTotal = (selectedAddOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
    const unitPrice = itemDoc.price + addOnsTotal;

    // Check if same item added by same member exists
    const existingIndex = squadCart.items.findIndex(i => 
      i.menuItemId.toString() === menuItemId.toString() && 
      i.addedBy.name.toLowerCase() === memberName.toLowerCase()
    );

    if (existingIndex > -1) {
      squadCart.items[existingIndex].quantity += quantity;
      squadCart.items[existingIndex].itemTotal = squadCart.items[existingIndex].quantity * unitPrice;
    } else {
      squadCart.items.push({
        menuItemId: itemDoc._id,
        name: itemDoc.name,
        price: itemDoc.price,
        quantity,
        isVeg: itemDoc.isVeg,
        addedBy: {
          name: memberName,
          userId: req.user?._id || null
        },
        selectedAddOns: selectedAddOns || [],
        itemTotal: quantity * unitPrice
      });
    }

    await squadCart.save();

    const populated = await SquadCart.findById(squadCart._id).populate('restaurantId', 'name images location address');

    res.status(200).json({
      success: true,
      squadCart: populated
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/squad/:shareCode/item/:itemId - Remove item from squad cart
exports.removeItemFromSquad = async (req, res, next) => {
  try {
    const { shareCode, itemId } = req.params;
    const squadCart = await SquadCart.findOne({ shareCode: shareCode.toUpperCase() });

    if (!squadCart) {
      return res.status(404).json({ success: false, message: 'Squad Cart not found' });
    }

    squadCart.items = squadCart.items.filter(i => i._id.toString() !== itemId.toString());
    await squadCart.save();

    const populated = await SquadCart.findById(squadCart._id).populate('restaurantId', 'name images location address');

    res.status(200).json({
      success: true,
      squadCart: populated
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/squad/:shareCode/status - Host locks or checkout squad cart
exports.updateSquadStatus = async (req, res, next) => {
  try {
    const { shareCode } = req.params;
    const { status } = req.body;

    const squadCart = await SquadCart.findOne({ shareCode: shareCode.toUpperCase() });
    if (!squadCart) {
      return res.status(404).json({ success: false, message: 'Squad Cart not found' });
    }

    // Only host can lock or change status
    if (req.user && squadCart.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the Squad Host can change cart status' });
    }

    squadCart.status = status || squadCart.status;
    await squadCart.save();

    res.status(200).json({
      success: true,
      squadCart
    });
  } catch (error) {
    next(error);
  }
};
