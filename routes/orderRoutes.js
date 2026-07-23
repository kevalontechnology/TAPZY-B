const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, createOrder, updateOrderStatus } = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrderById);
router.route('/:id/status').put(authorize('super_admin', 'admin'), updateOrderStatus);

module.exports = router;
