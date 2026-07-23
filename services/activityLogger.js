const Activity = require('../models/Activity');

const logActivity = async ({ user, role, module, action, description, metadata = {}, ipAddress = '' }) => {
  try {
    await Activity.create({
      user: user || null,
      role: role || (user ? user.role : 'system'),
      module,
      action,
      description,
      metadata,
      ipAddress,
    });
  } catch (error) {
    console.error('[ActivityLogger Error]', error.message);
  }
};

module.exports = { logActivity };
