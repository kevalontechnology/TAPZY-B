const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gstDetails: [
      {
        rate: Number,
        amount: Number,
      },
    ],
    grandTotal: { type: Number, required: true },
    pdfPath: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Generated', 'Paid', 'Cancelled'],
      default: 'Generated',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
