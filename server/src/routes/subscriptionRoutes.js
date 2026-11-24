const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authenticate = require('../middleware/auth');

router.get('/my', authenticate, subscriptionController.getMySubscription);
router.post('/', authenticate, subscriptionController.saveSubscription);
router.patch('/toggle-status', authenticate, subscriptionController.toggleSubscriptionStatus);

module.exports = router;
