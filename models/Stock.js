const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    quantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 20 },
    location: { type: String, default: 'Main Warehouse' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stock', stockSchema);
