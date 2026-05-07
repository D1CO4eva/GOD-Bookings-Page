import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { BookingData, DevotionalProgram, TimeSlot, toDateKey, toSlotLabel } from '../../../../packages/shared/src';
import { googleMapsApiKey } from '../api/client';
import { Field } from '../components/Field';
import { mobileTheme } from '../theme/tokens';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ALLOWED_STATES = new Set(['GA', 'AL', 'TN', 'NC', 'SC', 'FL']);

type FormErrors = Record<string, string>;

interface BookingFormScreenProps {
  program: DevotionalProgram | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  isSubmitting: boolean;
  onSubmit: (data: BookingData) => Promise<void>;
}

export const BookingFormScreen: React.FC<BookingFormScreenProps> = ({
  program,
  selectedDate,
  selectedSlot,
  isSubmitting,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: 'GA',
    zipCode: '',
    occasion: '',
    additionalNotes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const slotLabel = selectedSlot ? toSlotLabel(selectedSlot) : '';

  const canSubmit = useMemo(
    () => !!program && !!selectedDate && !!selectedSlot && !isSubmitting,
    [program, selectedDate, selectedSlot, isSubmitting]
  );

  const setField = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');

    if (!formData.name.trim()) nextErrors.name = 'Full name is required.';
    if (!phoneDigits) nextErrors.phoneNumber = 'Phone number is required.';
    if (phoneDigits && phoneDigits.length < 10) {
      nextErrors.phoneNumber = 'Please enter at least 10 digits.';
    }

    if (!formData.email.trim()) nextErrors.email = 'Email is required.';
    if (formData.email && !EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.street.trim()) nextErrors.street = 'Street address is required.';
    if (!formData.city.trim()) nextErrors.city = 'City is required.';

    const state = formData.state.trim().toUpperCase();
    if (!ALLOWED_STATES.has(state)) {
      nextErrors.state = 'State must be one of: GA, AL, TN, NC, SC, FL.';
    }

    if (!/^\d{5}$/.test(formData.zipCode.trim())) {
      nextErrors.zipCode = 'ZIP code must be exactly 5 digits.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!program || !selectedDate || !selectedSlot) return;
    if (!validate()) return;

    const payload: BookingData = {
      typeOfProgram: program.name,
      date: toDateKey(selectedDate),
      time: slotLabel,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      street: formData.street.trim(),
      city: formData.city.trim(),
      state: formData.state.trim().toUpperCase(),
      zipCode: formData.zipCode.trim(),
      fullAddress: `${formData.street.trim()}, ${formData.city.trim()}, ${formData.state
        .trim()
        .toUpperCase()} ${formData.zipCode.trim()}`,
      occasion: formData.occasion.trim(),
      additionalNotes: formData.additionalNotes.trim()
    };

    await onSubmit(payload);
  };

  if (!program || !selectedDate || !selectedSlot) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Program, date, and slot are required before entering details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Host Details</Text>
        <Text style={styles.summary}>
          {program.name} | {toDateKey(selectedDate)} | {slotLabel}
        </Text>

        {!!googleMapsApiKey && (
          <View style={styles.autocompleteContainer}>
            <Text style={styles.autocompleteLabel}>Find Address (optional helper)</Text>
            <GooglePlacesAutocomplete
              placeholder="Search address"
              query={{
                key: googleMapsApiKey,
                language: 'en',
                components: 'country:us'
              }}
              styles={{
                textInput: styles.autocompleteInput,
                listView: styles.autocompleteList
              }}
              fetchDetails
              onPress={(_, details = null) => {
                if (!details?.address_components) return;
                const get = (type: string, shortName = false): string => {
                  const match = details.address_components.find((item: any) => item.types?.includes(type));
                  if (!match) return '';
                  return shortName ? match.short_name || '' : match.long_name || '';
                };

                const streetNumber = get('street_number');
                const route = get('route');
                const city =
                  get('locality') ||
                  get('postal_town') ||
                  get('administrative_area_level_3') ||
                  get('sublocality');
                const state = get('administrative_area_level_1', true).toUpperCase();
                const zip = get('postal_code');

                const street = `${streetNumber} ${route}`.trim();

                setField('street', street || formData.street);
                setField('city', city || formData.city);
                setField('state', ALLOWED_STATES.has(state) ? state : formData.state);
                setField('zipCode', zip || formData.zipCode);
              }}
            />
          </View>
        )}

        <Field
          label="Full Name"
          value={formData.name}
          onChangeText={(value) => setField('name', value)}
          error={errors.name}
        />
        <Field
          label="Email"
          value={formData.email}
          onChangeText={(value) => setField('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <Field
          label="Phone Number"
          value={formData.phoneNumber}
          onChangeText={(value) => setField('phoneNumber', value)}
          keyboardType="phone-pad"
          error={errors.phoneNumber}
        />
        <Field
          label="Street"
          value={formData.street}
          onChangeText={(value) => setField('street', value)}
          error={errors.street}
        />
        <Field
          label="City"
          value={formData.city}
          onChangeText={(value) => setField('city', value)}
          error={errors.city}
        />
        <Field
          label="State (GA/AL/TN/NC/SC/FL)"
          value={formData.state}
          onChangeText={(value) => setField('state', value.toUpperCase())}
          autoCapitalize="characters"
          error={errors.state}
        />
        <Field
          label="ZIP"
          value={formData.zipCode}
          onChangeText={(value) => setField('zipCode', value.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          error={errors.zipCode}
        />
        <Field
          label="Occasion"
          value={formData.occasion}
          onChangeText={(value) => setField('occasion', value)}
        />
        <Field
          label="Additional Notes"
          value={formData.additionalNotes}
          onChangeText={(value) => setField('additionalNotes', value)}
          multiline
        />

        <Pressable
          style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : null]}
          disabled={!canSubmit}
          onPress={submit}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit Booking'}</Text>
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
    paddingBottom: 30
  },
  heading: {
    fontSize: 22,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700'
  },
  summary: {
    color: mobileTheme.colors.textMuted,
    marginBottom: 12
  },
  autocompleteContainer: {
    zIndex: 2,
    marginBottom: 8
  },
  autocompleteLabel: {
    marginBottom: 6,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '600'
  },
  autocompleteInput: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.surface
  },
  autocompleteList: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.55
  },
  submitButtonText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  fallbackText: {
    color: mobileTheme.colors.textMuted
  }
});
