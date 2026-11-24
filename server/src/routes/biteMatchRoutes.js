const express = require('express');
const router = express.Router();
const biteMatchController = require('../controllers/biteMatchController');

// Optional auth middleware for friends/guests who join via match link
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

router.post('/create', optionalAuth, biteMatchController.createSession);
router.get('/:sessionCode', optionalAuth, biteMatchController.getSession);
router.post('/:sessionCode/join', optionalAuth, biteMatchController.joinSession);
router.post('/:sessionCode/swipe', optionalAuth, biteMatchController.recordSwipe);

module.exports = router;
