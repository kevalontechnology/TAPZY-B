const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({
  minQty: { type: Number, required: true },
  maxQty: { type: Number, default: Infinity },
  ratePerCard: { type: Number, required: true },
});

const incentiveRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: 'Default Incentive Slabs' },
    slabs: [slabSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IncentiveRule', incentiveRuleSchema);
