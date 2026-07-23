const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');
const Product = require('../models/Product');
const { logActivity } = require('../services/activityLogger');
const { sendNotification } = require('../services/notificationService');

// @desc Get current stock status for all products
// @route GET /api/inventory
const getInventory = async (req, res, next) => {
  try {
    const stocks = await Stock.find().populate('product');
    res.json({ success: true, count: stocks.length, stocks });
  } catch (error) {
    next(error);
  }
};

// @desc Get stock transactions history
// @route GET /api/inventory/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { productId, type } = req.query;
    let query = {};

    if (productId) query.product = productId;
    if (type) query.type = type;

    const transactions = await StockTransaction.find(query)
      .populate('product', 'name sku category')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    next(error);
  }
};

// @desc Add stock entry (Stock In / Purchase Entry / Stock Out / Damaged / Adjustment)
// @route POST /api/inventory/adjust
const adjustStock = async (req, res, next) => {
  try {
    const { productId, type, quantity, referenceId, notes, lowStockThreshold } = req.body;
    const qty = Number(quantity);

    let stock = await Stock.findOne({ product: productId });
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!stock) {
      stock = await Stock.create({ product: productId, quantity: 0 });
    }

    if (lowStockThreshold !== undefined) {
      stock.lowStockThreshold = Number(lowStockThreshold);
    }

    // Determine quantity modification
    if (['Opening Stock', 'Purchase Entry', 'Stock In'].includes(type)) {
      stock.quantity += qty;
    } else if (['Stock Out', 'Damaged Stock'].includes(type)) {
      if (stock.quantity < qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock quantity! Current: ${stock.quantity}` });
      }
      stock.quantity -= qty;
    } else if (type === 'Stock Adjustment') {
      stock.quantity = qty; // Set direct amount
    }

    await stock.save();

    // Log transaction
    const transaction = await StockTransaction.create({
      product: productId,
      type,
      quantity: qty,
      referenceId: referenceId || '',
      notes: notes || '',
      createdBy: req.user._id,
    });

    await logActivity({
      user: req.user._id,
      module: 'Inventory Management',
      action: `Stock Entry (${type})`,
      description: `${type} of ${qty} units for ${product.name}. New total: ${stock.quantity}`,
    });

    // Check low stock alert
    if (stock.quantity <= stock.lowStockThreshold) {
      await sendNotification({
        roleTarget: 'admin',
        title: 'Low Stock Alert!',
        message: `Stock for ${product.name} (${product.sku}) has fallen to ${stock.quantity} units (Threshold: ${stock.lowStockThreshold})`,
        type: 'low_stock',
        link: '/inventory',
      });
    }

    res.json({ success: true, stock, transaction });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInventory, getTransactions, adjustStock };
