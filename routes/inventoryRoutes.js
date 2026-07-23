const express = require('express');
const router = express.Router();
const { getInventory, getTransactions, adjustStock } = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.get('/', getInventory);
router.get('/transactions', getTransactions);
router.post('/adjust', authorize('super_admin', 'admin'), adjustStock);

module.exports = router;
