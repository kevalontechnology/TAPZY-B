const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleTarget: { type: String, enum: ['all', 'super_admin', 'admin', 'executive'], default: 'all' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['low_stock', 'pending_payment', 'follow_up', 'target_achieved', 'new_order', 'invoice', 'payment_received'],
      default: 'new_order',
    },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
