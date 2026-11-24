const express = require('express');
const router = express.Router();
const mysteryController = require('../controllers/mysteryBoxController');

router.get('/tiers', mysteryController.getMysteryTiers);
router.post('/generate', mysteryController.generateMysteryBox);

module.exports = router;
