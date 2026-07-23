const express = require('express');
const router = express.Router();
const { getClients, getClientById, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router.route('/').get(getClients).post(createClient);

router
  .route('/:id')
  .get(getClientById)
  .put(updateClient)
  .delete(authorize('super_admin', 'admin'), deleteClient);

module.exports = router;
