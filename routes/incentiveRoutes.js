const express = require('express');
const router = express.Router();
const { getIncentives, getIncentiveRules, updateIncentiveRules, recalculateIncentive } = require('../controllers/incentiveController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.get('/', getIncentives);
router.get('/rules', getIncentiveRules);
router.post('/rules', authorize('super_admin', 'admin'), updateIncentiveRules);
router.post('/recalculate', authorize('super_admin', 'admin'), recalculateIncentive);

module.exports = router;
