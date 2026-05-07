import React from 'react';
import { Alert, FlatList, Image, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  DevotionalProgram,
  PROGRAMS,
  ZELLE_EMAIL,
  resolvePublicAssetUrl
} from '../../../../packages/shared/src';
import { ProgramCardMobile } from '../components/ProgramCardMobile';
import { mobileTheme } from '../theme/tokens';

interface HomeScreenProps {
  onBookProgram: (program: DevotionalProgram) => void;
  onManageReservation: (program: DevotionalProgram) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onBookProgram, onManageReservation }) => {
  const openChecklist = async (program: DevotionalProgram) => {
    const href = program.checklist?.href;
    if (!href) return;

    const resolved = resolvePublicAssetUrl(href, 'https://atlanta.godivinity.org/homebookings/');
    const isOfficeDoc = /\.(doc|docx)$/i.test(resolved);
    const url = isOfficeDoc
      ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(resolved)}`
      : resolved;

    await Linking.openURL(url);
  };

  const openVideo = async (program: DevotionalProgram) => {
    if (!program.videoUrl) return;
    await Linking.openURL(program.videoUrl);
  };

  const copyDonationEmail = async () => {
    await Clipboard.setStringAsync(ZELLE_EMAIL);
    Alert.alert('Copied', `Zelle email copied: ${ZELLE_EMAIL}`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerCard}>
        <View style={styles.brandRow}>
          <Image
            source={{ uri: 'https://godivinity.org/wp-content/uploads/2018/05/GOD-LOGO-1024x617.jpg' }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandName}>Atlanta Namadwaar</Text>
            <Text style={styles.brandTagline}>Devotional Home Programs</Text>
          </View>
        </View>

        <Text style={styles.title}>Book devotional programs from your phone.</Text>

        <View style={styles.donationRow}>
          <MaterialCommunityIcons name="heart" size={16} color={mobileTheme.colors.brand} />
          <Text style={styles.donationText}>Donation via Zelle: {ZELLE_EMAIL}</Text>
        </View>
        <Pressable style={styles.copyButton} onPress={copyDonationEmail}>
          <Text style={styles.copyButtonText}>Copy Donation Email</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={PROGRAMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProgramCardMobile
            program={item}
            onBook={onBookProgram}
            onManageReservation={onManageReservation}
            onDonate={copyDonationEmail}
            onChecklist={openChecklist}
            onVideo={openVideo}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background
  },
  headerCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    ...mobileTheme.shadow
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff'
  },
  brandTextWrap: {
    marginLeft: 10,
    flex: 1
  },
  brandName: {
    fontSize: 20,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '800'
  },
  brandTagline: {
    marginTop: 2,
    color: '#5a6380',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700'
  },
  title: {
    marginTop: 12,
    fontSize: 17,
    color: mobileTheme.colors.textBody,
    fontWeight: '600'
  },
  donationRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  donationText: {
    color: mobileTheme.colors.brand,
    fontWeight: '700',
    fontSize: 13
  },
  copyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f7f8ff'
  },
  copyButtonText: {
    color: mobileTheme.colors.brand,
    fontWeight: '700',
    fontSize: 12
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 4
  }
});
