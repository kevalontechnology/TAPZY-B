const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'],
      required: true,
    },
    transactionId: { type: String, default: '' },
    receiptImage: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'Refunded'],
      default: 'Pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
