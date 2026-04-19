const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getNearbyAlerts, getServiceCenters } = require('../controllers/geo.controller');

router.get('/nearby',  protect, getNearbyAlerts);
router.get('/centers', protect, getServiceCenters);

module.exports = router;