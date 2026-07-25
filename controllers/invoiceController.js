const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Setting = require('../models/Setting');
const { generateInvoicePDF } = require('../services/pdfGenerator');
const path = require('path');
const fs = require('fs');

// @desc Get all invoices
// @route GET /api/invoices
const getInvoices = async (req, res, next) => {
  try {
    const { client, search } = req.query;
    let query = {};

    if (client) query.client = client;
    if (search) {
      query.invoiceNumber = { $regex: search, $options: 'i' };
    }

    const invoices = await Invoice.find(query)
      .populate('order', 'orderNumber grandTotal subTotal totalGst discount status items paymentStatus')
      .populate('client', 'companyName ownerName email mobile gstNumber address city state pincode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    next(error);
  }
};

// @desc Download PDF invoice file (Always generates fresh PDF with latest company & client details)
// @route GET /api/invoices/:id/pdf
const downloadInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('order')
      .populate('client');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const uploadsDir = path.join(__dirname, '../uploads/invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${invoice.invoiceNumber}.pdf`;
    const fullPath = path.join(uploadsDir, fileName);

    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});

    // Generate fresh structured PDF invoice
    await generateInvoicePDF(invoice, invoice.order, invoice.client, setting, fullPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    return fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error('[Invoice PDF Download Error]', error);
    next(error);
  }
};

module.exports = { getInvoices, downloadInvoicePDF };
