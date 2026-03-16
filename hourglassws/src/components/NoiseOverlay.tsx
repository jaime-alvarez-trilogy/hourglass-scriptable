// NoiseOverlay.tsx
// FR4 (05-panel-glass-surfaces): Tileable noise texture overlay
//
// Design system rule (BRAND_GUIDELINES.md v1.1 §Surface & Depth — Noise Texture):
//   Noise is applied once at root screen level only.
//   opacity: 0.04 — subtle texture, adds depth without drawing attention.
//   pointerEvents="none" — never intercepts touch events.
//
// Usage: Place inside the root screen View, after all content.
//   <View style={{ flex: 1 }}>
//     {/* screen content */}
//     <NoiseOverlay />
//   </View>

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function NoiseOverlay(): JSX.Element {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require('../../assets/images/noise.png')}
        style={styles.noise}
        resizeMode="repeat"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // pointerEvents set via prop above (StyleSheet doesn't support pointerEvents in RN <0.82)
  },
  noise: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
  },
});
