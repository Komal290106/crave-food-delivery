const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const MenuItem = require('../models/MenuItem');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

// GET /api/menu/:restaurantId - Public menu retrieval for guest squad members and diners
router.get('/:restaurantId', async (req, res, next) => {
  try {
    const items = await MenuItem.find({ restaurantId: req.params.restaurantId, isAvailable: true });
    res.status(200).json({ success: true, data: items, menuItems: items });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.updateMenuItem);
router.patch('/:id/availability', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.toggleItemAvailability);
router.delete('/:id', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.deleteMenuItem);

module.exports = router;
