import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/validation';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { resetPassword } = useAuth();

  const handleEmailBlur = () => {
    const result = validateEmail(email);
    setEmailError(result.isValid ? '' : result.error || '');
  };

  const handleResetPassword = async () => {
    // Validate email
    const emailResult = validateEmail(email);
    setEmailError(emailResult.isValid ? '' : emailResult.error || '');

    if (!emailResult.isValid) {
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setLoading(false);
      setEmailSent(true);

      // Show success message (always shown, even if email doesn't exist - prevents enumeration)
      Alert.alert(
        'Check Your Email',
        "If this email exists, you'll receive a password reset link.",
        [
          {
            text: 'OK',
            onPress: () => {
              // Keep user on this screen so they can resend if needed
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);

      // Map Firebase errors
      let errorMessage = "If this email exists, you'll receive a password reset link.";

      // Only show error for network issues
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Unable to send reset email. Check your connection.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      }

      // For security, we show success message for most errors
      if (error.code === 'auth/network-request-failed' || error.code === 'auth/invalid-email') {
        Alert.alert('Error', errorMessage);
      } else {
        // Still show success to prevent email enumeration
        setEmailSent(true);
        Alert.alert(
          'Check Your Email',
          errorMessage,
          [
            {
              text: 'OK',
            },
          ]
        );
      }
    }
  };

  const isFormValid = email.trim() !== '' && !emailError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
                setEmailSent(false);
              }}
              onBlur={handleEmailBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* Success Message */}
          {emailSent && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                ✓ If this email exists, you'll receive a reset link shortly
              </Text>
            </View>
          )}

          {/* Send Reset Link Button */}
          <TouchableOpacity
            style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {emailSent ? 'Resend Reset Link' : 'Send Reset Link'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity
            onPress={onBackToLogin}
            disabled={loading}
            style={styles.backToLoginContainer}
          >
            <Text style={styles.backToLoginText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F8',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D191C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#498E9C',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D191C',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#0D191C',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0DCCF2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginContainer: {
    alignSelf: 'center',
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 14,
    color: '#0DCCF2',
    fontWeight: '600',
  },
});
