const express = require('express');
const router = express.Router();
const { getLeads, createLead, updateLead, convertLeadToClient, deleteLead } = require('../controllers/leadController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/').get(getLeads).post(createLead);
router.route('/:id').put(updateLead).delete(deleteLead);
router.post('/:id/convert', convertLeadToClient);

module.exports = router;
