const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Kevalon Technology' },
    tagline: { type: String, default: 'Tapzy NFC Business & Google Review Cards' },
    email: { type: String, default: 'support@kevalon.com' },
    phone: { type: String, default: '+91 98765 43210' },
    address: { type: String, default: 'Kevalon Tech Park, Business Hub, Ahmedabad, Gujarat, India' },
    gstNumber: { type: String, default: '24AAAAA0000A1Z5' },
    bankDetails: {
      accountName: { type: String, default: 'Kevalon Technology Private Limited' },
      accountNumber: { type: String, default: '99887766554433' },
      ifscCode: { type: String, default: 'HDFC0001234' },
      bankName: { type: String, default: 'HDFC Bank' },
      branch: { type: String, default: 'SG Highway Branch' },
    },
    defaultLowStockThreshold: { type: Number, default: 20 },
    termsAndConditions: { type: String, default: '1. All NFC products carry a 1-year warranty against chip defect.\n2. Goods once sold will not be returned unless damaged during transit.\n3. GST 18% applied as per Govt guidelines.' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
