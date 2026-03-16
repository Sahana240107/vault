const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { register, login } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, (req, res) => {             // add at the bottom
  res.json(req.user);
});
module.exports = router;