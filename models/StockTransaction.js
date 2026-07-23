const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['Opening Stock', 'Purchase Entry', 'Stock In', 'Stock Out', 'Stock Adjustment', 'Damaged Stock'],
      required: true,
    },
    quantity: { type: Number, required: true },
    referenceId: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
