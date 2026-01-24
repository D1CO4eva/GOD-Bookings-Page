import React from 'react';
import { DevotionalProgram } from './types';

export const COLORS = {
  primary: '#2E3192', // Deep Blue from GOD logo
  secondary: '#FFCC00', // Golden Yellow from GOD logo background
  accent: '#E63946', // Flame color
  light: '#F8F9FA',
  text: '#1F2937',
  zelle: '#6d1ed1', // Zelle Purple
};

export const ZELLE_EMAIL = 'atlanta@godivinity.org';

export const PROGRAMS: DevotionalProgram[] = [
  {
    id: 'radha-kalyanam',
    name: 'Radha Kalyanam',
    description: 'A devotional ceremony celebrating the divine marriage of Radha and Krishna with bhajans and prayers.',
    duration: '3 Hours',
    icon: 'fa-hands-praying',
    videoUrl: 'https://youtube.com/shorts/C2lnjuv50Zw?si=-1eiWMtvjzvxEYre',
    donationAmount: '$501',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2025/01/c962aa6f-fc42-4323-94c0-832632e88e7a.jpeg'
  },
  {
    id: 'nikunja-utsavam',
    name: 'Nikunja Utsavam',
    description: 'A program focused on lovingly serving the Divine Couple in the spirit of Nikunja seva through nama and bhakti.',
    duration: '2 Hours',
    icon: 'fa-sun',
    donationAmount: '$301',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2021/08/WhatsApp-Image-2021-08-28-at-3.13.27-PM.jpeg'
  },
  {
    id: 'nama-ruchi',
    name: 'Nama Ruchi',
    description: 'A satsang designed to build taste (ruchi) for the Holy Name through kirtan, reflection, and association.',
    duration: '1 Hour',
    icon: 'fa-music',
    videoUrl: 'https://youtube.com/shorts/qBFfZkudf-4?si=7nb9eUqYKdVZlNmW',
    donationAmount: '$201',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2022/08/WhatsApp-Image-2022-08-26-at-7.41.51-AM-1.jpeg'
  },
  {
    id: 'nama-bhiksha',
    name: 'Nama Bhiksha',
    description: 'A simple and heartfelt gathering centered on chanting and sharing prasadam in the mood of humility and devotion.',
    duration: '30 min - 1 Hour',
    icon: 'fa-heart',
    donationAmount: 'Any amount appreciated',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2023/06/WhatsApp-Image-2023-06-24-at-8.47.17-PM-3.jpeg'
  }
];

// Updated production Google Apps Script Web App endpoint as requested
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdDE8eeCPODJITE8fGnLiQbPUn9HjmzxpAXR1wK5S1c6U8wi53pfQY5NymHg_cui0o/exec';