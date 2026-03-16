import '../global.css';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/src/lib/colors';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConfig } from '@/src/hooks/useConfig';
import { useRoleRefresh } from '@/src/hooks/useRoleRefresh';

// Prevent auto-hide so we can control it after config loads
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes — matches widget refresh cycle
      retry: 2,
    },
  },
});

function RootLayout() {
  const colorScheme = useColorScheme();
  const { config, isLoading } = useConfig();
  const router = useRouter();
  const segments = useSegments();
  useRoleRefresh();

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // SC1.3: hide native splash once config resolves
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // SC1.1 + SC1.2: auth gate — redirect after config resolves
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!config?.setupComplete && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (config?.setupComplete && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, config, segments, router]);

  // SC1.3: overlay while config or fonts load
  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.violet} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayout />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
