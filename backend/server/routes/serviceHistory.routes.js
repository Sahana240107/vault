const express = require('express');
const router = express.Router({ mergeParams: true });
const protect = require('../middleware/auth.middleware');
const { addServiceEntry, getServiceEntries, deleteServiceEntry } = require('../controllers/serviceHistory.controller');

router.post('/', protect, addServiceEntry);
router.get('/', protect, getServiceEntries);
router.delete('/:entryId', protect, deleteServiceEntry);

module.exports = router;