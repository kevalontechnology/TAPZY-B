const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { logActivity } = require('../services/activityLogger');
const { sendNotification } = require('../services/notificationService');

// @desc Get payment list
// @route GET /api/payments
const getPayments = async (req, res, next) => {
  try {
    const { status, orderId, method, executive } = req.query;
    let query = {};

    if (req.user.role === 'executive') {
      query.executive = req.user._id;
    } else if (executive) {
      query.executive = executive;
    }

    if (status) query.status = status;
    if (orderId) query.order = orderId;
    if (method) query.method = method;

    const payments = await Payment.find(query)
      .populate('order', 'orderNumber grandTotal paymentStatus')
      .populate('client', 'companyName ownerName mobile')
      .populate('executive', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

// @desc Record a payment (by Executive or Admin)
// @route POST /api/payments
const recordPayment = async (req, res, next) => {
  try {
    const { orderId, amount, method, transactionId, notes } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let receiptImage = '';
    if (req.file) {
      receiptImage = `/uploads/${req.file.filename}`;
    }

    const execId = req.user.role === 'executive' ? req.user._id : (order.executive || req.user._id);

    const payment = await Payment.create({
      order: orderId,
      client: order.client,
      executive: execId,
      amount: Number(amount),
      method,
      transactionId: transactionId || '',
      receiptImage,
      notes: notes || '',
      status: req.user.role !== 'executive' ? 'Verified' : 'Pending',
      verifiedBy: req.user.role !== 'executive' ? req.user._id : null,
      verifiedAt: req.user.role !== 'executive' ? new Date() : null,
    });

    // Recalculate order payment status if verified immediately
    if (payment.status === 'Verified') {
      const verifiedPayments = await Payment.find({ order: orderId, status: 'Verified' });
      const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid >= order.grandTotal) {
        order.paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        order.paymentStatus = 'Partial';
      }
      await order.save();
    }

    await logActivity({
      user: req.user._id,
      module: 'Payment Module',
      action: 'Record Payment',
      description: `Collected ₹${amount} via ${method} for Order ${order.orderNumber}`,
    });

    await sendNotification({
      roleTarget: 'admin',
      title: 'Payment Received',
      message: `Payment of ₹${amount} received for Order ${order.orderNumber} (${method})`,
      type: 'payment_received',
    });

    res.status(201).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

// @desc Verify Payment (by Admin / Super Admin)
// @route PUT /api/payments/:id/verify
const verifyPayment = async (req, res, next) => {
  try {
    const { status } = req.body; // 'Verified' or 'Rejected'
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    payment.status = status;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.order);
    if (order) {
      const verifiedPayments = await Payment.find({ order: order._id, status: 'Verified' });
      const totalPaid = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid >= order.grandTotal) {
        order.paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        order.paymentStatus = 'Partial';
      } else {
        order.paymentStatus = 'Pending';
      }
      await order.save();
    }

    await logActivity({
      user: req.user._id,
      module: 'Payment Module',
      action: 'Verify Payment',
      description: `Payment ${payment._id} marked as ${status} (₹${payment.amount})`,
    });

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPayments, recordPayment, verifyPayment };
