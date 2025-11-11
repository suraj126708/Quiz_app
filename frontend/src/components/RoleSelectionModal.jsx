import React, { useState } from 'react';

const RoleSelectionModal = ({ isOpen, onClose, onSelectRole, userEmail, userName }) => {
  const [role, setRole] = useState('student');
  const [studentClass, setStudentClass] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Only allow student role for Google sign-in
    if (role === 'teacher') {
      setError('Teachers must register with email/password first. After registration, you can use Google to sign in.');
      return;
    }

    if (role === 'student' && !studentClass.trim()) {
      setError('Please enter your class');
      return;
    }

    onSelectRole(role, role === 'student' ? studentClass : null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete Your Registration</h2>
        <p className="text-gray-600 mb-6">
          Welcome, <span className="font-semibold">{userName || userEmail}</span>! Please select your role to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-gray-700 font-medium mb-2">I am a:</label>
                 <div className="flex space-x-4">
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input
                       type="radio"
                       name="role"
                       value="student"
                       checked={role === 'student'}
                       onChange={(e) => setRole(e.target.value)}
                       className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                     />
                     <span className="text-gray-700">Student</span>
                   </label>
                   <label className="flex items-center space-x-2 cursor-not-allowed opacity-50">
                     <input
                       type="radio"
                       name="role"
                       value="teacher"
                       checked={role === 'teacher'}
                       onChange={(e) => setRole(e.target.value)}
                       disabled
                       className="w-4 h-4 text-gray-400"
                     />
                     <span className="text-gray-500">Teacher (Email/Password only)</span>
                   </label>
                 </div>
                 <p className="text-xs text-gray-500 mt-2">
                   Teachers must register with email/password first. After registration, you can use Google to sign in.
                 </p>
               </div>

          {role === 'student' && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Class</label>
              <input
                type="text"
                required
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Class 10A, Grade 12"
              />
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleSelectionModal;

