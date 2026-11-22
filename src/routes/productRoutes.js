const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockReport,
  getCategorySummary
} = require('../controllers/productController');

// Specialized report routes (must come BEFORE /:id to prevent route shadowing)
router.get('/low-stock', getLowStockReport);
router.get('/summary', getCategorySummary);

// Base resource routes
router.route('/')
  .post(createProduct)
  .get(getProducts);

// Single resource and subresource routes
router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/stock', adjustStock);

module.exports = router;
