import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import MainNavigator from './src/navigation/MainNavigator';
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

  // If user is authenticated, show main app with onboarding flow
  if (user) {
    return (
      <OnboardingProvider>
        <MainNavigator />
        <StatusBar style="auto" />
      </OnboardingProvider>
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
