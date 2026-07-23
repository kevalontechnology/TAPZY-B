const express = require('express');
const router = express.Router();
const { getDashboardData, getExecutiveReport } = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/executive-performance', getExecutiveReport);

module.exports = router;
