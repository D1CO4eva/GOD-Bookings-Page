import { Platform } from 'react-native';

export const mobileTheme = {
  colors: {
    background: '#f5f7fb',
    surface: '#ffffff',
    brand: '#2e3192',
    brandDark: '#24287a',
    accent: '#ffcc00',
    textPrimary: '#1f2f66',
    textBody: '#3d4353',
    textMuted: '#667085',
    border: '#d4dbef',
    danger: '#b42318',
    dangerSoft: '#fff5f5',
    link: '#1f4c9b'
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#101828',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 14
    },
    android: {
      elevation: 4
    },
    default: {}
  })
} as const;
