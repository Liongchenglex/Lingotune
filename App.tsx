import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import LoadingScreen from './src/components/LoadingScreen';

type AuthScreen = 'login' | 'signup' | 'forgot-password';

function AppContent() {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  if (loading) {
    return <LoadingScreen />;
  }

  // If user is authenticated, show Home screen
  if (user) {
    return (
      <>
        <HomeScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  // Show appropriate auth screen based on state
  return (
    <>
      {authScreen === 'login' && (
        <LoginScreen
          onSignUpPress={() => setAuthScreen('signup')}
          onForgotPasswordPress={() => setAuthScreen('forgot-password')}
        />
      )}
      {authScreen === 'signup' && (
        <SignUpScreen onLoginPress={() => setAuthScreen('login')} />
      )}
      {authScreen === 'forgot-password' && (
        <ForgotPasswordScreen onBackToLogin={() => setAuthScreen('login')} />
      )}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
