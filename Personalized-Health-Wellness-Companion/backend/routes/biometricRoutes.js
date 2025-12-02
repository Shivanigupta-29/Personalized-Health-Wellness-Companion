const express = require('express');
const router = express.Router();
const {
  logBiometricData,
  getBiometricByType,
  getBiometricSummary,
  updateBiometricData,
  deleteBiometricData,
  getProgressDashboard
} = require('../controllers/biometricController');
const { protect } = require('../middleware/auth');
const { validate, validationSchemas } = require('../middleware/validator');

// All routes are protected
router.use(protect);

// Biometric data routes
router.post('/', validate(validationSchemas.biometricData), logBiometricData);
router.get('/summary', getBiometricSummary);
router.get('/progress/dashboard', getProgressDashboard);
router.get('/:type', getBiometricByType);
router.put('/:id', updateBiometricData);
router.delete('/:id', deleteBiometricData);

module.exports = router;