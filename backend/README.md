# Backend API - Quiz Application

## Project Structure

```
backend/
├── config/           # Configuration files
│   ├── db.js         # MongoDB connection
│   └── firebaseAdmin.js  # Firebase Admin SDK setup
├── controllers/      # Request handlers
│   ├── userController.js
│   └── quizController.js
├── middleware/       # Custom middleware
│   └── authMiddleware.js
├── routes/          # API routes
│   ├── userRoutes.js
│   └── quizRoutes.js
├── utils/           # Utility functions
│   ├── logger.js
│   └── validators.js
├── server.js        # Express server entry point
├── package.json
└── .env.example
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=quizapp
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-private-key
PORT=5000
FRONTEND_URL=http://localhost:5173
```

3. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Users
- `POST /api/users/create` - Create user (after Firebase auth)
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users/all` - Get all users (teacher only)

### Quizzes
- `POST /api/quizzes` - Create quiz (teacher only)
- `GET /api/quizzes` - Get all quizzes (with filters)
- `GET /api/quizzes/:id` - Get single quiz
- `PUT /api/quizzes/:id` - Update quiz (teacher only)
- `PATCH /api/quizzes/:id/live` - Toggle live status (teacher only)
- `POST /api/quizzes/:id/submit` - Submit quiz (student only)
- `GET /api/quizzes/:id/leaderboard` - Get leaderboard
- `DELETE /api/quizzes/:id` - Delete quiz (teacher only)

## Architecture

- **Config**: Database and Firebase configuration
- **Controllers**: Business logic and request handling
- **Middleware**: Authentication and authorization
- **Routes**: API endpoint definitions
- **Utils**: Helper functions and utilities

