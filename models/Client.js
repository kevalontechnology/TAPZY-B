const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    whatsapp: { type: String, default: '', trim: true },
    email: { type: String, required: true, trim: true },
    gstNumber: { type: String, default: '', trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    notes: { type: String, default: '' },
    assignedExecutive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documents: [{ name: String, url: String }],
    nfcProfileUrl: { type: String, default: '' },
    googleReviewUrl: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
