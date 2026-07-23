const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'system' },
    module: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Object, default: {} },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
