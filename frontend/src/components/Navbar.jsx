import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, userRole, logout } = useAuth();

  return (
    <nav className="bg-indigo-700 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Home Button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="text-white text-2xl font-black tracking-widest uppercase hover:text-indigo-200 transition"
            >
              QuizApp
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-4 items-center">
            {user ? (
              <>
                <span className="text-indigo-200 py-2 px-3 flex items-center text-sm font-medium">
                  Welcome, <span className="font-bold ml-1">{user.name || user.email}</span>
                  <span className="ml-2 px-2 py-1 bg-indigo-600 rounded text-xs">
                    {userRole === 'teacher' ? 'Teacher' : 'Student'}
                  </span>
                </span>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-white hover:bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium transition duration-150"
                >
                  Dashboard
                </button>
                {userRole === 'teacher' && (
                  <button
                    onClick={() => navigate('/create-quiz')}
                    className="text-white hover:bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium transition duration-150"
                  >
                    Create Quiz
                  </button>
                )}
                <button
                  onClick={logout}
                  className="bg-white text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg text-sm font-bold shadow-md transition duration-150"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('login')}
                  className="text-white hover:bg-indigo-600 px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('register')}
                  className="bg-white text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

