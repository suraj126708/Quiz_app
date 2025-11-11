import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuizzes } from '../api/quizApi';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, getIdToken, isTeacher, isStudent } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: '',
    class: '',
    isLive: undefined,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Wait for userRole to be loaded
    if (!userRole) {
      console.log('⏳ Waiting for user role...');
      return;
    }

    console.log('🔐 Dashboard - Current user role:', userRole);
    console.log('🔐 Dashboard - isTeacher:', isTeacher, 'isStudent:', isStudent);
    
    fetchQuizzes();
  }, [user, userRole, filters, navigate, isTeacher, isStudent]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();
      const data = await getQuizzes(filters, idToken);
      setQuizzes(data.quizzes || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  // Show loading if userRole is not yet loaded
  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Welcome, {user.name || user.email}!
        </h1>

        {isTeacher && (
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold text-yellow-700 mb-4">Teacher Tools</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/create-quiz')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
              >
                Create New Quiz
              </button>
              <button
                onClick={() => setFilters({ ...filters, isLive: true })}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                View Live Quizzes
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Filter by subject"
              />
            </div>
            {isTeacher && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input
                  type="text"
                  value={filters.class}
                  onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Filter by class"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.isLive === undefined ? 'all' : filters.isLive ? 'live' : 'inactive'}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({
                    ...filters,
                    isLive: value === 'all' ? undefined : value === 'live',
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {isTeacher ? 'All Quizzes' : 'Available Quizzes'}
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No quizzes found. {isTeacher && 'Create your first quiz!'}
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800">{quiz.title}</h3>
                      <p className="text-gray-600 mt-1">{quiz.description}</p>
                      <div className="flex space-x-4 mt-2">
                        <span className="text-sm text-gray-500">Subject: {quiz.subject}</span>
                        <span className="text-sm text-gray-500">Class: {quiz.class}</span>
                        <span className="text-sm text-gray-500">Difficulty: {quiz.difficulty}</span>
                        {quiz.isLive && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isStudent && quiz.isLive && (
                        <button
                          onClick={() => navigate(`/take-quiz/${quiz.id}`)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                          Take Quiz
                        </button>
                      )}
                      {isTeacher && (
                        <>
                          {quiz.isLive && (
                            <button
                              onClick={() => navigate(`/live-quiz/${quiz.id}`)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                              View Live
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

