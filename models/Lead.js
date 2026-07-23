const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    whatsapp: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Follow-up', 'Interested', 'Negotiation', 'Converted', 'Lost'],
      default: 'New',
    },
    source: { type: String, default: 'Direct Visit' },
    assignedExecutive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followUpDate: { type: Date },
    notes: { type: String, default: '' },
    activityTimeline: [
      {
        action: String,
        note: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
