const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(protect);

router
  .route('/')
  .get(getProducts)
  .post(authorize('super_admin', 'admin'), upload.single('image'), createProduct);

router
  .route('/:id')
  .put(authorize('super_admin', 'admin'), upload.single('image'), updateProduct)
  .delete(authorize('super_admin'), deleteProduct);

module.exports = router;
