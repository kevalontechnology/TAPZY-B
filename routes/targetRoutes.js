const express = require('express');
const router = express.Router();
const { getTargets, assignTarget } = require('../controllers/targetController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.route('/').get(getTargets).post(authorize('super_admin', 'admin'), assignTarget);

module.exports = router;
