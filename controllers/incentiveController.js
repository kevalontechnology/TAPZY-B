const Incentive = require('../models/Incentive');
const IncentiveRule = require('../models/IncentiveRule');
const { logActivity } = require('../services/activityLogger');
const { calculateExecutiveIncentive } = require('../services/incentiveCalculator');

// @desc Get incentives list
// @route GET /api/incentives
const getIncentives = async (req, res, next) => {
  try {
    const { month, year, executive } = req.query;
    let query = {};

    if (req.user.role === 'executive') {
      query.executive = req.user._id;
    } else if (executive) {
      query.executive = executive;
    }

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const incentives = await Incentive.find(query)
      .populate('executive', 'name email phone avatar')
      .populate('target')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, count: incentives.length, incentives });
  } catch (error) {
    next(error);
  }
};

// @desc Get current active incentive rule / slabs
// @route GET /api/incentives/rules
const getIncentiveRules = async (req, res, next) => {
  try {
    let rule = await IncentiveRule.findOne({ isActive: true });
    if (!rule) {
      rule = await IncentiveRule.create({
        name: 'Default Dynamic Slabs',
        slabs: [
          { minQty: 0, maxQty: 100, ratePerCard: 0 },
          { minQty: 101, maxQty: 150, ratePerCard: 30 },
          { minQty: 151, maxQty: 200, ratePerCard: 40 },
          { minQty: 201, maxQty: 10000, ratePerCard: 50 },
        ],
        isActive: true,
      });
    }
    res.json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};

// @desc Configure dynamic incentive slabs
// @route POST /api/incentives/rules
const updateIncentiveRules = async (req, res, next) => {
  try {
    const { name, slabs } = req.body;

    await IncentiveRule.updateMany({}, { isActive: false });

    const newRule = await IncentiveRule.create({
      name: name || 'Updated Dynamic Slabs',
      slabs,
      isActive: true,
    });

    await logActivity({
      user: req.user._id,
      module: 'Incentive Rules',
      action: 'Update Incentive Slabs',
      description: 'Configured new dynamic incentive slabs',
    });

    res.status(201).json({ success: true, rule: newRule });
  } catch (error) {
    next(error);
  }
};

// @desc Recalculate executive incentive manually
// @route POST /api/incentives/recalculate
const recalculateIncentive = async (req, res, next) => {
  try {
    const { executiveId, month, year } = req.body;
    const incentive = await calculateExecutiveIncentive(executiveId, Number(month), Number(year));
    res.json({ success: true, incentive });
  } catch (error) {
    next(error);
  }
};

module.exports = { getIncentives, getIncentiveRules, updateIncentiveRules, recalculateIncentive };
