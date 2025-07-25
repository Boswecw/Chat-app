// src/components/ErrorBoundary.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../src_backup/constants/colors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to crash reporting service in production
    if (!__DEV__) {
      // Example: Crashlytics.recordError(error);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;
      
      // Custom fallback component
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error}
            resetError={this.handleRetry}
          />
        );
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😵</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an unexpected error and couldn't continue.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={this.handleRetry}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Enhanced Error Boundary with additional features
export const EnhancedErrorBoundary = ({ children, onError, fallback }) => {
  return (
    <ErrorBoundary 
      fallback={fallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    opacity: 0.7,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ErrorBoundary;