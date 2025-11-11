// Firebase Authentication Middleware
const admin = require('../config/firebaseAdmin');
const { getCollection } = require('../config/db');

// Verify Firebase ID token and attach user info to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get user from database to get role and other info
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ 
      firebaseUID: decodedToken.uid 
    });

    if (!user) {
      console.log(`❌ User not found in MongoDB: ${decodedToken.uid} (${decodedToken.email})`);
      return res.status(404).json({ 
        message: 'User not found in database. Please complete registration.',
        needsRegistration: true 
      });
    }

    if (!user.role) {
      console.error(`❌ User exists but has no role: ${user.email}`);
      return res.status(400).json({ 
        message: 'User account is incomplete. Please contact support.',
      });
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      userId: user._id.toString(),
      role: user.role, // 'teacher' or 'student'
      class: user.class, // For students
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is a teacher
const requireTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Teacher role required.' });
  }
};

// Middleware to check if user is a student
const requireStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Student role required.' });
  }
};

module.exports = {
  authenticate,
  requireTeacher,
  requireStudent,
};

