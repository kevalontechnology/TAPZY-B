const Activity = require('../models/Activity');

// @desc Get activity logs
// @route GET /api/activities
const getActivities = async (req, res, next) => {
  try {
    const { module, user, limit = 50 } = req.query;
    let query = {};

    if (module) query.module = module;
    if (user) query.user = user;

    const activities = await Activity.find(query)
      .populate('user', 'name email role avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: activities.length, activities });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActivities };
