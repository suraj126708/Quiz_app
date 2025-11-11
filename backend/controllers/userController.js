// User Controller - Firebase Auth + MongoDB
const { getCollection } = require("../config/db");
const admin = require("../config/firebaseAdmin");

// Create or update user in database after Firebase authentication
exports.createUser = async (req, res) => {
  console.log('📥 POST /api/users/create - Request received');
  console.log('📥 Headers:', { authorization: req.headers.authorization ? 'Bearer ***' : 'missing' });
  console.log('📥 Body:', { ...req.body, firebaseUID: req.body.firebaseUID ? '***' : 'missing' });
  
  try {
    // Verify Firebase token first
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: "No token provided" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const { firebaseUID, email, name, role, class: studentClass } = req.body;

    // Verify that the firebaseUID matches the token
    if (firebaseUID !== decodedToken.uid) {
      return res.status(403).json({ message: "Firebase UID mismatch" });
    }

    // Verify email matches (if provided in token)
    if (decodedToken.email && email !== decodedToken.email) {
      return res.status(403).json({ message: "Email mismatch" });
    }

    if (!firebaseUID || !email || !name || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (role !== "teacher" && role !== "student") {
      return res
        .status(400)
        .json({ message: "Invalid role. Must be teacher or student" });
    }

    if (role === "student" && !studentClass) {
      return res
        .status(400)
        .json({ message: "Class is required for students" });
    }

    const usersCollection = await getCollection("users");

    // Check if user already exists by firebaseUID
    const existingUser = await usersCollection.findOne({ firebaseUID });

    if (existingUser) {
      console.log(`ℹ️ User already exists in MongoDB: ${email} with role: ${existingUser.role}`);
      
      // If user exists but with a different role, return error with role info
      if (existingUser.role !== role) {
        console.error(`❌ Role mismatch for ${email}: existing=${existingUser.role}, requested=${role}`);
        return res.status(400).json({ 
          message: `User already exists with role: ${existingUser.role}. Cannot change role.`,
          existingRole: existingUser.role 
        });
      }
      
      // User exists with same role - update any missing fields and return existing user data
      const updateFields = {};
      if (!existingUser.name && name) updateFields.name = name;
      if (!existingUser.email && email) updateFields.email = email;
      if (role === "student" && !existingUser.class && studentClass) {
        updateFields.class = studentClass;
      }
      updateFields.updatedAt = new Date();
      
      if (Object.keys(updateFields).length > 1) { // More than just updatedAt
        await usersCollection.updateOne(
          { firebaseUID },
          { $set: updateFields }
        );
        console.log(`✅ Updated user fields for ${email}`);
      }
      
      // Return existing user data
      return res.status(200).json({
        message: "User already exists",
        user: {
          id: existingUser._id.toString(),
          email: existingUser.email || email,
          name: existingUser.name || name,
          role: existingUser.role,
          class: existingUser.class || (role === "student" ? studentClass : null),
        },
      });
    }

    // Check if user exists by email (in case firebaseUID changed or was created differently)
    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail) {
      console.log(`⚠️ User exists with same email but different firebaseUID: ${email}`);
      // Update the firebaseUID to match
      await usersCollection.updateOne(
        { email },
        { 
          $set: { 
            firebaseUID,
            role, // Update role if provided
            class: role === "student" ? studentClass : null,
            updatedAt: new Date(),
          } 
        }
      );
      console.log(`✅ Updated user firebaseUID for ${email}`);
      
      const updatedUser = await usersCollection.findOne({ firebaseUID });
      return res.status(200).json({
        message: "User updated successfully",
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          name: updatedUser.name || name,
          role: updatedUser.role,
          class: updatedUser.class || null,
        },
      });
    }

    // Create new user document
    const userData = {
      firebaseUID,
      email,
      name,
      role,
      class: role === "student" ? studentClass : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`📝 Creating new user in MongoDB:`, { email, name, role, class: studentClass || null });
    
    const result = await usersCollection.insertOne(userData);

    console.log(`✅ User created successfully in MongoDB: ${email} with role: ${role}`);
    console.log(`📝 User ID: ${result.insertedId.toString()}`);

    console.log('✅ User created successfully, sending response');
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: result.insertedId.toString(),
        email,
        name,
        role,
        class: studentClass || null,
      },
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      message: "Server error creating user", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const usersCollection = await getCollection("users");
    const user = await usersCollection.findOne(
      { firebaseUID: req.user.uid },
      { projection: { firebaseUID: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`🔐 Get profile - User: ${user.email}, Role: ${user.role}`);

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      class: user.class || null,
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ message: "Server error retrieving profile", error: error.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, class: studentClass } = req.body;
    const updates = { updatedAt: new Date() };

    if (name) updates.name = name;
    if (studentClass && req.user.role === "student") {
      updates.class = studentClass;
    }

    const usersCollection = await getCollection("users");
    const result = await usersCollection.updateOne(
      { firebaseUID: req.user.uid },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// Get all users (for admin/teacher)
exports.getAllUsers = async (req, res) => {
  try {
    const usersCollection = await getCollection("users");
    const users = await usersCollection
      .find({}, { projection: { firebaseUID: 0 } })
      .toArray();

    res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        class: user.class || null,
      })),
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error retrieving users" });
  }
};
