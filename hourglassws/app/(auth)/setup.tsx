// FR6: Setup screen — manual rate fallback when auto-detect fails
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/src/contexts/OnboardingContext';

export default function SetupScreen() {
  const router = useRouter();
  const { submitRate, isLoading, error, step } = useOnboarding();
  const [rateText, setRateText] = useState('');
  const [rateError, setRateError] = useState('');

  useEffect(() => {
    if (step === 'success') {
      router.replace('/(auth)/success');
    }
  }, [step]);

  async function handleContinue() {
    Keyboard.dismiss();
    const rate = parseFloat(rateText);
    if (!rateText || !rate || rate <= 0) {
      setRateError('Please enter a valid hourly rate greater than 0');
      return;
    }
    setRateError('');
    await submitRate(rate);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Set Your Rate</Text>
          <Text style={styles.subtitle}>
            We couldn't detect your rate automatically. Please enter it below.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Your hourly rate (USD)</Text>
          {/* Done toolbar above numeric keypad */}
          <View style={styles.doneBar}>
            <TouchableOpacity onPress={Keyboard.dismiss}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, rateError ? styles.inputError : null]}
            value={rateText}
            onChangeText={setRateText}
            keyboardType="decimal-pad"
            placeholder="e.g. 50"
            placeholderTextColor="#484F58"
            editable={!isLoading}
            onSubmitEditing={handleContinue}
          />
          {rateError ? <Text style={styles.fieldError}>{rateError}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.cta, isLoading && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#0D1117" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D1117' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'space-between', paddingBottom: 40 },
  header: { marginTop: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#8B949E', marginTop: 8 },
  errorBanner: { backgroundColor: '#3D1A1A', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#F85149', marginTop: 16 },
  errorBannerText: { color: '#F85149', fontSize: 14 },
  form: { flex: 1, marginTop: 24 },
  label: { fontSize: 13, color: '#8B949E', marginBottom: 6 },
  doneBar: { alignItems: 'flex-end', marginBottom: 4 },
  doneText: { color: '#00FF88', fontSize: 16, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 8 },
  input: { borderWidth: 1, borderColor: '#30363D', borderRadius: 8, padding: 14, fontSize: 20, color: '#FFFFFF', backgroundColor: '#161B22' },
  inputError: { borderColor: '#F85149' },
  fieldError: { color: '#F85149', fontSize: 12, marginTop: 4 },
  cta: { backgroundColor: '#00FF88', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#0D1117' },
});
