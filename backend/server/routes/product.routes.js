const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { createProduct, getProducts, getProduct, updateProduct, deleteProduct } = require('../controllers/product.controller');

router.post('/', protect, createProduct);
router.get('/', protect, getProducts);
router.get('/:id', protect, getProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;