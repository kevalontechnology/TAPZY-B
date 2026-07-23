const Notification = require('../models/Notification');

let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const sendNotification = async ({ user = null, roleTarget = 'all', title, message, type, link = '' }) => {
  try {
    const notif = await Notification.create({
      user,
      roleTarget,
      title,
      message,
      type,
      link,
    });

    if (ioInstance) {
      ioInstance.emit('notification', notif);
    }
    return notif;
  } catch (error) {
    console.error('[NotificationService Error]', error.message);
  }
};

module.exports = { setSocketIO, sendNotification };
