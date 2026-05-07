import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DevotionalProgram, getProgramAvailabilityFlags } from '../../../../packages/shared/src';
import { mobileTheme } from '../theme/tokens';
import { getProgramImageUrls } from '../utils/programMedia';

interface ProgramCardMobileProps {
  program: DevotionalProgram;
  onBook: (program: DevotionalProgram) => void;
  onManageReservation: (program: DevotionalProgram) => void;
  onDonate: (program: DevotionalProgram) => void;
  onChecklist: (program: DevotionalProgram) => void;
  onVideo: (program: DevotionalProgram) => void;
}

export const ProgramCardMobile: React.FC<ProgramCardMobileProps> = ({
  program,
  onBook,
  onManageReservation,
  onDonate,
  onChecklist,
  onVideo
}) => {
  const flags = getProgramAvailabilityFlags(program.id);
  const imageUrls = useMemo(() => getProgramImageUrls(program), [program]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [program.id, imageUrls.length]);

  useEffect(() => {
    if (imageUrls.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
    }, 2200);

    return () => clearInterval(intervalId);
  }, [imageUrls.length]);

  const imageSource = imageUrls[currentImageIndex];

  const resolveProgramIcon = () => {
    switch (program.id) {
      case 'radha-kalyanam':
        return 'hands-pray';
      case 'nikunja-utsavam':
        return 'weather-sunny';
      case 'thirumanjanam':
        return 'water';
      case 'nama-ruchi':
        return 'music';
      case 'nama-bhiksha':
        return 'heart';
      default:
        return 'star-four-points';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image
            source={{ uri: imageSource }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <MaterialCommunityIcons
              name={resolveProgramIcon()}
              size={34}
              color={mobileTheme.colors.surface}
            />
          </View>
        )}
        <View style={styles.imageOverlay}>
          <View style={styles.durationPill}>
            <Text style={styles.durationLabel}>Duration: {program.duration}</Text>
          </View>
        </View>
        <View style={styles.accentBar} />
      </View>

      <Text style={styles.title}>{program.name}</Text>
      <Text style={styles.description}>"{program.description}"</Text>

      {flags.length > 0 && (
        <View style={styles.badges}>
          {flags.map((flag) => (
            <View key={flag} style={styles.badge}>
              <MaterialCommunityIcons name="flag" size={12} color={mobileTheme.colors.brand} />
              <Text style={styles.badgeText}>{flag}</Text>
            </View>
          ))}
        </View>
      )}

      {!!program.donationAmount && (
        <Pressable style={styles.donationCard} onPress={() => onDonate(program)}>
          <View style={styles.donationIcon}>
            <MaterialCommunityIcons name="hand-heart" size={16} color={mobileTheme.colors.surface} />
          </View>
          <View>
            <Text style={styles.donationCaption}>Donation Amount</Text>
            <Text style={styles.donationAmount}>{program.donationAmount}</Text>
          </View>
        </Pressable>
      )}

      <View style={styles.linksRow}>
        {!!program.checklist?.href && (
          <Pressable style={styles.linkChip} onPress={() => onChecklist(program)}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={14} color={mobileTheme.colors.link} />
            <Text style={styles.link}>Checklist</Text>
          </Pressable>
        )}
        {!!program.videoUrl && (
          <Pressable style={styles.linkChip} onPress={() => onVideo(program)}>
            <MaterialCommunityIcons name="youtube" size={16} color="#b42318" />
            <Text style={styles.link}>Video</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => onBook(program)}>
        <Text style={styles.primaryButtonText}>Book This Program</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => onManageReservation(program)}>
        <Text style={styles.secondaryButtonText}>Already Have a Reservation?</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: mobileTheme.radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    ...mobileTheme.shadow
  },
  imageWrapper: {
    borderRadius: mobileTheme.radius.md,
    overflow: 'hidden',
    marginBottom: 12
  },
  image: {
    width: '100%',
    height: 168
  },
  imageFallback: {
    width: '100%',
    height: 168,
    backgroundColor: mobileTheme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  durationPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  durationLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  accentBar: {
    height: 4,
    backgroundColor: mobileTheme.colors.accent
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8
  },
  description: {
    color: mobileTheme.colors.textBody,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic'
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8
  },
  badge: {
    backgroundColor: '#eef2ff',
    borderColor: '#cdd7ff',
    borderWidth: 1,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badgeText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ced8ff',
    backgroundColor: '#f2f5ff',
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  donationIcon: {
    width: 28,
    height: 28,
    borderRadius: mobileTheme.radius.pill,
    backgroundColor: mobileTheme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  donationCaption: {
    color: '#5a6380',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  donationAmount: {
    color: mobileTheme.colors.brand,
    fontWeight: '800',
    fontSize: 16
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12
  },
  linkChip: {
    borderWidth: 1,
    borderColor: '#d6e3ff',
    backgroundColor: '#f8fbff',
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  link: {
    color: mobileTheme.colors.link,
    fontWeight: '600'
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 8
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fdfdff'
  },
  secondaryButtonText: {
    color: mobileTheme.colors.brand,
    fontWeight: '600',
    fontSize: 13
  }
});
