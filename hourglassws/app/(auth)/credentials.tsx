// FR3: Credentials screen — email + password form with validation
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/src/contexts/OnboardingContext';

export default function CredentialsScreen() {
  const router = useRouter();
  const { submitCredentials, isLoading, error, step } = useOnboarding();

  // Navigate when step transitions away from credentials
  useEffect(() => {
    if (step === 'verifying') {
      router.push('/(auth)/verifying');
    }
  }, [step]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function validate(): boolean {
    let valid = true;
    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  }

  async function handleSignIn() {
    if (!validate()) return;
    await submitCredentials(email.trim(), password);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your Crossover credentials</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@crossover.com"
          placeholderTextColor="#484F58"
          editable={!isLoading}
        />
        {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

        <Text style={[styles.label, { marginTop: 20 }]}>Password</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#484F58"
          editable={!isLoading}
        />
        {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

        <Text style={styles.forgotNote}>
          Forgot your password? Reset it at crossover.com
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.cta, isLoading && styles.ctaDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0D1117" />
        ) : (
          <Text style={styles.ctaText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', padding: 24, justifyContent: 'space-between' },
  header: { marginTop: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#8B949E', marginTop: 6 },
  errorBanner: { backgroundColor: '#3D1A1A', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#F85149' },
  errorBannerText: { color: '#F85149', fontSize: 14 },
  form: { flex: 1, marginTop: 24 },
  label: { fontSize: 13, color: '#8B949E', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#30363D', borderRadius: 8, padding: 14, fontSize: 16, color: '#FFFFFF', backgroundColor: '#161B22' },
  inputError: { borderColor: '#F85149' },
  fieldError: { color: '#F85149', fontSize: 12, marginTop: 4 },
  forgotNote: { color: '#484F58', fontSize: 12, marginTop: 12 },
  cta: { backgroundColor: '#00FF88', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#0D1117' },
});
