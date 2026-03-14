// FR6: Success screen — confirm onboarding complete, persist credentials, navigate to tabs
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { saveConfig, saveCredentials } from '@/src/store/config';
import { springBouncy } from '@/src/lib/reanimated-presets';

export default function SuccessScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pendingConfig, pendingCredentials } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fullName = pendingConfig?.fullName ?? '';
  const isManager = pendingConfig?.isManager ?? false;
  const hourlyRate = pendingConfig?.hourlyRate ?? 0;

  // SpringBouncy scale entrance for the checkmark icon
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springBouncy);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // SC7.4: both writes must succeed before navigation (SC7.5)
  async function handleGoToDashboard() {
    if (saving || !pendingConfig || !pendingCredentials) return;
    setSaving(true);
    setSaveError(null);
    try {
      const finalConfig = { ...pendingConfig, setupComplete: true };
      await saveCredentials(pendingCredentials.username, pendingCredentials.password);
      await saveConfig(finalConfig);
      // Update React Query cache immediately so auth gate sees setupComplete: true
      queryClient.setQueryData(['config'], finalConfig);
      router.replace('/(tabs)');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-12 pb-4 justify-between">
        {/* Body */}
        <View className="flex-1 items-center justify-center gap-4">
          {/* Checkmark — springBouncy scale entrance */}
          <Animated.View style={iconStyle}>
            <Text className="font-display-bold text-6xl text-success">✓</Text>
          </Animated.View>

          <Text className="font-display-bold text-3xl text-textPrimary mt-2 text-center">
            {fullName}
          </Text>
          <Text className="font-body text-base text-textSecondary">
            {isManager ? 'Manager' : 'Contributor'}
          </Text>
          <Text className="font-display-semibold text-2xl text-gold">
            ${hourlyRate} / hr
          </Text>
        </View>

        {/* Error banner */}
        {saveError ? (
          <View className="bg-surface border border-critical rounded-xl p-4 mb-4">
            <Text className="font-sans text-sm text-critical">{saveError}</Text>
          </View>
        ) : null}

        {/* Go to Dashboard CTA */}
        <TouchableOpacity
          className={`bg-gold rounded-xl py-4 items-center mb-4 ${saving ? 'opacity-60' : ''}`}
          onPress={handleGoToDashboard}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#8B949E" />
          ) : (
            <Text className="font-sans-semibold text-base text-background">Go to Dashboard</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
