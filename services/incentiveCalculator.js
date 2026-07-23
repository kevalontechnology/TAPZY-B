const Target = require('../models/Target');
const Order = require('../models/Order');
const Incentive = require('../models/Incentive');
const IncentiveRule = require('../models/IncentiveRule');

const calculateExecutiveIncentive = async (executiveId, month, year) => {
  try {
    const target = await Target.findOne({ executive: executiveId, month: Number(month), year: Number(year) });
    const targetQty = target ? target.targetCards : 0;

    // Start of month & end of month dates
    const startDate = new Date(year, Number(month) - 1, 1, 0, 0, 0);
    const endDate = new Date(year, Number(month), 0, 23, 59, 59);

    // Find all valid non-cancelled orders placed by this executive in the month
    const orders = await Order.find({
      executive: executiveId,
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    let totalSold = 0;
    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          totalSold += Number(item.quantity || 0);
        });
      }
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
    const extraSold = targetQty > 0 ? Math.max(0, totalSold - targetQty) : totalSold;

    if (extraSold > 0) {
      for (let i = 0; i < slabs.length; i++) {
        const slab = slabs[i];
        if (slab.ratePerCard <= 0) continue;

        const slabMin = slab.minQty;
        const slabMax = slab.maxQty === undefined || slab.maxQty === null ? Infinity : slab.maxQty;

        if (totalSold >= slabMin) {
          const startCount = Math.max(targetQty, slabMin - 1);
          const endCount = Math.min(totalSold, slabMax);
          const countInThisSlab = endCount - startCount;
          if (countInThisSlab > 0) {
            earnedAmount += countInThisSlab * slab.ratePerCard;
          }
        }
      }
    }

    // Update or create Incentive record
    let incentive = await Incentive.findOne({ executive: executiveId, month: Number(month), year: Number(year) });
    if (incentive) {
      incentive.totalSold = totalSold;
      incentive.targetQty = targetQty;
      incentive.extraSold = extraSold;
      incentive.earnedAmount = earnedAmount;
      if (target) incentive.target = target._id;
      await incentive.save();
    } else {
      incentive = await Incentive.create({
        executive: executiveId,
        target: target ? target._id : null,
        month: Number(month),
        year: Number(year),
        totalSold,
        targetQty,
        extraSold,
        earnedAmount,
        status: 'Calculated',
      });
    }

    if (target && targetQty > 0 && totalSold >= targetQty && target.status !== 'Achieved') {
      target.status = 'Achieved';
      await target.save();
    }

    return incentive;
  } catch (error) {
    console.error('[IncentiveCalculator Error]', error.message);
    return {
      totalSold: 0,
      targetQty: 0,
      extraSold: 0,
      earnedAmount: 0,
    };
  }
};

module.exports = { calculateExecutiveIncentive };
