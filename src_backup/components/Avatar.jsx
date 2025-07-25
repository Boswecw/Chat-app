// src/components/Avatar.jsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const Avatar = ({ 
  name = 'User', 
  imageUrl = null, 
  size = 40, 
  backgroundColor = '#007bff',
  textColor = '#ffffff' 
}) => {
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const textStyle = {
    color: textColor,
    fontSize: size * 0.4,
    fontWeight: '600',
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, avatarStyle]}
      />
    );
  }

  return (
    <View style={[styles.avatar, avatarStyle]}>
      <Text style={[styles.initials, textStyle]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '600',
  },
});

export default Avatar;