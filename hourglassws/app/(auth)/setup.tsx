// FR5: Setup screen — manual rate fallback when auto-detect fails
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/src/contexts/OnboardingContext';

export default function SetupScreen() {
  const router = useRouter();
  const { submitRate, isLoading, error, step } = useOnboarding();
  const [rateText, setRateText] = useState('');
  const [rateError, setRateError] = useState('');
  const [rateFocused, setRateFocused] = useState(false);

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
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-4 pt-12 pb-4 justify-between" style={{ flexGrow: 1 }}>
          {/* Header */}
          <View className="mb-6">
            <Text className="font-display-semibold text-3xl text-textPrimary">Set Your Rate</Text>
            <Text className="font-body text-base text-textSecondary mt-2">
              We couldn't detect your rate automatically. Please enter it below.
            </Text>
          </View>

          {/* Error banner */}
          {error ? (
            <View className="bg-surface border border-critical rounded-xl p-4 mb-4">
              <Text className="font-sans text-sm text-critical">{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View className="flex-1 gap-1">
            <Text className="font-sans-medium text-sm text-textSecondary mb-1">
              Your hourly rate (USD)
            </Text>
            {/* Done toolbar above numeric keypad */}
            <View className="items-end mb-1">
              <TouchableOpacity onPress={Keyboard.dismiss} className="py-1 px-2">
                <Text className="font-sans-semibold text-base text-gold">Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className={`bg-surface border rounded-xl px-4 py-3 font-sans text-xl text-textPrimary ${
                rateError ? 'border-critical' : rateFocused ? 'border-gold' : 'border-border'
              }`}
              value={rateText}
              onChangeText={setRateText}
              keyboardType="decimal-pad"
              placeholder="e.g. 50"
              placeholderTextColor="#484F58"
              editable={!isLoading}
              onFocus={() => setRateFocused(true)}
              onBlur={() => setRateFocused(false)}
              onSubmitEditing={handleContinue}
            />
            {rateError ? (
              <Text className="font-sans text-sm text-critical mt-1">{rateError}</Text>
            ) : null}
          </View>

          {/* Continue CTA */}
          <TouchableOpacity
            className={`bg-gold rounded-xl py-4 items-center mt-8 ${isLoading ? 'opacity-60' : ''}`}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#8B949E" />
            ) : (
              <Text className="font-sans-semibold text-base text-background">Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
