const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireTeacher } = require('../middleware/authMiddleware');

// Create user (called after Firebase auth)
// Note: This endpoint should verify Firebase token but not require existing user in DB
// We'll verify the token in the controller itself
router.post('/create', (req, res, next) => {
  console.log('📥 Route /api/users/create matched!');
  next();
}, userController.createUser);

// Get user profile (protected)
router.get('/profile', authenticate, userController.getUserProfile);

// Update user profile (protected)
router.put('/profile', authenticate, userController.updateUserProfile);

// Get all users (teacher only)
router.get('/all', authenticate, requireTeacher, userController.getAllUsers);

module.exports = router;

