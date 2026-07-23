const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Client = require('./models/Client');
const Lead = require('./models/Lead');
const Product = require('./models/Product');
const Stock = require('./models/Stock');
const StockTransaction = require('./models/StockTransaction');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const Invoice = require('./models/Invoice');
const Target = require('./models/Target');
const IncentiveRule = require('./models/IncentiveRule');
const Incentive = require('./models/Incentive');
const Setting = require('./models/Setting');
const Activity = require('./models/Activity');
const Notification = require('./models/Notification');
const { calculateExecutiveIncentive } = require('./services/incentiveCalculator');

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await Client.deleteMany({});
    await Lead.deleteMany({});
    await Product.deleteMany({});
    await Stock.deleteMany({});
    await StockTransaction.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    await Target.deleteMany({});
    await IncentiveRule.deleteMany({});
    await Incentive.deleteMany({});
    await Setting.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});

    console.log('[Seed] Creating Default Company Settings...');
    await Setting.create({
      companyName: 'Kevalon Technology',
      tagline: 'Tapzy NFC Business & Google Review Cards',
      email: 'contact@kevalon.com',
      phone: '+91 98765 43210',
      address: 'Kevalon Tech Hub, SG Highway, Ahmedabad, Gujarat - 380015',
      gstNumber: '24AAAAA0000A1Z5',
    });

    console.log('[Seed] Creating Users (Super Admin, Admin, Executives)...');
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

    console.log('[Seed] Creating Incentive Slabs Rule...');
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

    console.log('[Seed] Assigning Monthly Targets...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    await Target.create({
      executive: execRahul._id,
      month: currentMonth,
      year: currentYear,
      targetCards: 100,
      assignedBy: admin._id,
      notes: 'Target for current month sales performance',
    });

    await Target.create({
      executive: execPriya._id,
      month: currentMonth,
      year: currentYear,
      targetCards: 80,
      assignedBy: admin._id,
      notes: 'Target for current month sales performance',
    });

    console.log('[Seed] Creating Tapzy Products...');
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

    const prodNfcStand = await Product.create({
      sku: 'TAP-NFC-STAND',
      name: 'Tapzy Multi-purpose NFC Stand',
      category: 'NFC Stand',
      costPrice: 250,
      sellingPrice: 699,
      gstPercentage: 18,
      description: 'Smart table standee for restaurants, cafes, and retail shops.',
    });

    console.log('[Seed] Creating Stocks and Transactions...');
    await Stock.create({ product: prodNfcCard._id, quantity: 250, lowStockThreshold: 30 });
    await Stock.create({ product: prodGoogleCard._id, quantity: 180, lowStockThreshold: 25 });
    await Stock.create({ product: prodStandee._id, quantity: 95, lowStockThreshold: 15 });
    await Stock.create({ product: prodNfcStand._id, quantity: 120, lowStockThreshold: 20 });

    await StockTransaction.create({
      product: prodNfcCard._id,
      type: 'Opening Stock',
      quantity: 250,
      notes: 'Initial warehouse stock count',
      createdBy: superAdmin._id,
    });

    console.log('[Seed] Creating Sample Clients...');
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

    const client2 = await Client.create({
      companyName: 'Horizon Jewels & Diamonds',
      ownerName: 'Mahesh Bholani',
      mobile: '9898054321',
      whatsapp: '9898054321',
      email: 'sales@horizonjewels.com',
      gstNumber: '24BBBCA5678F1ZC',
      address: 'Jewel Tower, Satellite',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      assignedExecutive: execRahul._id,
      notes: 'Custom Gold Metal NFC Business cards requested',
      nfcProfileUrl: 'https://tapzy.in/p/horizon-jewels',
    });

    console.log('[Seed] Creating Sample Leads...');
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

    await Lead.create({
      clientName: 'Nisha Varma',
      companyName: 'Glow Salon & Spa',
      mobile: '9900112233',
      email: 'nisha@glowspa.com',
      status: 'Follow-up',
      source: 'Instagram Ad',
      assignedExecutive: execPriya._id,
      followUpDate: new Date(Date.now() + 86400000 * 1),
      notes: 'Requested sample NFC review card',
      activityTimeline: [{ action: 'Lead Created', note: 'Inbound request for pricing sheet', performedBy: execPriya._id }],
    });

    console.log('[Seed] Creating Approved Sample Orders to trigger Stock Deduction & Incentives...');
    // Order 1 for Rahul (112 cards to demonstrate target bonus override: 112 sold vs 100 target -> 12 extra -> ₹360 bonus)
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

    // Create Invoice for Order 1
    await Invoice.create({
      invoiceNumber: 'INV-2026-0001',
      order: order1._id,
      client: client1._id,
      subTotal: order1.subTotal,
      discount: order1.discount,
      gstDetails: [{ rate: 18, amount: order1.totalGst }],
      grandTotal: order1.grandTotal,
      pdfPath: '/uploads/invoices/INV-2026-0001.pdf',
      status: 'Paid',
    });

    // Payment for Order 1
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

    console.log('[Seed] Recalculating Executive Incentives...');
    await calculateExecutiveIncentive(execRahul._id, currentMonth, currentYear);
    await calculateExecutiveIncentive(execPriya._id, currentMonth, currentYear);

    console.log('[Seed] Creating Activity & Notifications...');
    await Activity.create({
      user: superAdmin._id,
      module: 'System',
      action: 'Seed Initialized',
      description: 'System populated with demo enterprise CRM data for Kevalon Technology.',
    });

    await Notification.create({
      user: execRahul._id,
      roleTarget: 'all',
      title: 'Target Bonus Earned!',
      message: 'Congratulations Rahul! You achieved your monthly 100 card target (Sold: 112) and earned ₹360 bonus incentive!',
      type: 'target_achieved',
    });

    console.log('=======================================================');
    console.log('  KEVALON TECHNOLOGY CRM DATA SEEDED SUCCESSFULLY!    ');
    console.log('=======================================================');
    console.log('  SUPER ADMIN: superadmin@kevalon.com | admin123');
    console.log('  ADMIN:       admin@kevalon.com      | admin123');
    console.log('  EXECUTIVE 1: rahul@kevalon.com      | exec123');
    console.log('  EXECUTIVE 2: priya@kevalon.com      | exec123');
    console.log('=======================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
