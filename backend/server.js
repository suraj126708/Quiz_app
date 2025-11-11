// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./config/db");

// Import routes
const userRoutes = require("./routes/userRoutes");
const quizRoutes = require("./routes/quizRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection
connectDB()
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    // Don't exit - allow server to start and retry connection on first request
    console.log(
      "⚠️  Server will continue running. Database will reconnect on first request."
    );
  });

// Socket.io for real-time updates
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join quiz room for live updates
  socket.on("join-quiz", (quizId) => {
    socket.join(`quiz-${quizId}`);
    console.log(`User ${socket.id} joined quiz-${quizId}`);
  });

  // Leave quiz room
  socket.on("leave-quiz", (quizId) => {
    socket.leave(`quiz-${quizId}`);
    console.log(`User ${socket.id} left quiz-${quizId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to routes and controllers via req.app.get('io')
app.set("io", io);

// Test route (for health checks)
app.get("/api/test", (req, res) => {
  res.json({
    message: "Quiz App Backend API is running!",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Routes - Register after test routes
console.log("📝 Registering routes...");
app.use("/api/users", userRoutes);
console.log("✅ User routes registered: /api/users/*");
app.use("/api/quizzes", quizRoutes);
console.log("✅ Quiz routes registered: /api/quizzes/*");

// 404 handler for all unmatched routes (MUST be after all route definitions)
app.use((req, res) => {
  // Only handle if it's an API route
  if (req.path.startsWith("/api")) {
    console.log(
      `❌ 404 - API route not found: ${req.method} ${req.originalUrl}`
    );
    res.status(404).json({
      message: "API route not found",
      method: req.method,
      path: req.originalUrl,
      availableRoutes: [
        "POST /api/users/create",
        "GET /api/users/profile",
        "PUT /api/users/profile",
        "GET /api/users/all",
        "POST /api/quizzes",
        "GET /api/quizzes",
        "GET /api/test",
      ],
    });
  } else {
    // For non-API routes, just return 404
    res.status(404).json({
      message: "Route not found",
      path: req.originalUrl,
    });
  }
});

// Start server
server.listen(port, () => {
  console.log(`\n🚀 Server is running at http://localhost:${port}`);
  console.log(`📡 Test route: http://localhost:${port}/api/test`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
  console.log(`👥 User routes: http://localhost:${port}/api/users/*`);
  console.log(`📝 Quiz routes: http://localhost:${port}/api/quizzes/*\n`);
});

// Export io for use in controllers if needed
module.exports = { io };
