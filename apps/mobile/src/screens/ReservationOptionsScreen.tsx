import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ReservationDetails } from '../../../../packages/shared/src';
import { mobileTheme } from '../theme/tokens';

interface ReservationOptionsScreenProps {
  reservation: ReservationDetails | null;
  onEdit: () => void;
  onCancel: () => Promise<void>;
  isSubmitting: boolean;
}

export const ReservationOptionsScreen: React.FC<ReservationOptionsScreenProps> = ({
  reservation,
  onEdit,
  onCancel,
  isSubmitting
}) => {
  if (!reservation) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.info}>No verified reservation found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.heading}>Reservation Verified</Text>

        <View style={styles.card}>
          <Text style={styles.row}>Program: {reservation.programType}</Text>
          <Text style={styles.row}>Date: {reservation.date}</Text>
          <Text style={styles.row}>Time: {reservation.time}</Text>
          <Text style={styles.row}>Email: {reservation.email}</Text>
          <Text style={styles.row}>Confirmation: {reservation.confirmationNumber}</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={onEdit}>
          <Text style={styles.primaryText}>Edit Reservation</Text>
        </Pressable>

        <Pressable
          style={[styles.dangerButton, isSubmitting ? styles.disabled : null]}
          disabled={isSubmitting}
          onPress={onCancel}
        >
          <Text style={styles.dangerText}>{isSubmitting ? 'Cancelling...' : 'Cancel Reservation'}</Text>
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
    padding: 16
  },
  heading: {
    fontSize: 22,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: 12
  },
  card: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 12,
    backgroundColor: mobileTheme.colors.surface,
    padding: 12,
    marginBottom: 14,
    gap: 4
  },
  row: {
    color: mobileTheme.colors.textBody
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8
  },
  primaryText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.danger,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.dangerSoft
  },
  dangerText: {
    color: mobileTheme.colors.danger,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.55
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  info: {
    color: mobileTheme.colors.textMuted
  }
});
