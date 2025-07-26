// src/components/TypingIndicator.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import colors from '../constants/colors';

const TypingIndicator = ({ participants = [] }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, []);

  if (participants.length === 0) return null;

  const names = participants.slice(0, 2).map(p => p.name).join(', ');
  const othersCount = participants.length - 2;
  const text = othersCount > 0 
    ? `${names} and ${othersCount} others are typing`
    : `${names} ${participants.length === 1 ? 'is' : 'are'} typing`;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{
                translateY: dot1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{
                translateY: dot2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              transform: [{
                translateY: dot3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              }],
            },
          ]}
        />
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginHorizontal: 2,
  },
  text: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
});

// ✅ IMPORTANT: Export the component!
export default TypingIndicator;