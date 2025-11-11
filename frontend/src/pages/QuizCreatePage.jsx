import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createQuiz } from '../api/quizApi';

const QuizCreatePage = () => {
  const navigate = useNavigate();
  const { user, getIdToken, isTeacher } = useAuth();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [quizClass, setQuizClass] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [isLive, setIsLive] = useState(false);
  const [questions, setQuestions] = useState([
    {
      questionText: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      explanation: '',
      points: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  if (!isTeacher) {
    navigate('/dashboard');
    return null;
  }

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        explanation: '',
        points: 1,
      },
    ]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleAddOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...questions];
    if (field === 'isCorrect') {
      // Ensure only one option can be correct per question
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optionIndex ? value : false,
      }));
    } else {
      newQuestions[questionIndex].options[optionIndex][field] = value;
    }
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (indexToRemove) => {
    setQuestions(questions.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveOption = (questionIndex, optionIndexToRemove) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, index) => index !== optionIndexToRemove
    );
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    // Validation
    if (!quizTitle.trim() || !subject.trim() || !quizClass.trim()) {
      setMessage('Title, subject, and class are required');
      setIsError(true);
      setLoading(false);
      return;
    }

    if (questions.length === 0) {
      setMessage('A quiz must have at least one question');
      setIsError(true);
      setLoading(false);
      return;
    }

    for (const q of questions) {
      if (!q.questionText.trim()) {
        setMessage('All questions must have text');
        setIsError(true);
        setLoading(false);
        return;
      }
      if (q.options.length < 2) {
        setMessage('Each question must have at least two options');
        setIsError(true);
        setLoading(false);
        return;
      }
      if (!q.options.some((opt) => opt.isCorrect)) {
        setMessage(`Question "${q.questionText}" needs a correct answer selected`);
        setIsError(true);
        setLoading(false);
        return;
      }
      for (const opt of q.options) {
        if (!opt.text.trim()) {
          setMessage(`All options for question "${q.questionText}" must have text`);
          setIsError(true);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const idToken = await getIdToken();
      const quizData = {
        title: quizTitle,
        description: quizDescription,
        subject,
        class: quizClass,
        timeLimitMinutes: timeLimit ? parseInt(timeLimit) : null,
        difficulty,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          explanation: q.explanation,
          points: q.points,
        })),
        isLive,
      };

      await createQuiz(quizData, idToken);
      setMessage('Quiz created successfully!');
      setIsError(false);

      // Reset form
      setQuizTitle('');
      setQuizDescription('');
      setSubject('');
      setQuizClass('');
      setTimeLimit('');
      setDifficulty('Medium');
      setIsLive(false);
      setQuestions([
        {
          questionText: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
          explanation: '',
          points: 1,
        },
      ]);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error creating quiz:', error);
      setMessage(error.response?.data?.message || error.message || 'Failed to create quiz');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-2xl">
        <header className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create New Quiz</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-md hover:bg-gray-300 transition"
          >
            ← Back to Dashboard
          </button>
        </header>

        {message && (
          <div
            className={`p-4 mb-6 rounded-lg text-sm ${
              isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Details */}
          <section className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">Quiz Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Quiz Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Math Quiz Chapter 5"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Description</label>
                <textarea
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the quiz"
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Class 10A"
                    value={quizClass}
                    onChange={(e) => setQuizClass(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Time Limit (minutes)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Difficulty</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLive}
                      onChange={(e) => setIsLive(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">Make Live</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Questions Section */}
          <section className="p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Questions</h2>
            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="p-5 border border-green-200 rounded-lg bg-white space-y-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold text-green-700">Question {qIndex + 1}</h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-red-500 hover:text-red-700 transition text-sm"
                    >
                      Remove Question
                    </button>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Type the question here"
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Options <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            className="flex-grow p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                            placeholder={`Option ${oIndex + 1} text`}
                            value={option.text}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                            required
                          />
                          <input
                            type="radio"
                            name={`correctAnswer-${qIndex}`}
                            checked={option.isCorrect}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                            className="form-radio text-green-600 h-4 w-4"
                          />
                          <label className="text-gray-600 text-sm">Correct</label>
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(qIndex, oIndex)}
                              className="text-red-400 hover:text-red-600 transition text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIndex)}
                      className="mt-3 bg-yellow-500 text-white text-sm py-1.5 px-3 rounded-md hover:bg-yellow-600 transition"
                    >
                      Add Option
                    </button>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Explanation (Optional)</label>
                    <textarea
                      rows="2"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      placeholder="Explain the correct answer for students"
                      value={question.explanation}
                      onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Points</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:bg-purple-700 transition"
              >
                ➕ Add Another Question
              </button>
            </div>
          </section>

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-xl hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Quiz...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizCreatePage;

