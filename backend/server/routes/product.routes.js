const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  createProduct, getProducts, getProduct,
  updateProduct, deleteProduct, getBrands,
} = require('../controllers/product.controller');

router.get('/brands', protect, getBrands);   // ← MUST be before /:id
router.post('/',      protect, createProduct);
router.get('/',       protect, getProducts);
router.get('/:id',    protect, getProduct);
router.put('/:id',    protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;