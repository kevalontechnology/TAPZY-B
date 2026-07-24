const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema(
  {
    executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    targetCards: { type: Number, required: true, min: 1 },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Achieved', 'Expired', 'In Progress', 'Pending'], default: 'Active' },
  },
  { timestamps: true }
);

targetSchema.index({ executive: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Target', targetSchema);
