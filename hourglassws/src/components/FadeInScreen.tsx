/**
 * FadeInScreen — fades tab screen content in when the tab becomes focused.
 * Wrap the root element of each tab screen with this component.
 */

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface FadeInScreenProps {
  children: React.ReactNode;
}

export default function FadeInScreen({ children }: FadeInScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  return (
    <Animated.View style={[{ flex: 1 }, { opacity }]}>
      {children}
    </Animated.View>
  );
}
