const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { createVault, getMyVaults, inviteMember } = require('../controllers/vault.controller');

router.post('/', protect, createVault);
router.get('/my', protect, getMyVaults);
router.post('/:id/invite', protect, inviteMember);

module.exports = router;