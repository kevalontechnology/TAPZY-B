const Setting = require('../models/Setting');
const { logActivity } = require('../services/activityLogger');

// @desc Get company settings
// @route GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
};

// @desc Update company settings
// @route PUT /api/settings
const updateSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting({});
    }

    Object.assign(setting, req.body);
    const updatedSetting = await setting.save();

    await logActivity({
      user: req.user._id,
      module: 'Company Settings',
      action: 'Update Settings',
      description: 'Updated Kevalon Technology company profile & billing settings',
    });

    res.json({ success: true, setting: updatedSetting });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
