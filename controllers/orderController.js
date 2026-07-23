const Order = require('../models/Order');
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');
const Invoice = require('../models/Invoice');
const Setting = require('../models/Setting');
const Client = require('../models/Client');
const Product = require('../models/Product');
const path = require('path');
const { logActivity } = require('../services/activityLogger');
const { sendNotification } = require('../services/notificationService');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const { calculateExecutiveIncentive } = require('../services/incentiveCalculator');

// Helper to generate sequential order number
const generateOrderNumber = async () => {
  const count = await Order.countDocuments();
  const dateStr = new Date().getFullYear();
  return `ORD-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
};

// @desc Get orders
// @route GET /api/orders
const getOrders = async (req, res, next) => {
  try {
    const { status, client, executive, search, page = 1, limit = 20 } = req.query;
    let query = {};

    if (req.user.role === 'executive') {
      query.executive = req.user._id;
    } else if (executive) {
      query.executive = executive;
    }

    if (status) query.status = status;
    if (client) query.client = client;

    if (search) {
      query.$or = [{ orderNumber: { $regex: search, $options: 'i' } }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('client', 'companyName ownerName mobile email address city state pincode gstNumber')
      .populate('executive', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get order details
// @route GET /api/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('client')
      .populate('executive', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'executive' && order.executive._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc Create new Order
// @route POST /api/orders
const createOrder = async (req, res, next) => {
  try {
    const { clientId, items, discount = 0, notes, deliveryDate } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const execId = req.user.role === 'executive' ? req.user._id : (client.assignedExecutive || req.user._id);

    let subTotal = 0;
    let totalGst = 0;
    const formattedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice || product.sellingPrice);
      const gstPct = Number(product.gstPercentage || 18);
      const itemSubtotal = qty * unitPrice;
      const itemGst = (itemSubtotal * gstPct) / 100;

      subTotal += itemSubtotal;
      totalGst += itemGst;

      formattedItems.push({
        product: product._id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        gstPercentage: gstPct,
        subtotal: itemSubtotal,
      });
    }

    const grandTotal = Math.max(0, subTotal - Number(discount) + totalGst);
    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      client: clientId,
      executive: execId,
      items: formattedItems,
      subTotal,
      discount: Number(discount),
      totalGst,
      grandTotal,
      notes: notes || '',
      deliveryDate: deliveryDate || null,
      status: 'Pending Approval',
    });

    await logActivity({
      user: req.user._id,
      module: 'Order Management',
      action: 'Create Order',
      description: `Created order ${orderNumber} for client ${client.companyName} (Grand Total: ₹${grandTotal.toFixed(2)})`,
    });

    await sendNotification({
      roleTarget: 'admin',
      title: 'New Order Placed',
      message: `Order ${orderNumber} placed for ${client.companyName} by ${req.user.name}. Needs Approval.`,
      type: 'new_order',
      link: '/orders',
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc Update Order Status (Approve / Deduct Stock / Advance Status)
// @route PUT /api/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, nfcDetails } = req.body;
    const order = await Order.findById(req.params.id).populate('client').populate('executive');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status;

    if (nfcDetails) {
      order.nfcDetails = nfcDetails;
    }

    // Handlers for status transitions:
    // When transitioning to Approved or Stock Deducted for the first time:
    if (['Approved', 'Stock Deducted'].includes(status) && !['Approved', 'Stock Deducted', 'Invoice Generated', 'Payment Completed', 'Printing', 'NFC Configuration', 'Delivery', 'Completed'].includes(previousStatus)) {
      
      // 1. Stock Deduction
      for (const item of order.items) {
        let stock = await Stock.findOne({ product: item.product });
        if (stock) {
          stock.quantity = Math.max(0, stock.quantity - item.quantity);
          await stock.save();

          await StockTransaction.create({
            product: item.product,
            type: 'Stock Out',
            quantity: item.quantity,
            referenceId: order.orderNumber,
            notes: `Auto deducted for Order ${order.orderNumber}`,
            createdBy: req.user._id,
          });

          if (stock.quantity <= stock.lowStockThreshold) {
            await sendNotification({
              roleTarget: 'admin',
              title: 'Low Stock Alert',
              message: `Item ${item.productName} low stock after order ${order.orderNumber}. Remaining: ${stock.quantity}`,
              type: 'low_stock',
            });
          }
        }
      }

      // 2. Generate GST Invoice PDF
      const count = await Invoice.countDocuments();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
      const filePath = path.join(__dirname, `../uploads/invoices/${invoiceNumber}.pdf`);

      let setting = await Setting.findOne();
      if (!setting) setting = await Setting.create({});

      const invoice = await Invoice.create({
        invoiceNumber,
        order: order._id,
        client: order.client._id,
        subTotal: order.subTotal,
        discount: order.discount,
        gstDetails: [{ rate: 18, amount: order.totalGst }],
        grandTotal: order.grandTotal,
        pdfPath: `/uploads/invoices/${invoiceNumber}.pdf`,
        status: 'Generated',
      });

      await generateInvoicePDF(invoice, order, order.client, setting, filePath);

      // 3. Recalculate Executive Monthly Target & Incentive
      const orderMonth = new Date(order.createdAt).getMonth() + 1;
      const orderYear = new Date(order.createdAt).getFullYear();
      await calculateExecutiveIncentive(order.executive._id, orderMonth, orderYear);
    }

    const updatedOrder = await order.save();

    await logActivity({
      user: req.user._id,
      module: 'Order Management',
      action: 'Update Order Status',
      description: `Order ${order.orderNumber} status changed from '${previousStatus}' to '${status}'`,
    });

    await sendNotification({
      user: order.executive._id,
      roleTarget: 'all',
      title: 'Order Status Updated',
      message: `Order ${order.orderNumber} status changed to ${status}`,
      type: 'order_status',
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus };
