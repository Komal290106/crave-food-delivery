const express = require('express');
const router = express.Router();
const squadController = require('../controllers/squadCartController');
const authenticate = require('../middleware/auth');

// Optional auth middleware for guest friends who join via share link
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crave_super_secure_jwt_secret_token_evaluation_2026');
    req.user = { _id: decoded.userId, role: decoded.role };
  } catch (e) {}
  next();
};

router.post('/create', authenticate, squadController.createSquadCart);
router.get('/:shareCode', optionalAuth, squadController.getSquadCart);
router.post('/:shareCode/join', optionalAuth, squadController.joinSquadCart);
router.post('/:shareCode/item', optionalAuth, squadController.addItemToSquad);
router.delete('/:shareCode/item/:itemId', optionalAuth, squadController.removeItemFromSquad);
router.patch('/:shareCode/status', optionalAuth, squadController.updateSquadStatus);

module.exports = router;
