const Target = require('../models/Target');
const User = require('../models/User');
const Incentive = require('../models/Incentive');
const { logActivity } = require('../services/activityLogger');
const { calculateExecutiveIncentive } = require('../services/incentiveCalculator');

// @desc Get monthly targets (with dynamic Achieved / In Progress status)
// @route GET /api/targets
const getTargets = async (req, res, next) => {
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

    const targets = await Target.find(query)
      .populate('executive', 'name email phone avatar')
      .populate('assignedBy', 'name email')
      .sort({ year: -1, month: -1 });

    const updatedTargets = await Promise.all(
      targets.map(async (tar) => {
        if (!tar.executive) return tar;

        let incentive = await Incentive.findOne({ executive: tar.executive._id, month: tar.month, year: tar.year });
        if (!incentive) {
          incentive = await calculateExecutiveIncentive(tar.executive._id, tar.month, tar.year);
        }

        const totalSold = incentive ? incentive.totalSold : 0;
        const isAchieved = tar.targetCards > 0 && totalSold >= tar.targetCards;
        const currentStatus = isAchieved ? 'Achieved' : 'In Progress';

        if (tar.status !== currentStatus) {
          tar.status = currentStatus;
          await tar.save();
        }

        return {
          ...tar.toObject(),
          totalSoldCards: totalSold,
          status: currentStatus,
        };
      })
    );

    res.json({ success: true, count: updatedTargets.length, targets: updatedTargets });
  } catch (error) {
    next(error);
  }
};

// @desc Assign / Update Monthly Target for Executive
// @route POST /api/targets
const assignTarget = async (req, res, next) => {
  try {
    const { executiveId, month, year, targetCards, notes } = req.body;

    const exec = await User.findById(executiveId);
    if (!exec || exec.role !== 'executive') {
      return res.status(400).json({ success: false, message: 'Invalid executive specified' });
    }

    let target = await Target.findOne({ executive: executiveId, month: Number(month), year: Number(year) });

    if (target) {
      target.targetCards = Number(targetCards);
      target.notes = notes || target.notes;
      target.assignedBy = req.user._id;
      await target.save();
    } else {
      target = await Target.create({
        executive: executiveId,
        month: Number(month),
        year: Number(year),
        targetCards: Number(targetCards),
        assignedBy: req.user._id,
        notes: notes || '',
      });
    }

    // Recalculate incentive
    await calculateExecutiveIncentive(executiveId, Number(month), Number(year));

    await logActivity({
      user: req.user._id,
      module: 'Target Management',
      action: 'Assign Target',
      description: `Assigned monthly target of ${targetCards} cards to ${exec.name} for ${month}/${year}`,
    });

    res.status(201).json({ success: true, target });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTargets, assignTarget };
