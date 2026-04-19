const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/auth.middleware');
const upload   = require('../middleware/upload.middleware');
const { uploadBill, uploadAvatar } = require('../controllers/upload.controller');

// POST /api/upload/bill   — upload bill image or PDF → Cloudinary + OCR
router.post('/bill', protect, upload.single('bill'), uploadBill);

// POST /api/upload/avatar — upload profile picture → Cloudinary
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
