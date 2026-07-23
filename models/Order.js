const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  gstPercentage: { type: Number, default: 18 },
  subtotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalGst: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid'],
      default: 'Pending',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Pending Approval',
        'Approved',
        'Stock Deducted',
        'Invoice Generated',
        'Payment Completed',
        'Printing',
        'NFC Configuration',
        'Delivery',
        'Completed',
        'Cancelled',
      ],
      default: 'Pending Approval',
    },
    deliveryDate: { type: Date },
    notes: { type: String, default: '' },
    nfcDetails: [
      {
        cardType: String,
        serialNumber: String,
        encUrl: String,
        isActivated: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
