const Invoice = require('../models/Invoice');
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
      .populate('order', 'orderNumber grandTotal status items')
      .populate('client', 'companyName ownerName email mobile gstNumber address city state pincode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    next(error);
  }
};

// @desc Download PDF invoice file
// @route GET /api/invoices/:id/pdf
const downloadInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const fullPath = path.join(__dirname, '..', invoice.pdfPath);
    if (fs.existsSync(fullPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
      return fs.createReadStream(fullPath).pipe(res);
    } else {
      return res.status(404).json({ success: false, message: 'Invoice PDF file not found' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getInvoices, downloadInvoicePDF };
