// Validation utilities

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  const ObjectId = require('mongodb').ObjectId;
  return ObjectId.isValid(id);
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

// Validate quiz data
const validateQuizData = (quizData) => {
  const errors = [];

  if (!quizData.title || !quizData.title.trim()) {
    errors.push('Quiz title is required');
  }

  if (!quizData.subject || !quizData.subject.trim()) {
    errors.push('Subject is required');
  }

  if (!quizData.class || !quizData.class.trim()) {
    errors.push('Class is required');
  }

  if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    errors.push('Quiz must have at least one question');
  } else {
    quizData.questions.forEach((q, index) => {
      if (!q.questionText || !q.questionText.trim()) {
        errors.push(`Question ${index + 1} must have text`);
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${index + 1} must have at least two options`);
      } else {
        const correctOptions = q.options.filter(opt => opt.isCorrect);
        if (correctOptions.length !== 1) {
          errors.push(`Question ${index + 1} must have exactly one correct answer`);
        }

        q.options.forEach((opt, optIndex) => {
          if (!opt.text || !opt.text.trim()) {
            errors.push(`Question ${index + 1}, Option ${optIndex + 1} must have text`);
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidPassword,
  validateQuizData,
};

