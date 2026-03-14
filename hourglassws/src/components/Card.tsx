// Card.tsx
// FR1: NativeWind surface container with elevated variant (03-base-components)
//
// Design system rule: Cards use bg-surface rounded-2xl border border-border p-5.
// Elevated variant (modals, active state) uses bg-surfaceElevated.
// No StyleSheet.create — NativeWind className only.

import React from 'react';
import { View } from 'react-native';

interface CardProps {
  /** Use bg-surfaceElevated instead of bg-surface (for modals, active cards) */
  elevated?: boolean;
  /** Additional NativeWind classes appended to base classes */
  className?: string;
  children: React.ReactNode;
}

export default function Card({ elevated, className, children }: CardProps): JSX.Element {
  const base = elevated
    ? 'bg-surfaceElevated rounded-2xl border border-border p-5'
    : 'bg-surface rounded-2xl border border-border p-5';
  const combined = className ? `${base} ${className}` : base;

  return (
    <View className={combined}>
      {children}
    </View>
  );
}
