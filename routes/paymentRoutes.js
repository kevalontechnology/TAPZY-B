const express = require('express');
const router = express.Router();
const { getPayments, recordPayment, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(protect);

router.route('/').get(getPayments).post(upload.single('receipt'), recordPayment);
router.put('/:id/verify', authorize('super_admin', 'admin'), verifyPayment);

module.exports = router;
