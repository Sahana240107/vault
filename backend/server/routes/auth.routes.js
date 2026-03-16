const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { register, login, updateMe, refreshToken } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, (req, res) => res.json(req.user));
router.put('/me', protect, updateMe);

module.exports = router;