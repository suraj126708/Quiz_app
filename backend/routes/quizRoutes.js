const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticate, requireTeacher, requireStudent } = require('../middleware/authMiddleware');

// Create quiz (teacher only)
router.post('/', authenticate, requireTeacher, quizController.createQuiz);

// Get all quizzes (with filtering)
router.get('/', authenticate, quizController.getQuizzes);

// Get single quiz
router.get('/:id', authenticate, quizController.getQuiz);

// Update quiz (teacher only, owner only)
router.put('/:id', authenticate, requireTeacher, quizController.updateQuiz);

// Toggle live status (teacher only, owner only)
router.patch('/:id/live', authenticate, requireTeacher, quizController.toggleLiveStatus);

// Submit quiz (student only)
router.post('/:id/submit', authenticate, requireStudent, quizController.submitQuiz);

// Get leaderboard for live quiz
router.get('/:id/leaderboard', authenticate, quizController.getLeaderboard);

// Delete quiz (teacher only, owner only)
router.delete('/:id', authenticate, requireTeacher, quizController.deleteQuiz);

module.exports = router;

