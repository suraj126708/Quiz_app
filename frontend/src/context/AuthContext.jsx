import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import axios from 'axios';

const AuthContext = createContext();

// API URL - Uses environment variable
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Track if we're currently logging in/registering to prevent race conditions

  // Create user in backend after Firebase registration
  const createUserInBackend = async (firebaseUser, role, studentClass = null) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const url = `${API_URL}/users/create`;
      console.log('📡 Calling backend API:', url);
      console.log('📡 Request data:', {
        firebaseUID: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        role,
        class: studentClass,
      });
      
      const response = await axios.post(
        url,
        {
          firebaseUID: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          role,
          class: studentClass,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('✅ Backend response:', response.status, response.data);
      
      // If user already exists, check if role matches
      if (response.status === 200 && response.data.message === "User already exists") {
        if (response.data.user.role !== role) {
          throw new Error(`User already exists with role: ${response.data.user.role}. Cannot register as ${role}.`);
        }
        // User exists with same role - this is okay
        return response.data.user;
      }
      
      return response.data.user;
    } catch (error) {
      console.error('❌ Error creating user in backend:');
      console.error('   URL:', `${API_URL}/users/create`);
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Error Message:', error.message);
      console.error('   Response Data:', error.response?.data);
      console.error('   Full Error:', error);
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          throw new Error(`Backend server not found. Please make sure the backend is running on ${API_URL.replace('/api', '')}. Error: ${error.response.data?.message || 'Route not found'}`);
        }
        if (error.response.data?.message) {
          throw new Error(error.response.data.message);
        }
        throw new Error(`Backend error: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`Cannot connect to backend server at ${API_URL.replace('/api', '')}. Please make sure the backend is running.`);
      } else {
        // Error in request setup
        throw new Error(`Request error: ${error.message}`);
      }
    }
  };

  // Register user
  const register = async (email, password, name, role, studentClass = null) => {
    setIsAuthenticating(true);
    let firebaseUser = null;
    let firebaseUserCreated = false;
    try {
      console.log('🔐 Starting registration for:', email, 'with role:', role);
      
      // Try to create user in Firebase
      // If user already exists in Firebase, sign in to get the user object
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        firebaseUserCreated = true;
        console.log('✅ Firebase user created:', firebaseUser.uid);

        // Update display name using updateProfile function from firebase/auth
        try {
          await updateProfile(firebaseUser, { displayName: name });
          console.log('✅ Display name updated:', name);
        } catch (updateError) {
          console.warn('⚠️ Could not update display name:', updateError.message);
          // Continue even if display name update fails
        }
      } catch (firebaseError) {
        // If user already exists in Firebase, sign in to get the user object
        if (firebaseError.code === 'auth/email-already-in-use') {
          console.log('ℹ️ User already exists in Firebase, signing in...');
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            firebaseUser = userCredential.user;
            firebaseUserCreated = false;
            console.log('✅ Signed in to existing Firebase user:', firebaseUser.uid);
            
            // Update display name if needed using updateProfile function
            if (!firebaseUser.displayName) {
              try {
                await updateProfile(firebaseUser, { displayName: name });
                console.log('✅ Display name updated:', name);
              } catch (updateError) {
                console.warn('⚠️ Could not update display name:', updateError.message);
                // Continue even if display name update fails
              }
            }
          } catch (signInError) {
            console.error('❌ Error signing in to existing Firebase user:', signInError);
            throw new Error('User already exists. Please login instead.');
          }
        } else {
          throw firebaseError;
        }
      }

      // Get ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Create user in MongoDB backend
      try {
        const backendResponse = await createUserInBackend(firebaseUser, role, studentClass);
        console.log('✅ User created/updated in MongoDB with role:', backendResponse.role);
        console.log('📝 MongoDB user data:', backendResponse);
      } catch (backendError) {
        console.error('❌ Backend user creation failed:', backendError.message);
        
        // If we created a new Firebase user but MongoDB creation failed, delete Firebase user
        if (firebaseUserCreated) {
          try {
            await firebaseUser.delete();
            console.log('🗑️ Firebase user deleted due to backend error');
          } catch (deleteError) {
            console.error('Error deleting Firebase user:', deleteError);
          }
        }
        throw backendError;
      }

      // Store token for axios interceptor
      localStorage.setItem('firebaseToken', idToken);

      // Get ID token and fetch user data from backend
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const backendRole = response.data.role;
      
      console.log('🔐 Registration successful - User:', email);
      console.log('🔐 Requested role:', role);
      console.log('🔐 Role from backend:', backendRole);
      console.log('🔐 Full user data from backend:', response.data);
      
      // Verify role matches what was requested
      if (backendRole !== role) {
        console.error('⚠️ CRITICAL: Role mismatch! Expected:', role, 'Got:', backendRole);
        console.error('⚠️ This indicates a database issue - user may have been created with wrong role');
        // Still proceed, but log the error
      }
      
      const userData = {
        ...firebaseUser,
        ...response.data,
      };
      
      // Set user and role state immediately
      setUser(userData);
      setUserRole(backendRole);
      
      // Wait a bit to ensure state is updated and prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsAuthenticating(false);
      return { success: true, userRole: backendRole };
    } catch (error) {
      setIsAuthenticating(false);
      console.error('❌ Registration error:', error.response?.data || error.message);
      // If Firebase user was created but backend failed, try to clean up
      if (firebaseUser && firebaseUserCreated && error.message && error.message.includes('already exists')) {
        try {
          await firebaseUser.delete();
          console.log('🗑️ Firebase user deleted due to existing user error');
        } catch (deleteError) {
          console.error('Error deleting Firebase user:', deleteError);
        }
      }
      return {
        success: false,
        message: error.message || error.response?.data?.message || 'Registration failed',
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    setIsAuthenticating(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get ID token
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('firebaseToken', idToken);
      
      // Try to get user profile from MongoDB
      let response;
      try {
        response = await axios.get(`${API_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch (profileError) {
        // If user doesn't exist in MongoDB (404), they need to complete registration
        if (profileError.response?.status === 404) {
          console.error('❌ User not found in MongoDB database');
          console.error('💡 This user exists in Firebase but not in MongoDB');
          console.error('💡 User needs to complete registration by selecting a role');
          
          // Sign out the user so they can register properly
          await firebaseSignOut(auth);
          localStorage.removeItem('firebaseToken');
          
          setIsAuthenticating(false);
          return {
            success: false,
            message: 'User not found in database. Please register first to select your role (teacher or student).',
            needsRegistration: true,
          };
        }
        // For other errors, throw them
        throw profileError;
      }

      const role = response.data.role;
      
      console.log('🔐 Login successful - User:', email);
      console.log('🔐 Role from backend:', role);
      console.log('🔐 Full user data from backend:', response.data);
      
      if (!role) {
        console.error('❌ CRITICAL: User exists in MongoDB but has no role!');
        setIsAuthenticating(false);
        return {
          success: false,
          message: 'User account is incomplete. Please contact support.',
        };
      }
      
      const userData = {
        ...firebaseUser,
        ...response.data,
      };
      
      // Set user and role state immediately
      setUser(userData);
      setUserRole(role);
      
      // Wait a bit to ensure state is updated and prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsAuthenticating(false);
      return { success: true, userRole: role };
    } catch (error) {
      setIsAuthenticating(false);
      console.error('❌ Login error:', error.response?.data || error.message);
      localStorage.removeItem('firebaseToken');
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed',
        needsRegistration: error.response?.status === 404,
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserRole(null);
      setPendingGoogleUser(null);
      setShowRoleSelection(false);
      localStorage.removeItem('firebaseToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (role = null, studentClass = null) => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Get ID token
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('firebaseToken', idToken);

      try {
        // Try to get user profile from backend
        const response = await axios.get(`${API_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        // User exists in backend
        const userData = {
          ...firebaseUser,
          ...response.data,
        };

        console.log('🔐 Google sign-in - User exists in backend with role:', response.data.role);

        // If a specific role was requested, verify it matches
        if (role && response.data.role !== role) {
          console.error('❌ Role mismatch for Google sign-in');
          await firebaseSignOut(auth);
          localStorage.removeItem('firebaseToken');
          return {
            success: false,
            message: `This account is registered as ${response.data.role}, not ${role}.`,
            needsRoleSelection: false,
          };
        }

        setUser(userData);
        setUserRole(response.data.role);
        return { success: true, userRole: response.data.role, needsRoleSelection: false };
      } catch (error) {
        // User doesn't exist in backend
        if (error.response?.status === 404 || error.response?.status === 401) {
          // If role is 'teacher', don't allow Google sign-in for new users
          if (role === 'teacher') {
            console.error('❌ Teachers cannot register via Google sign-in');
            await firebaseSignOut(auth);
            localStorage.removeItem('firebaseToken');
            return {
              success: false,
              message: 'Teacher account not found. Teachers must register with email/password first. After registration, you can use Google to sign in.',
              needsRoleSelection: false,
            };
          }

          // For students, allow creating new account via Google
          if (role === 'student') {
            if (!studentClass) {
              await firebaseSignOut(auth);
              localStorage.removeItem('firebaseToken');
              return {
                success: false,
                message: 'Class is required for student registration',
                needsRoleSelection: false,
              };
            }

            // Create student account
            try {
              await createUserInBackend(firebaseUser, 'student', studentClass);
              const response = await axios.get(`${API_URL}/users/profile`, {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              });

              const userData = {
                ...firebaseUser,
                ...response.data,
              };

              setUser(userData);
              setUserRole('student');
              return { success: true, userRole: 'student', needsRoleSelection: false };
            } catch (createError) {
              console.error('❌ Error creating student account:', createError);
              await firebaseSignOut(auth);
              localStorage.removeItem('firebaseToken');
              return {
                success: false,
                message: createError.message || 'Failed to create student account',
                needsRoleSelection: false,
              };
            }
          }

          // If no role specified, show role selection (but only allow student)
          setPendingGoogleUser(firebaseUser);
          setShowRoleSelection(true);
          return { success: true, needsRoleSelection: true };
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      localStorage.removeItem('firebaseToken');
      return {
        success: false,
        message: error.message || 'Google sign-in failed',
        needsRoleSelection: false,
      };
    }
  };

  // Complete Google sign-in with role selection
  const completeGoogleSignIn = async (role, studentClass = null) => {
    try {
      if (!pendingGoogleUser) {
        return { success: false, message: 'No pending user' };
      }

      try {
        await createUserInBackend(pendingGoogleUser, role, studentClass);
      } catch (error) {
        // If user creation fails due to existing user with different role
        if (error.message && error.message.includes('already exists with role')) {
          setShowRoleSelection(false);
          setPendingGoogleUser(null);
          // Sign out the user
          await firebaseSignOut(auth);
          return {
            success: false,
            message: error.message,
          };
        }
        throw error;
      }

      const idToken = await pendingGoogleUser.getIdToken();
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const userData = {
        ...pendingGoogleUser,
        ...response.data,
        role: response.data.role, // Use role from backend
      };

      setUser(userData);
      setUserRole(response.data.role);
      setShowRoleSelection(false);
      setPendingGoogleUser(null);

      return { success: true, userRole: response.data.role };
    } catch (error) {
      console.error('Error completing Google sign-in:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Registration failed',
      };
    }
  };

  // Get ID token for API calls
  const getIdToken = async () => {
    try {
      // Get the current Firebase user from auth state
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        // Update stored token
        localStorage.setItem('firebaseToken', idToken);
        return idToken;
      }
      
      // Fallback: try to get from localStorage if available
      const storedToken = localStorage.getItem('firebaseToken');
      if (storedToken) {
        return storedToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip if we're in the middle of login/register to prevent race conditions
      if (isAuthenticating) {
        console.log('⏸️ Skipping auth state change - authentication in progress');
        return;
      }

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          
          // Store token for axios interceptor
          localStorage.setItem('firebaseToken', idToken);
          
          // Only fetch profile if we don't already have user data for this user
          // This prevents overriding role that was just set during login/register
          if (!user || !user.uid || user.uid !== firebaseUser.uid) {
            console.log('🔐 Fetching user profile from backend...');
            try {
              const response = await axios.get(`${API_URL}/users/profile`, {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              });

              const userData = {
                ...firebaseUser,
                ...response.data,
              };
              
              console.log('🔐 Auth state changed - User:', userData.email, 'Role:', response.data.role);
              
              if (response.data.role) {
                setUser(userData);
                setUserRole(response.data.role);
              } else {
                console.error('❌ User exists in MongoDB but has no role!');
                // User exists but has no role - sign them out
                await firebaseSignOut(auth);
                setUser(null);
                setUserRole(null);
                localStorage.removeItem('firebaseToken');
              }
            } catch (profileError) {
              // If user doesn't exist in MongoDB (404), log it but don't clear user yet
              // Let the login/register flow handle it
              if (profileError.response?.status === 404) {
                console.error('❌ User not found in MongoDB database');
                console.error('💡 User exists in Firebase but not in MongoDB');
                console.error('💡 User needs to complete registration');
                // Don't set user - they need to register properly
                setUser(null);
                setUserRole(null);
                localStorage.removeItem('firebaseToken');
              } else {
                console.error('❌ Error fetching user profile:', profileError.response?.data?.message || profileError.message);
                // For other errors, don't clear user - might be temporary
                if (profileError.response?.status === 403) {
                  setUser(null);
                  setUserRole(null);
                  localStorage.removeItem('firebaseToken');
                }
              }
            }
          } else {
            console.log('🔐 User data already loaded, skipping profile fetch');
          }
        } catch (error) {
          // If user doesn't exist in backend and we have a pending Google user, don't clear
          // The role selection modal will handle it
          if (error.response?.status === 404 || error.response?.status === 401) {
            // Don't clear user if it's already a pending Google user
            if (!pendingGoogleUser) {
              console.error('❌ Error fetching user profile:', error.response?.data?.message || error.message);
              setUser(null);
              setUserRole(null);
              localStorage.removeItem('firebaseToken');
            }
          } else {
            console.error('❌ Error fetching user profile:', error.response?.data?.message || error.message);
            // Don't clear user on other errors - might be temporary
            // Only clear if it's a critical error
            if (error.response?.status === 403) {
              setUser(null);
              setUserRole(null);
              localStorage.removeItem('firebaseToken');
            }
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
        setPendingGoogleUser(null);
        setShowRoleSelection(false);
        localStorage.removeItem('firebaseToken');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [pendingGoogleUser, user, isAuthenticating]);

  const value = {
    user,
    userRole,
    loading,
    register,
    login,
    logout,
    signInWithGoogle,
    completeGoogleSignIn,
    getIdToken,
    isTeacher: userRole === 'teacher',
    isStudent: userRole === 'student',
    showRoleSelection,
    setShowRoleSelection,
    pendingGoogleUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

