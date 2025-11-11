import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TeacherLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, user, userRole, logout } = useAuth();

  // Google sign-in for teachers (only works if teacher already registered with email/password)
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // For teachers, Google sign-in only works if they've already registered
      // We don't pass a role, so it will check if user exists in backend
      const result = await signInWithGoogle();
      if (result.success) {
        if (!result.needsRoleSelection) {
          if (result.userRole === 'teacher') {
            navigate('/dashboard');
          } else {
            setError('This account is not a teacher account. Teachers must register with email/password first.');
            await logout();
          }
        } else {
          setError('Teacher account not found. Please register with email/password first.');
          await logout();
        }
      } else {
        setError(result.message || 'Google sign-in failed. Please register with email/password first.');
      }
    } catch (error) {
      setError('Google sign-in failed. Please register with email/password first.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && userRole === 'teacher') {
      navigate('/dashboard');
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      // Wait for userRole to be set in context
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if user is teacher - use result.userRole first, then check context
      const role = result.userRole;
      console.log('🔐 Teacher login - Role from result:', role);
      
      if (role === 'teacher') {
        navigate('/dashboard');
      } else {
        setError(`This account is registered as ${role || 'unknown'}, not teacher. Please use the student login page.`);
        setLoading(false);
        // Sign out the user
        await logout();
      }
    } else {
      setError(result.message || 'Login failed');
      setLoading(false);
      
      // If user needs registration, redirect to register page
      if (result.needsRegistration) {
        setTimeout(() => {
          navigate("/register");
        }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Teacher Login</h2>
        <p className="text-center text-gray-600 mb-6">Access your teacher dashboard</p>

        {/* Info message about Google sign-in */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Teachers must register with email/password first. After registration, you can use Google to sign in.
          </p>
        </div>

        {/* Google Sign-In Button (only for existing teachers) */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={`w-full mb-4 py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 ${
            loading
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
          } transition`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{loading ? 'Signing in...' : 'Continue with Google (Registered teachers only)'}</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="teacher@example.com"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Your password"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } transition`}
          >
            {loading ? 'Logging in...' : 'Login as Teacher'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Register as Teacher
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-gray-600">
          Not a teacher?{' '}
          <button
            onClick={() => navigate('/login-student')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Student Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default TeacherLoginPage;

