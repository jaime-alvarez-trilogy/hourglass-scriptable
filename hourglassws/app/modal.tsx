// modal.tsx
// FR3 (05-panel-glass-surfaces): BlurView dark glass surface
//
// Design system rule (BRAND_GUIDELINES.md v1.1 §Surface & Depth — Backdrop Blur):
//   Modals use BlurView intensity=30, tint="dark" wrapping content.
//   Inner View: surfaceElevated background at 0.85 opacity for legibility.
//   Fallback (expo-blur unavailable): solid surfaceElevated background.

import { View, Text, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAll, loadConfig, loadCredentials, saveConfig } from '@/src/store/config';
import { useConfig } from '@/src/hooks/useConfig';
import { colors } from '@/src/lib/colors';

export default function ModalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { config } = useConfig();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials().then((creds) => setUsername(creds?.username ?? null));
  }, []);

  const isMe = username === 'jalvarez0907@outlook.com';

  async function handleSignOut() {
    Alert.alert('Sign Out', 'This will clear your saved credentials and return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          queryClient.setQueryData(['config'], null);
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  async function toggleDevManagerView(value: boolean) {
    if (!config) return;
    const updated = { ...config, devManagerView: value };
    await saveConfig(updated);
    queryClient.setQueryData(['config'], updated);
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
    queryClient.invalidateQueries({ queryKey: ['myRequests'] });
  }

  async function toggleDevOvertimePreview(value: boolean) {
    if (!config) return;
    const updated = { ...config, devOvertimePreview: value };
    await saveConfig(updated);
    queryClient.setQueryData(['config'], updated);
    queryClient.invalidateQueries({ queryKey: ['hours'] });
  }

  return (
    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
      <View style={styles.overlay}>
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Settings</Text>

          {config && (
            <View style={styles.debugBox}>
              <Text style={styles.debugTitle}>Config Debug</Text>
              <Text style={styles.debugRow}>name: {config.fullName}</Text>
              <Text style={styles.debugRow}>userId: {config.userId}</Text>
              <Text style={styles.debugRow}>managerId: {config.managerId}</Text>
              <Text style={styles.debugRow}>teamId: {config.primaryTeamId}</Text>
              <Text style={styles.debugRow}>assignmentId: {config.assignmentId}</Text>
              <Text style={styles.debugRow}>rate: ${config.hourlyRate}/hr</Text>
              <Text style={styles.debugRow}>isManager: {String(config.isManager)}</Text>
              <Text style={styles.debugRow}>env: {config.useQA ? 'QA' : 'Production'}</Text>
            </View>
          )}

          {/* Dev options — always visible since this is a debug settings screen */}
          {config && isMe && (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>Dev Options</Text>
              {!config.isManager && (
                <>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Manager Preview</Text>
                    <Switch
                      value={config.devManagerView ?? false}
                      onValueChange={toggleDevManagerView}
                      trackColor={{ false: colors.border, true: colors.violet }}
                      thumbColor={colors.textPrimary}
                    />
                  </View>
                  <Text style={styles.toggleHint}>
                    Shows the Team Requests queue with fake pending approvals + fake My Requests (pending, approved, rejected).
                  </Text>
                </>
              )}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Overtime Preview</Text>
                <Switch
                  value={config.devOvertimePreview ?? false}
                  onValueChange={toggleDevOvertimePreview}
                  trackColor={{ false: colors.border, true: colors.violet }}
                  thumbColor={colors.textPrimary}
                />
              </View>
              <Text style={styles.toggleHint}>
                Forces the home screen hero to show the Overtime panel state (for UI testing).
              </Text>
            </View>
          )}

          <AnimatedPressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </AnimatedPressable>
        </ScrollView>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  // surfaceElevated overlay for legibility over blur
  overlay: {
    flex: 1,
    backgroundColor: colors.surfaceElevated + 'D9', // D9 = 0.85 opacity in hex (217/255)
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  debugBox: {
    backgroundColor: '#161B22',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FF88',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugRow: {
    fontSize: 13,
    color: '#8B949E',
    fontFamily: 'Courier',
  },
  devBox: {
    backgroundColor: '#161B22',
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
    gap: 4,
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C97A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    color: '#484F58',
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#F85149',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F85149',
  },
});
