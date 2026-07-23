const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema(
  {
    executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'Target' },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalSold: { type: Number, required: true, default: 0 },
    targetQty: { type: Number, required: true, default: 0 },
    extraSold: { type: Number, required: true, default: 0 },
    earnedAmount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Calculated', 'Approved', 'Paid'], default: 'Calculated' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incentive', incentiveSchema);
