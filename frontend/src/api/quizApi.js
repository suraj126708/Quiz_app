import axios from './axiosConfig';

const API_URL = '/api/quizzes';

// Create quiz
export const createQuiz = async (quizData, idToken) => {
  const response = await axios.post(API_URL, quizData, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

// Get all quizzes
export const getQuizzes = async (filters = {}, idToken) => {
  const params = new URLSearchParams();
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.class) params.append('class', filters.class);
  if (filters.isLive !== undefined) params.append('isLive', filters.isLive);
  if (filters.createdBy) params.append('createdBy', filters.createdBy);

  const response = await axios.get(`${API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

// Get single quiz
export const getQuiz = async (quizId, idToken) => {
  const response = await axios.get(`${API_URL}/${quizId}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

// Update quiz
export const updateQuiz = async (quizId, updates, idToken) => {
  const response = await axios.put(`${API_URL}/${quizId}`, updates, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

// Toggle live status
export const toggleLiveStatus = async (quizId, isLive, idToken) => {
  const response = await axios.patch(
    `${API_URL}/${quizId}/live`,
    { isLive },
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );
  return response.data;
};

// Submit quiz
export const submitQuiz = async (quizId, answers, idToken) => {
  const response = await axios.post(
    `${API_URL}/${quizId}/submit`,
    { answers },
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );
  return response.data;
};

// Get leaderboard
export const getLeaderboard = async (quizId, idToken) => {
  const response = await axios.get(`${API_URL}/${quizId}/leaderboard`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

// Delete quiz
export const deleteQuiz = async (quizId, idToken) => {
  const response = await axios.delete(`${API_URL}/${quizId}`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return response.data;
};

