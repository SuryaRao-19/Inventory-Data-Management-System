const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Create new product
// @route   POST /api/products
// @access  Public
exports.createProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    supplier,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    order,
    page = 1,
    limit = 10
  } = req.query;

  // Build query filter
  const query = {};

  if (category) {
    query.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }

  if (supplier) {
    query.supplier = { $regex: new RegExp(supplier, 'i') };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  // Pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  // Sort direction
  const activeSortOrder = (order || sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: activeSortOrder };

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const totalPages = Math.ceil(total / limitNum) || 1;

  res.status(200).json({
    total,
    page: pageNum,
    totalPages,
    count: products.length,
    products
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError(`Product not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json(product);
});

// @desc    Update product details
// @route   PUT /api/products/:id
// @access  Public
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true
  });

  if (!product) {
    return next(new AppError(`Product not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json(product);
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(new AppError(`Product not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    message: 'Product deleted',
    id: req.params.id
  });
});

// @desc    Stock adjustment (Safe restock and sale operations)
// @route   PATCH /api/products/:id/stock
// @access  Public
exports.adjustStock = asyncHandler(async (req, res, next) => {
  const { change } = req.body;

  if (change === undefined || typeof change !== 'number' || !Number.isInteger(change)) {
    return next(new AppError('Please provide a valid integer for stock change', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError(`Product not found with id of ${req.params.id}`, 404));
  }

  const newQuantity = product.quantity + change;

  if (newQuantity < 0) {
    return next(
      new AppError(
        `Insufficient stock. Current quantity is ${product.quantity}, cannot reduce by ${Math.abs(change)}`,
        400
      )
    );
  }

  product.quantity = newQuantity;
  await product.save();

  res.status(200).json({
    message: 'Stock updated',
    product
  });
});

// @desc    Low-Stock Alert Report (products with quantity <= reorderLevel)
// @route   GET /api/products/low-stock
// @access  Public
exports.getLowStockReport = asyncHandler(async (req, res, next) => {
  const lowStockItems = await Product.find({
    $expr: { $lte: ['$quantity', '$reorderLevel'] }
  }).sort({ quantity: 1 });

  res.status(200).json({
    count: lowStockItems.length,
    lowStockItems
  });
});

// @desc    Category-wise Inventory Summary (MongoDB Aggregation Pipeline)
// @route   GET /api/products/summary
// @access  Public
exports.getCategorySummary = asyncHandler(async (req, res, next) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' }
      }
    },
    {
      $project: {
        _id: 1,
        totalItems: 1,
        totalQuantity: 1,
        totalStockValue: 1,
        avgPrice: { $round: ['$avgPrice', 2] }
      }
    },
    {
      $sort: { totalStockValue: -1 }
    }
  ]);

  res.status(200).json({
    categories: summary.length,
    summary
  });
});
