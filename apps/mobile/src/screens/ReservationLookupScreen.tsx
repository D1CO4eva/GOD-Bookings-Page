import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { ReservationLookupData } from '../../../../packages/shared/src';
import { Field } from '../components/Field';
import { mobileTheme } from '../theme/tokens';

interface ReservationLookupScreenProps {
  loading: boolean;
  error: string;
  onVerify: (lookup: ReservationLookupData) => Promise<void>;
}

export const ReservationLookupScreen: React.FC<ReservationLookupScreenProps> = ({
  loading,
  error,
  onVerify
}) => {
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const submit = async () => {
    const lookup: ReservationLookupData = {
      confirmationNumber: confirmationNumber.trim(),
      email: email.trim() || undefined,
      date: date.trim() || undefined,
      time: time.trim() || undefined
    };

    await onVerify(lookup);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Find Reservation</Text>
        <Text style={styles.subtitle}>
          Enter your confirmation number. Add email/date/time if your confirmation lookup needs extra matching.
        </Text>

        <Field
          label="Confirmation Number"
          value={confirmationNumber}
          onChangeText={setConfirmationNumber}
          autoCapitalize="none"
        />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Date YYYY-MM-DD (optional)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />
        <Field
          label="Time slot (optional)"
          value={time}
          onChangeText={setTime}
          autoCapitalize="none"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, (!confirmationNumber.trim() || loading) ? styles.disabled : null]}
          disabled={!confirmationNumber.trim() || loading}
          onPress={submit}
        >
          <Text style={styles.submitText}>{loading ? 'Verifying...' : 'Verify Reservation'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background
  },
  container: {
    padding: 16,
    paddingBottom: 28
  },
  heading: {
    fontSize: 22,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700'
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    marginTop: 6,
    marginBottom: 12
  },
  error: {
    marginBottom: 8,
    color: mobileTheme.colors.danger,
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center'
  },
  submitText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.55
  }
});
