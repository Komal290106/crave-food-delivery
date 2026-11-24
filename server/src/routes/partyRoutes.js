const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyPlannerController');

router.post('/calculate', partyController.calculatePartyFeast);

module.exports = router;
