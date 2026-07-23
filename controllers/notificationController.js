const Notification = require('../models/Notification');

// @desc Get user notifications
// @route GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ user: req.user._id }, { roleTarget: req.user.role }, { roleTarget: 'all' }],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

// @desc Mark notification as read
// @route PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (notif) {
      notif.isRead = true;
      await notif.save();
    }
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead };
