import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig.js';
// Import functions 
import { getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  reload,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser         
} from 'firebase/auth';


// 1: SIGNUP FORM

const handleSignup = async (email: string, password: string, name: string) => {
  const result = await signup(email, password, name);
  
  if (result.success) {
    console.log('User created:', result.user);
    // Redirect to dashboard or show success message
  } else {
    console.error('Signup failed:', result.error);
    // Show error message to user
  }
};


// 2: LOGIN FORM

const handleLogin = async (email: string, password: string) => {
  const result = await login(email, password);
  
  if (result.success) {
    console.log('User logged in:', result.user);
    // Redirect to dashboard
  } else {
    console.error('Login failed:', result.error);
    // Show error message
  }
};


// 3: GOOGLE SIGN-IN BUTTON

const handleGoogleSignIn = async () => {
  const result = await signInWithGoogle();
  
  if (result.success) {
    console.log('Google sign-in successful:', result.user);
    
    if (result.isNewUser) {
      console.log('This is a new user - maybe show onboarding');
    } else {
      console.log('Existing user logged in');
    }
    
    // Redirect to dashboard
  } else {
    console.error('Google sign-in failed:', result.error);
    // Show error message
  }
};


// 4: LOGOUT BUTTON

const handleLogout = async () => {
  const result = await logout();
  
  if (result.success) {
    console.log('Logged out successfully');
    // Redirect to login page
  } else {
    console.error('Logout failed:', result.error);
  }
};


// 5: PASSWORD RESET

const handlePasswordReset = async (email: string) => {
  const result = await resetPassword(email);
  
  if (result.success) {
    console.log('Password reset email sent');
    // Show success message
  } else {
    console.error('Failed to send reset email:', result.error);
    // Show error message
  }
};


// 6: CHECK IF USER IS LOGGED IN (on page load)

const checkAuth = () => {
  const user = getCurrentUser();
  
  if (user) {
    console.log('User is logged in:', user);
    // Show dashboard
  } else {
    console.log('No user logged in');
    // Show login page
  }
};


// 7: LISTEN FOR AUTH CHANGES 

useEffect(() => {
  const unsubscribe = onAuthChange((user) => {
    if (user) {
      console.log('User state changed - logged in:', user);
      setCurrentUser(user); // Update your state
    } else {
      console.log('User state changed - logged out');
      setCurrentUser(null);
    }
  });
  
  
  return () => unsubscribe();
}, []);

// 8. EMAIL VERIFICATION (Send verification email)

import { sendEmailVerification } from 'firebase/auth';

export async function sendVerificationEmail() {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return { success: false, error: 'No user is currently logged in.' };
    }
    
    if (user.emailVerified) {
      return { success: false, error: 'Email is already verified.' };
    }
    
    await sendEmailVerification(user);
    console.log('✅ Verification email sent to:', user.email);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Email verification error:', error.message);
    return { success: false, error: 'Failed to send verification email.' };
  }
}

// 9. CHECK EMAIL VERIFICATION STATUS

export function isEmailVerified() {
  const user = auth.currentUser;
  return user ? user.emailVerified : false;
}



// 10. RELOAD USER (to refresh email verification status)

import { reload } from 'firebase/auth';

export async function refreshUser() {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user logged in.' };
    }
    
    await reload(user);
    console.log('✅ User data refreshed');
    
    return { 
      success: true, 
      emailVerified: user.emailVerified,
      error: null 
    };
  } catch (error) {
    console.error('❌ User refresh error:', error.message);
    return { success: false, error: 'Failed to refresh user data.' };
  }
}


// 11. CHANGE PASSWORD (for logged-in user)
// ============================================
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in.' };
    }
    
    // Re-authenticate user first (required for sensitive operations)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update to new password
    await updatePassword(user, newPassword);
    console.log('✅ Password changed successfully');
    
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Password change error:', error.message);
    
    let errorMessage = error.message;
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'New password should be at least 6 characters.';
    }
    
    return { success: false, error: errorMessage };
  }
}


// 12. DELETE USER ACCOUNT

import { deleteUser } from 'firebase/auth';

export async function deleteAccount(password) {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in.' };
    }
    
    // Re-authenticate before deletion
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    // Delete user
    await deleteUser(user);
    console.log('✅ User account deleted');
    
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Account deletion error:', error.message);
    
    let errorMessage = error.message;
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Password is incorrect.';
    }
    
    return { success: false, error: errorMessage };
  }
}
