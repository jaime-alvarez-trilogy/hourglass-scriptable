import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { clearAll } from '@/src/store/config';

export default function ModalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    Alert.alert('Sign Out', 'This will clear your saved credentials and return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          queryClient.setQueryData(['config'], null); // clear in-memory cache immediately
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    padding: 24,
    paddingTop: 40,
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
