const Order = require('../models/Order');
const Client = require('../models/Client');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Payment = require('../models/Payment');
const Target = require('../models/Target');
const Incentive = require('../models/Incentive');
const Product = require('../models/Product');

// @desc Comprehensive Analytics & Dashboard Report Data
// @route GET /api/reports/dashboard
const getDashboardData = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Filter by role if executive
    let orderFilter = { status: { $ne: 'Cancelled' } };
    let clientFilter = {};
    if (req.user.role === 'executive') {
      orderFilter.executive = req.user._id;
      clientFilter.assignedExecutive = req.user._id;
    }

    // Today's Sales
    const todayOrders = await Order.find({
      ...orderFilter,
      createdAt: { $gte: todayStart },
    });
    const todaysSales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Monthly Sales
    const monthlyOrders = await Order.find({
      ...orderFilter,
      createdAt: { $gte: monthStart },
    });
    const monthlySales = monthlyOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Total Sales (Lifetime)
    const allOrders = await Order.find(orderFilter);
    const totalSales = allOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Counts
    const totalClients = await Client.countDocuments(clientFilter);
    const totalOrders = allOrders.length;

    // Pending Payments
    const pendingOrders = await Order.find({ ...orderFilter, paymentStatus: { $in: ['Pending', 'Partial'] } });
    const pendingPaymentsAmount = pendingOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Low Stock Alert Count
    const lowStockCount = await Stock.countDocuments({ $expr: { $lte: ['$quantity', '$lowStockThreshold'] } });

    // Top Products Sold
    const topProductsAgg = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    // Monthly Sales Trend (Last 6 Months)
    const salesTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const mStart = new Date(y, m, 1);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59);

      const mOrders = await Order.find({
        ...orderFilter,
        createdAt: { $gte: mStart, $lte: mEnd },
      });
      const revenue = mOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const monthName = mStart.toLocaleString('default', { month: 'short' });
      salesTrend.push({ month: `${monthName} ${y}`, revenue, count: mOrders.length });
    }

    res.json({
      success: true,
      data: {
        todaysSales,
        monthlySales,
        totalSales,
        totalClients,
        totalOrders,
        pendingPaymentsAmount,
        lowStockCount,
        topProducts: topProductsAgg,
        salesTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Executive Performance & Target Report
// @route GET /api/reports/executive-performance
const getExecutiveReport = async (req, res, next) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const executives = await User.find({ role: 'executive', status: 'active' }).select('name email phone avatar');

    const reportData = await Promise.all(
      executives.map(async (exec) => {
        const target = await Target.findOne({ executive: exec._id, month, year });
        const incentive = await Incentive.findOne({ executive: exec._id, month, year });

        const clientCount = await Client.countDocuments({ assignedExecutive: exec._id });
        const orders = await Order.find({ executive: exec._id, status: { $ne: 'Cancelled' } });
        const salesTotal = orders.reduce((sum, o) => sum + o.grandTotal, 0);

        return {
          executive: exec,
          targetCards: target ? target.targetCards : 0,
          totalSoldCards: incentive ? incentive.totalSold : 0,
          extraSoldCards: incentive ? incentive.extraSold : 0,
          earnedIncentive: incentive ? incentive.earnedAmount : 0,
          totalSales: salesTotal,
          clientCount,
        };
      })
    );

    res.json({ success: true, count: reportData.length, month, year, report: reportData });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardData, getExecutiveReport };
