const express = require('express');
const router = express.Router();
const { getInvoices, downloadInvoicePDF } = require('../controllers/invoiceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getInvoices);
router.get('/:id/pdf', downloadInvoicePDF);

module.exports = router;
