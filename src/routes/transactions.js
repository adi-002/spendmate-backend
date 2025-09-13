const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const txCtrl = require('../controllers/transactionController');

router.use(auth);
router.get('/', txCtrl.getAll);
router.post('/', txCtrl.create);
router.put('/:id', txCtrl.update);
router.delete('/:id', txCtrl.remove);

module.exports = router;
