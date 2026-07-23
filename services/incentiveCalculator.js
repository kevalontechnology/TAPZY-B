const Target = require('../models/Target');
const Order = require('../models/Order');
const Incentive = require('../models/Incentive');
const IncentiveRule = require('../models/IncentiveRule');

const calculateExecutiveIncentive = async (executiveId, month, year) => {
  try {
    const target = await Target.findOne({ executive: executiveId, month, year });
    const targetQty = target ? target.targetCards : 100;

    // Start of month & end of month dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Find all completed/approved orders placed by this executive in the month
    const orders = await Order.find({
      executive: executiveId,
      status: { $in: ['Approved', 'Stock Deducted', 'Invoice Generated', 'Payment Completed', 'Printing', 'NFC Configuration', 'Delivery', 'Completed'] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    let totalSold = 0;
    orders.forEach((order) => {
      order.items.forEach((item) => {
        totalSold += item.quantity;
      });
    });

    // Fetch active incentive rules
    let rule = await IncentiveRule.findOne({ isActive: true });
    let slabs = rule ? rule.slabs : [
      { minQty: 0, maxQty: 100, ratePerCard: 0 },
      { minQty: 101, maxQty: 150, ratePerCard: 30 },
      { minQty: 151, maxQty: 200, ratePerCard: 40 },
      { minQty: 201, maxQty: Infinity, ratePerCard: 50 },
    ];

    let earnedAmount = 0;
    const extraSold = Math.max(0, totalSold - targetQty);

    if (extraSold > 0) {
      // Calculate slab by slab for quantity beyond target
      // Or calculate based on totalSold range
      let remainingExtra = extraSold;
      let currentQty = targetQty;

      for (let i = 0; i < slabs.length; i++) {
        const slab = slabs[i];
        if (slab.ratePerCard <= 0) continue;

        if (totalSold >= slab.minQty) {
          const countInThisSlab = Math.min(totalSold, slab.maxQty) - Math.max(targetQty, slab.minQty - 1);
          if (countInThisSlab > 0) {
            earnedAmount += countInThisSlab * slab.ratePerCard;
          }
        }
      }
    }

    // Update or create Incentive record
    let incentive = await Incentive.findOne({ executive: executiveId, month, year });
    if (incentive) {
      incentive.totalSold = totalSold;
      incentive.targetQty = targetQty;
      incentive.extraSold = extraSold;
      incentive.earnedAmount = earnedAmount;
      await incentive.save();
    } else {
      incentive = await Incentive.create({
        executive: executiveId,
        target: target ? target._id : null,
        month,
        year,
        totalSold,
        targetQty,
        extraSold,
        earnedAmount,
        status: 'Calculated',
      });
    }

    if (target && totalSold >= targetQty && target.status !== 'Achieved') {
      target.status = 'Achieved';
      await target.save();
    }

    return incentive;
  } catch (error) {
    console.error('[IncentiveCalculator Error]', error.message);
    throw error;
  }
};

module.exports = { calculateExecutiveIncentive };
