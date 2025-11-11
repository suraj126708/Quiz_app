// Quiz Controller - MongoDB
const { ObjectId } = require('mongodb');
const { getCollection } = require('../config/db');

// Create a new quiz (teacher only)
exports.createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      class: quizClass,
      timeLimitMinutes,
      difficulty,
      questions,
      isLive = false,
    } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must have a title and at least one question' });
    }

    if (!subject || !quizClass) {
      return res.status(400).json({ message: 'Subject and class are required' });
    }

    // Validate questions
    for (const q of questions) {
      if (!q.questionText || !q.options || q.options.length < 2) {
        return res.status(400).json({ message: 'All questions must have text and at least two options' });
      }
      const correctOptions = q.options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        return res.status(400).json({ message: 'Each question must have exactly one correct answer' });
      }
    }

    const quizzesCollection = await getCollection('quizzes');

    const quizData = {
      title,
      description: description || '',
      subject,
      class: quizClass,
      timeLimitMinutes: timeLimitMinutes || null,
      difficulty: difficulty || 'Medium',
      questions: questions.map(q => ({
        questionText: q.questionText,
        options: q.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect || false,
        })),
        explanation: q.explanation || '',
        points: q.points || 1,
      })),
      isLive,
      createdBy: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await quizzesCollection.insertOne(quizData);

    // Emit socket event for new quiz (if io is available)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('quiz-created', { quizId: result.insertedId.toString() });
      }
    } catch (error) {
      // Socket.io not available, continue without emitting
    }

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: {
        id: result.insertedId.toString(),
        title,
        subject,
        class: quizClass,
        isLive,
      },
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
};

// Get all quizzes with optional filtering
exports.getQuizzes = async (req, res) => {
  try {
    const { subject, class: quizClass, isLive, createdBy } = req.query;
    const quizzesCollection = await getCollection('quizzes');

    const filter = {};

    // Teachers can see all quizzes, students can only see quizzes for their class
    if (req.user.role === 'student') {
      filter.class = req.user.class;
    } else if (quizClass) {
      filter.class = quizClass;
    }

    if (subject) {
      filter.subject = subject;
    }

    if (isLive !== undefined) {
      filter.isLive = isLive === 'true';
    }

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const quizzes = await quizzesCollection
      .find(filter, { projection: { questions: 0 } }) // Don't send questions in list
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      quizzes: quizzes.map(quiz => ({
        id: quiz._id.toString(),
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        class: quiz.class,
        timeLimitMinutes: quiz.timeLimitMinutes,
        difficulty: quiz.difficulty,
        isLive: quiz.isLive,
        createdBy: quiz.createdBy,
        createdAt: quiz.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error retrieving quizzes' });
  }
};

// Get a single quiz by ID
exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quizzesCollection = await getCollection('quizzes');

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quiz = await quizzesCollection.findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if student has access to this quiz
    if (req.user.role === 'student' && quiz.class !== req.user.class) {
      return res.status(403).json({ message: 'Access denied. This quiz is not for your class' });
    }

    // Don't send correct answers if quiz is not completed
    const quizData = {
      id: quiz._id.toString(),
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      class: quiz.class,
      timeLimitMinutes: quiz.timeLimitMinutes,
      difficulty: quiz.difficulty,
      isLive: quiz.isLive,
      questions: quiz.questions.map(q => ({
        id: q._id?.toString() || Math.random().toString(),
        questionText: q.questionText,
        options: q.options.map(opt => ({
          text: opt.text,
          // Only show correct answer if user is teacher or quiz is completed
          isCorrect: req.user.role === 'teacher' ? opt.isCorrect : undefined,
        })),
        explanation: q.explanation,
        points: q.points,
      })),
      createdAt: quiz.createdAt,
    };

    res.json({ quiz: quizData });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error retrieving quiz' });
  }
};

// Update quiz (teacher only, owner only)
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quizzesCollection = await getCollection('quizzes');
    const quiz = await quizzesCollection.findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You can only update your own quizzes' });
    }

    updates.updatedAt = new Date();
    const result = await quizzesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    res.json({ message: 'Quiz updated successfully' });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ message: 'Server error updating quiz' });
  }
};

