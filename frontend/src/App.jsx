import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import QuizCreatePage from './pages/QuizCreatePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import TeacherLoginPage from './pages/TeacherLoginPage';
import StudentLoginPage from './pages/StudentLoginPage';
import QuizTakePage from './pages/QuizTakePage';
import LiveQuizDashboard from './pages/LiveQuizDashboard';
import RoleSelectionModal from './components/RoleSelectionModal';
import { useAuth } from './context/AuthContext';

const AppContent = () => {
  const { user, userRole, showRoleSelection, setShowRoleSelection, pendingGoogleUser, completeGoogleSignIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelection = async (role, studentClass) => {
    const result = await completeGoogleSignIn(role, studentClass);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleCloseRoleModal = async () => {
    setShowRoleSelection(false);
    // Sign out the user if they cancel role selection
    if (pendingGoogleUser) {
      await logout();
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-64px)]">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/login-teacher" element={user ? <Navigate to="/dashboard" replace /> : <TeacherLoginPage />} />
          <Route path="/login-student" element={user ? <Navigate to="/dashboard" replace /> : <StudentLoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/create-quiz"
            element={
              user && userRole === 'teacher' ? (
                <QuizCreatePage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/take-quiz/:id"
            element={
              user && userRole === 'student' ? (
                <QuizTakePage />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/live-quiz/:id"
            element={user ? <LiveQuizDashboard /> : <Navigate to="/login" replace />}
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </main>

      {/* Role Selection Modal for Google Sign-In */}
      <RoleSelectionModal
        isOpen={showRoleSelection}
        onClose={handleCloseRoleModal}
        onSelectRole={handleRoleSelection}
        userEmail={pendingGoogleUser?.email || ''}
        userName={pendingGoogleUser?.displayName || ''}
      />
    </>
  );
};

const App = () => {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

