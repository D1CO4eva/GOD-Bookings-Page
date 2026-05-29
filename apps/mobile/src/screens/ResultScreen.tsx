import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { mobileTheme } from '../theme/tokens';

interface ResultScreenProps {
  title: string;
  message: string;
  onDone: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ title, message, onDone }) => {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <Pressable style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Back To Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  title: {
    fontSize: 24,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center'
  },
  message: {
    marginTop: 10,
    marginBottom: 22,
    color: mobileTheme.colors.textMuted,
    textAlign: 'center'
  },
  button: {
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  }
});
