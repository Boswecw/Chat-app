// App.jsx - Root application component for Tribe Chat App
import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  StatusBar, 
  Platform,
  LogBox
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Main screen import
import ChatScreen from './src/screens/ChatScreen';

// Constants
import colors from './src/constants/colors';

// Suppress known development warnings that don't affect functionality
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:', // Metro bundler warning that doesn't affect app
  ]);
}

const App = () => {
  // Set up status bar on mount
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Ensure status bar is visible on Android
      StatusBar.setHidden(false);
      StatusBar.setBackgroundColor(colors.primary, true);
      StatusBar.setBarStyle('light-content', true);
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* Status Bar Configuration */}
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
          backgroundColor={Platform.OS === 'android' ? colors.primary : undefined}
          translucent={Platform.OS === 'android'}
        />
        
        {/* Main Chat Screen */}
        <ChatScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;