// Toggle live status of quiz (teacher only)
exports.toggleLiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quizzesCollection = await getCollection('quizzes');
    const quiz = await quizzesCollection.findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You can only update your own quizzes' });
    }

    await quizzesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isLive: isLive === true, updatedAt: new Date() } }
    );

    // Emit socket event for live status change (if io is available)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`quiz-${id}`).emit('quiz-status-changed', { quizId: id, isLive: isLive === true });
      }
    } catch (error) {
      // Socket.io not available, continue without emitting
    }

    res.json({ message: `Quiz ${isLive ? 'set to live' : 'set to inactive'}` });
  } catch (error) {
    console.error('Toggle live status error:', error);
    res.status(500).json({ message: 'Server error updating quiz status' });
  }
};

// Submit quiz answers (student only)
exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { questionIndex, selectedOptionIndex }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quizzesCollection = await getCollection('quizzes');
    const quiz = await quizzesCollection.findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!quiz.isLive) {
      return res.status(400).json({ message: 'This quiz is not currently live' });
    }

    // Check if student has access to this quiz
    if (quiz.class !== req.user.class) {
      return res.status(403).json({ message: 'Access denied. This quiz is not for your class' });
    }

    // Check if student has already submitted
    const submissionsCollection = await getCollection('submissions');
    const existingSubmission = await submissionsCollection.findOne({
      quizId: id,
      studentId: req.user.userId,
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const results = [];

    quiz.questions.forEach((question, qIndex) => {
      maxScore += question.points || 1;
      const userAnswer = answers.find(a => a.questionIndex === qIndex);
      const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
      const isCorrect = userAnswer && userAnswer.selectedOptionIndex === correctOptionIndex;

      if (isCorrect) {
        totalScore += question.points || 1;
      }

      results.push({
        questionIndex: qIndex,
        questionText: question.questionText,
        userAnswer: userAnswer ? userAnswer.selectedOptionIndex : null,
        correctAnswer: correctOptionIndex,
        isCorrect,
        explanation: question.explanation,
      });
    });

    // Save submission
    const submission = {
      quizId: id,
      studentId: req.user.userId,
      studentName: req.user.name,
      studentClass: req.user.class,
      answers,
      score: totalScore,
      maxScore,
      percentage: (totalScore / maxScore) * 100,
      submittedAt: new Date(),
    };

    await submissionsCollection.insertOne(submission);

    // Emit socket event for new submission (if io is available)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`quiz-${id}`).emit('leaderboard-update', { quizId: id });
      }
    } catch (error) {
      // Socket.io not available, continue without emitting
    }

    res.json({
      message: 'Quiz submitted successfully',
      score: totalScore,
      maxScore,
      percentage: ((totalScore / maxScore) * 100).toFixed(2),
      results,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Server error submitting quiz' });
  }
};

// Get live quiz leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const submissionsCollection = await getCollection('submissions');
    const leaderboard = await submissionsCollection
      .find({ quizId: id })
      .sort({ percentage: -1, submittedAt: 1 }) // Sort by percentage descending, then by time
      .limit(100) // Top 100
      .toArray();

    res.json({
      leaderboard: leaderboard.map((sub, index) => ({
        rank: index + 1,
        studentName: sub.studentName,
        studentClass: sub.studentClass,
        score: sub.score,
        maxScore: sub.maxScore,
        percentage: sub.percentage.toFixed(2),
        submittedAt: sub.submittedAt,
      })),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error retrieving leaderboard' });
  }
};

// Delete quiz (teacher only, owner only)
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }

    const quizzesCollection = await getCollection('quizzes');
    const quiz = await quizzesCollection.findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own quizzes' });
    }

    await quizzesCollection.deleteOne({ _id: new ObjectId(id) });

    // Also delete related submissions
    const submissionsCollection = await getCollection('submissions');
    await submissionsCollection.deleteMany({ quizId: id });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error deleting quiz' });
  }
};

