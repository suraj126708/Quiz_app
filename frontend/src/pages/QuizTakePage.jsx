import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuiz, submitQuiz } from '../api/quizApi';

const QuizTakePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken, isStudent } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isStudent) {
      navigate('/dashboard');
      return;
    }

    fetchQuiz();
  }, [id, isStudent, navigate]);

  useEffect(() => {
    if (quiz && quiz.timeLimitMinutes) {
      const totalSeconds = quiz.timeLimitMinutes * 60;
      setTimeRemaining(totalSeconds);

      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const idToken = await getIdToken();
      const data = await getQuiz(id, idToken);
      setQuiz(data.quiz);
      // Initialize answers array
      setAnswers(
        data.quiz.questions.map((q, index) => ({
          questionIndex: index,
          selectedOptionIndex: null,
        }))
      );
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Error loading quiz');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, optionIndex) => {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = {
        questionIndex,
        selectedOptionIndex: optionIndex,
      };
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Check if all questions are answered
    const unanswered = answers.filter((a) => a.selectedOptionIndex === null);
    if (unanswered.length > 0) {
      if (
        !window.confirm(
          `You have ${unanswered.length} unanswered questions. Submit anyway?`
        )
      ) {
        return;
      }
    }

    try {
      setSubmitting(true);
      const idToken = await getIdToken();
      const data = await submitQuiz(id, answers, idToken);
      setResult(data);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert(error.response?.data?.message || 'Error submitting quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Quiz Results</h2>
          <div className="mb-6">
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {result.score} / {result.maxScore}
            </div>
            <div className="text-2xl text-gray-600">
              {result.percentage}% Correct
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-xl font-semibold">Question Review</h3>
            {result.results.map((r, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  r.isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p className="font-semibold mb-2">{r.questionText}</p>
                <p className="text-sm text-gray-600">
                  Your answer: Option {r.userAnswer !== null ? r.userAnswer + 1 : 'Not answered'}
                </p>
                <p className="text-sm text-gray-600">
                  Correct answer: Option {r.correctAnswer + 1}
                </p>
                {r.explanation && (
                  <p className="text-sm text-gray-700 mt-2 italic">
                    Explanation: {r.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{quiz.title}</h2>
            <p className="text-gray-600 mt-2">{quiz.description}</p>
          </div>
          {timeRemaining !== null && (
            <div className="text-2xl font-bold text-red-600">
              Time: {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {quiz.questions.map((question, qIndex) => (
            <div key={qIndex} className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Question {qIndex + 1}: {question.questionText}
              </h3>
              <div className="space-y-2">
                {question.options.map((option, oIndex) => (
                  <label
                    key={oIndex}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                      answers[qIndex]?.selectedOptionIndex === oIndex
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={answers[qIndex]?.selectedOptionIndex === oIndex}
                      onChange={() => handleAnswerChange(qIndex, oIndex)}
                      className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizTakePage;

