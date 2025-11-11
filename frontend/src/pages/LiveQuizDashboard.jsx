import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuiz, getLeaderboard, toggleLiveStatus } from '../api/quizApi';
import { io } from 'socket.io-client';

const LiveQuizDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken, isTeacher } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchQuiz();
    fetchLeaderboard();

    // Set up Socket.io connection for real-time updates
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('join-quiz', id);

    newSocket.on('leaderboard-update', (data) => {
      if (data.quizId === id) {
        fetchLeaderboard();
      }
    });

    // Fetch leaderboard periodically
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 3000); // Update every 3 seconds

    return () => {
      newSocket.emit('leave-quiz', id);
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, [id]);

  const fetchQuiz = async () => {
    try {
      const idToken = await getIdToken();
      const data = await getQuiz(id, idToken);
      setQuiz(data.quiz);
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const idToken = await getIdToken();
      const data = await getLeaderboard(id, idToken);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleToggleLive = async () => {
    try {
      const idToken = await getIdToken();
      await toggleLiveStatus(id, !quiz.isLive, idToken);
      fetchQuiz();
    } catch (error) {
      console.error('Error toggling live status:', error);
      alert('Error updating quiz status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Quiz not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{quiz.title}</h2>
              <p className="text-gray-600 mt-2">{quiz.description}</p>
              <div className="mt-2 flex space-x-4 text-sm text-gray-500">
                <span>Subject: {quiz.subject}</span>
                <span>Class: {quiz.class}</span>
                <span>Difficulty: {quiz.difficulty}</span>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span
                className={`px-4 py-2 rounded-lg font-semibold ${
                  quiz.isLive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {quiz.isLive ? '🔴 LIVE' : '⚫ Inactive'}
              </span>
              {isTeacher && (
                <button
                  onClick={handleToggleLive}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    quiz.isLive
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {quiz.isLive ? 'Stop Live' : 'Go Live'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No submissions yet. {quiz.isLive ? 'Waiting for students to submit...' : 'Quiz is not live.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={index}
                      className={index < 3 ? 'bg-yellow-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && <span className="text-2xl">🥇</span>}
                          {index === 1 && <span className="text-2xl">🥈</span>}
                          {index === 2 && <span className="text-2xl">🥉</span>}
                          <span className="ml-2 font-bold text-gray-900">{entry.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.studentClass}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.score} / {entry.maxScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveQuizDashboard;

