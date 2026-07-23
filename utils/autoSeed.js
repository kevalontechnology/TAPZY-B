const User = require('../models/User');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Target = require('../models/Target');
const IncentiveRule = require('../models/IncentiveRule');
const Setting = require('../models/Setting');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { calculateExecutiveIncentive } = require('../services/incentiveCalculator');

const autoSeedIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`[AutoSeed] Database already contains ${userCount} users. Skipping seed.`);
      return;
    }

    console.log('[AutoSeed] Empty database detected. Auto-populating initial enterprise CRM data...');

    // Settings
    await Setting.create({
      companyName: 'Kevalon Technology',
      tagline: 'Tapzy NFC Business & Google Review Cards',
      email: 'contact@kevalon.com',
      phone: '+91 98765 43210',
      address: 'Kevalon Tech Hub, SG Highway, Ahmedabad, Gujarat - 380015',
      gstNumber: '24AAAAA0000A1Z5',
    });

    // Users
    const superAdmin = await User.create({
      name: 'Vikram Mehta (Super Admin)',
      email: 'superadmin@kevalon.com',
      password: 'admin123',
      phone: '+91 98980 11111',
      role: 'super_admin',
      address: 'Ahmedabad Headquarters',
    });

    const admin = await User.create({
      name: 'Anjali Sharma (Admin)',
      email: 'admin@kevalon.com',
      password: 'admin123',
      phone: '+91 98980 22222',
      role: 'admin',
      address: 'Operations Hub',
    });

    const execRahul = await User.create({
      name: 'Rahul Verma',
      email: 'rahul@kevalon.com',
      password: 'exec123',
      phone: '+91 98980 33333',
      role: 'executive',
      address: 'Ahmedabad South Zone',
    });

    const execPriya = await User.create({
      name: 'Priya Patel',
      email: 'priya@kevalon.com',
      password: 'exec123',
      phone: '+91 98980 44444',
      role: 'executive',
      address: 'Ahmedabad North Zone',
    });

    // Incentive Rule
    await IncentiveRule.create({
      name: 'Standard Tapzy Dynamic Slabs',
      slabs: [
        { minQty: 0, maxQty: 100, ratePerCard: 0 },
        { minQty: 101, maxQty: 150, ratePerCard: 30 },
        { minQty: 151, maxQty: 200, ratePerCard: 40 },
        { minQty: 201, maxQty: 10000, ratePerCard: 50 },
      ],
      isActive: true,
    });

    // Targets
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    await Target.create({
      executive: execRahul._id,
      month: currentMonth,
      year: currentYear,
      targetCards: 100,
      assignedBy: admin._id,
      notes: 'Monthly sales goal',
    });

    await Target.create({
      executive: execPriya._id,
      month: currentMonth,
      year: currentYear,
      targetCards: 80,
      assignedBy: admin._id,
      notes: 'Monthly sales goal',
    });

    // Products
    const prodNfcCard = await Product.create({
      sku: 'TAP-NFC-CARD',
      name: 'Tapzy NFC Matte Black Business Card',
      category: 'NFC Business Card',
      costPrice: 150,
      sellingPrice: 499,
      gstPercentage: 18,
      description: 'Custom metal/PVC matte finish NFC card with instant contact sharing link.',
    });

    const prodGoogleCard = await Product.create({
      sku: 'TAP-GOOG-CARD',
      name: 'Tapzy Google Review NFC Card',
      category: 'Google Review Card',
      costPrice: 120,
      sellingPrice: 399,
      gstPercentage: 18,
      description: 'Tap & Review NFC card for quick Google 5-star customer reviews.',
    });

    const prodStandee = await Product.create({
      sku: 'TAP-STAND-ACR',
      name: 'Tapzy Acrylic Google Review Standee',
      category: 'Google Review Standee',
      costPrice: 300,
      sellingPrice: 899,
      gstPercentage: 18,
      description: 'Counter-top acrylic standee with embedded NFC chip & QR Code for store reviews.',
    });

    // Stocks
    await Stock.create({ product: prodNfcCard._id, quantity: 250, lowStockThreshold: 30 });
    await Stock.create({ product: prodGoogleCard._id, quantity: 180, lowStockThreshold: 25 });
    await Stock.create({ product: prodStandee._id, quantity: 95, lowStockThreshold: 15 });

    await StockTransaction.create({
      product: prodNfcCard._id,
      type: 'Opening Stock',
      quantity: 250,
      notes: 'Initial warehouse stock count',
      createdBy: superAdmin._id,
    });

    // Clients
    const client1 = await Client.create({
      companyName: 'Apex Dental Care',
      ownerName: 'Dr. Rajesh Shah',
      mobile: '9825012345',
      whatsapp: '9825012345',
      email: 'info@apexdental.com',
      gstNumber: '24AAACA1234F1ZB',
      address: 'Suite 301, CG Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380009',
      assignedExecutive: execRahul._id,
      notes: 'Wants 50 Google Review Standees for clinics',
      nfcProfileUrl: 'https://tapzy.in/p/apex-dental',
      googleReviewUrl: 'https://g.page/r/apexdental/review',
    });

    // Leads
    await Lead.create({
      clientName: 'Sanjay Thakar',
      companyName: 'Royal Spice Restaurant Chain',
      mobile: '9712398765',
      email: 'sanjay@royalspice.com',
      status: 'Interested',
      source: 'Direct Visit',
      assignedExecutive: execRahul._id,
      followUpDate: new Date(Date.now() + 86400000 * 2),
      notes: 'Interested in 100 Google Review Standees for 10 restaurant tables',
      activityTimeline: [{ action: 'Contacted', note: 'Demonstrated NFC review demo in person', performedBy: execRahul._id }],
    });

    // Orders
    const order1 = await Order.create({
      orderNumber: 'ORD-2026-0001',
      client: client1._id,
      executive: execRahul._id,
      items: [
        {
          product: prodNfcCard._id,
          productName: prodNfcCard.name,
          quantity: 112,
          unitPrice: 499,
          gstPercentage: 18,
          subtotal: 112 * 499,
        },
      ],
      subTotal: 112 * 499,
      discount: 1000,
      totalGst: (112 * 499 - 1000) * 0.18,
      grandTotal: (112 * 499 - 1000) * 1.18,
      paymentStatus: 'Paid',
      status: 'Approved',
      notes: 'Initial Bulk NFC Order',
    });

    // Payment
    await Payment.create({
      order: order1._id,
      client: client1._id,
      executive: execRahul._id,
      amount: order1.grandTotal,
      method: 'UPI',
      transactionId: 'UPI-9988776655',
      status: 'Verified',
      verifiedBy: admin._id,
      verifiedAt: new Date(),
    });

    // Calculate Executive Incentives
    await calculateExecutiveIncentive(execRahul._id, currentMonth, currentYear);
    await calculateExecutiveIncentive(execPriya._id, currentMonth, currentYear);

    // Activity & Notifications
    await Activity.create({
      user: superAdmin._id,
      module: 'System',
      action: 'AutoSeed Initialized',
      description: 'System automatically populated with demo enterprise CRM data.',
    });

    await Notification.create({
      user: execRahul._id,
      roleTarget: 'all',
      title: 'Target Bonus Earned!',
      message: 'Congratulations Rahul! You achieved your monthly target and earned bonus incentive!',
      type: 'target_achieved',
    });

    console.log('[AutoSeed] Database auto-seeded with Super Admin, Admin, Executives, Products, Orders & Incentives!');
  } catch (error) {
    console.error('[AutoSeed Error]', error.message);
  }
};

module.exports = { autoSeedIfEmpty };
