// Enhanced theme system with dark mode support
// src/constants/theme.js
import { useColorScheme } from 'react-native';

const lightTheme = {
  colors: {
    primary: '#007AFF',
    primaryLight: '#4A9EFF',
    primaryDark: '#0056CC',
    secondary: '#8E8E93',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceSecondary: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    textMuted: '#C7C7CC',
    border: '#C6C6C8',
    borderLight: '#E5E5EA',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },
  typography: {
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      title: 24,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: '#0A84FF',
    primaryLight: '#409CFF',
    primaryDark: '#0056CC',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textMuted: '#48484A',
    border: '#38383A',
    borderLight: '#48484A',
  },
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

// Enhanced MessageBubble styles with better responsiveness
// src/components/MessageBubble.styles.js
import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const createStyles = (theme) => StyleSheet.create({
  container: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    maxWidth: screenWidth * 0.85, // Responsive width
  },
  
  containerGrouped: {
    marginTop: theme.spacing.xs,
  },
  
  containerNotGrouped: {
    marginTop: theme.spacing.md,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  
  name: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    flexShrink: 1,
  },
  
  time: {
    marginLeft: 'auto',
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.regular,
  },
  
  bubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    position: 'relative',
    // Add subtle border for better definition
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  bubbleOwn: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
  },
  
  text: {
    fontSize: theme.typography.sizes.md,
    lineHeight: 20,
    color: theme.colors.text,
  },
  
  textOwn: {
    color: theme.colors.background,
  },
  
  edited: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  
  image: {
    marginTop: theme.spacing.sm,
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  
  imageSmall: {
    height: 120,
  },
  
  imageLarge: {
    height: 300,
  },
  
  existingReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    // Add subtle shadow
    ...theme.shadows.sm,
  },
  
  reactionBubbleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  
  reactionEmoji: {
    fontSize: theme.typography.sizes.sm,
    marginRight: theme.spacing.xs,
  },
  
  reactionCount: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  
  reactionCountActive: {
    color: theme.colors.background,
  },
  
  addReactionButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  
  addReactionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  
  replyContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  
  replyContent: {
    flex: 1,
  },
  
  replyLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs / 2,
  },
  
  replyText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  
  statusContainer: {
    marginTop: theme.spacing.xs,
    alignItems: 'flex-end',
  },
  
  statusText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  
  statusFailed: {
    color: theme.colors.error,
  },
  
  statusSending: {
    color: theme.colors.textSecondary,
  },
  
  // Accessibility improvements
  accessibilityFocus: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});