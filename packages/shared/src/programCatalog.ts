import { DevotionalProgram } from './types';

export const DEFAULT_API_BASE = 'https://god-auth-service-693007788010.us-central1.run.app';

export const CONTACT_EMAIL = 'atlantanamadwaar@gmail.com';
export const CONTACT_PHONE = '404-788-7391';
export const ZELLE_EMAIL = 'atlanta@godivinity.org';

export const PROGRAMS: DevotionalProgram[] = [
  {
    id: 'radha-kalyanam',
    name: 'Radha Kalyanam',
    description:
      "Sri Radha and Krishna, accompanied by Atlanta Namadwaar Bhagavathas, celebrate their divine marriage in a devotional ceremony that's filled with bhajans and prayers!",
    duration: '3 Hours',
    icon: 'fa-hands-praying',
    videoUrl: 'https://youtube.com/shorts/C2lnjuv50Zw?si=-1eiWMtvjzvxEYre',
    donationAmount: '$501',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2025/01/c962aa6f-fc42-4323-94c0-832632e88e7a.jpeg',
    checklist: {
      label: 'Program Checklist',
      href: '/program-checklists/radha-kalyanam-checklist.docx'
    }
  },
  {
    id: 'nikunja-utsavam',
    name: 'Nikunja Utsavam',
    description:
      'Invite Sri Radha and Krishna to your home to relish their darshan in the divine Nikunjam, where their love is at its peak!',
    duration: '2 Hours',
    icon: 'fa-sun',
    donationAmount: '$401',
    imageUrl: '/program-images/nikunja-utsavam/nikunja-utsavam.jpg',
    checklist: {
      label: 'Program Checklist',
      href: '/program-checklists/nikunja-utsavam-checklist.docx'
    }
  },
  {
    id: 'thirumanjanam',
    name: 'Thirumanjanam',
    description:
      'Experience the divine Abhishek of Sri Radha and Krishna right in your home with Veda Parayanam, Bhajans, and Mahamantra Kirtan!',
    duration: '2 Hours',
    icon: 'fa-water',
    donationAmount: '$351',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2022/03/WhatsApp-Image-2022-03-28-at-8.57.40-PM.jpeg',
    checklist: {
      label: 'Program Checklist',
      href: '/program-checklists/thirumanjanam-checklist.docx'
    }
  },
  {
    id: 'nama-ruchi',
    name: 'Nama Ruchi',
    description: 'Invite Sri Radha and Krishna to your home for an exhilarating session of Mahamantra Kirtan!',
    duration: '1 Hour',
    icon: 'fa-music',
    videoUrl: 'https://youtube.com/shorts/qBFfZkudf-4?si=7nb9eUqYKdVZlNmW',
    donationAmount: '$201',
    imageUrl: '/program-images/nama-ruchi/nama-ruchi.jpg'
  },
  {
    id: 'nama-bhiksha',
    name: 'Nama Bhiksha',
    description: "Atlanta Bhagavathas come to your home and chant Mahamantra for you and your family's welfare!",
    duration: '30 min - 1 Hour',
    icon: 'fa-heart',
    donationAmount: 'Any amount appreciated',
    imageUrl: 'https://godivinity.org/wp-content/uploads/2023/06/WhatsApp-Image-2023-06-24-at-8.47.17-PM-3.jpeg'
  }
];
