const Product = require('../models/Product');
const Stock = require('../models/Stock');
const { logActivity } = require('../services/activityLogger');

// @desc Get all products
// @route GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { category, search, status } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    // Join with stock info
    const productsWithStock = await Promise.all(
      products.map(async (prod) => {
        const stock = await Stock.findOne({ product: prod._id });
        return {
          ...prod.toObject(),
          stockQuantity: stock ? stock.quantity : 0,
          lowStockThreshold: stock ? stock.lowStockThreshold : 20,
        };
      })
    );

    res.json({ success: true, count: productsWithStock.length, products: productsWithStock });
  } catch (error) {
    next(error);
  }
};

// @desc Create Product & initial stock record
// @route POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { sku, name, category, costPrice, sellingPrice, gstPercentage, description, initialStock, lowStockThreshold } = req.body;

    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    let image = '';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.create({
      sku: sku.toUpperCase(),
      name,
      category,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      gstPercentage: Number(gstPercentage) || 18,
      description: description || '',
      image,
    });

    // Create Stock record
    await Stock.create({
      product: product._id,
      quantity: Number(initialStock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 20,
    });

    await logActivity({
      user: req.user._id,
      module: 'Product Management',
      action: 'Create Product',
      description: `Created product ${name} (${sku}) with initial stock ${initialStock || 0}`,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc Update product
// @route PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();

    await logActivity({
      user: req.user._id,
      module: 'Product Management',
      action: 'Update Product',
      description: `Updated product details for ${product.name}`,
    });

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc Delete product
// @route DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    await Stock.deleteOne({ product: req.params.id });

    await logActivity({
      user: req.user._id,
      module: 'Product Management',
      action: 'Delete Product',
      description: `Deleted product ${product.name}`,
    });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
