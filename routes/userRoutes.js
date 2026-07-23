const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(protect);

router
  .route('/')
  .get(authorize('super_admin', 'admin'), getUsers)
  .post(authorize('super_admin'), createUser);

router
  .route('/:id')
  .put(authorize('super_admin'), updateUser)
  .delete(authorize('super_admin'), deleteUser);

module.exports = router;
