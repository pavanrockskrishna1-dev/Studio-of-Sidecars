/**
 * occasionDefs.js — Seasonal occasion pack definitions for BBQ Ride Studio.
 *
 * Each pack applies a theme to the live canvas:
 *   · grade        → cinematic color grade (maps to gradeStore IDs)
 *   · particles    → particle overlay type (rendered by OccasionParticles.jsx)
 *   · lowerThird   → title + subtitle for the lower-third overlay
 *   · hashtags     → ready-to-copy Instagram hashtags
 *   · accent       → UI highlight color for the occasion card
 *   · shots        → optional custom shot sequence override (null = use defaults)
 */

export const OCCASIONS = [
  {
    id: 'none',
    name: 'No theme',
    emoji: '🎬',
    tagline: 'Plain studio look',
    accent: '#6b7280',
    grade: 'raw',
    particles: null,
    lowerThird: { title: 'BBQ Bike', subtitle: 'Street Food. Reimagined.' },
    hashtags: ['#BBQRide', '#BlackwagonBBQ', '#StreetFood'],
    shots: null,
  },
  {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    tagline: 'Spooky BBQ night',
    accent: '#f97316',
    grade: 'moody',
    particles: 'bats',
    lowerThird: {
      title: 'Trick or Treat? 🎃',
      subtitle: 'Blackwagon BBQ • Tonight Only',
    },
    hashtags: [
      '#HalloweenBBQ', '#SpookyStreetFood', '#BlackwagonHalloween',
      '#TrickOrTreat', '#BBQRide', '#Halloween2025',
    ],
    shots: [
      { name: 'Sinister Low',  pos: [-4, 0.8, 7],   target: [0, 2.5, 0], duration: 3.5 },
      { name: 'Fog Reveal',    pos: [0,  6,  14],    target: [0, 2,   0], duration: 3.0 },
      { name: 'Ghoul Close',   pos: [1.5, 2.5, 4],   target: [0, 2.5, 0], duration: 2.5 },
      { name: 'Eerie Orbit',   pos: [-7, 3,   5],   target: [0, 2,   0], duration: 3.5 },
      { name: 'Moonrise Pull', pos: [2,  14,  12],   target: [0, 1,   0], duration: 4.0 },
    ],
  },
  {
    id: 'diwali',
    name: 'Diwali',
    emoji: '🪔',
    tagline: 'Festival of lights BBQ',
    accent: '#f59e0b',
    grade: 'warm',
    particles: 'fireworks',
    lowerThird: {
      title: 'Happy Diwali! 🪔✨',
      subtitle: 'Blackwagon BBQ • Celebrate with us',
    },
    hashtags: [
      '#DiwaliWithBBQ', '#BlackwagonDiwali', '#FestivalOfFlavours',
      '#HappyDiwali', '#BBQRide', '#DiwaliFood',
    ],
    shots: null,
  },
  {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    tagline: 'Festive street BBQ',
    accent: '#22c55e',
    grade: 'cinema',
    particles: 'snow',
    lowerThird: {
      title: 'Season\'s Greetings 🎄',
      subtitle: 'Blackwagon BBQ • Warm up this winter',
    },
    hashtags: [
      '#ChristmasBBQ', '#BlackwagonXmas', '#FestiveFlavours',
      '#HoHoBBQ', '#BBQRide', '#ChristmasFood',
    ],
    shots: null,
  },
  {
    id: 'holi',
    name: 'Holi',
    emoji: '🌈',
    tagline: 'Colours & flavours',
    accent: '#ec4899',
    grade: 'raw',
    particles: 'petals',
    lowerThird: {
      title: 'Happy Holi! 🌈',
      subtitle: 'Blackwagon BBQ • Celebrate the colours',
    },
    hashtags: [
      '#HoliBBQ', '#BlackwagonHoli', '#ColourfulFlavours',
      '#HappyHoli', '#BBQRide', '#HoliFood',
    ],
    shots: null,
  },
  {
    id: 'newyear',
    name: 'New Year',
    emoji: '🎆',
    tagline: 'Ring in the new year',
    accent: '#a855f7',
    grade: 'cinema',
    particles: 'confetti',
    lowerThird: {
      title: 'Happy New Year! 🎆',
      subtitle: 'Blackwagon BBQ • New Year, New Flavours',
    },
    hashtags: [
      '#NewYearBBQ', '#BlackwagonNY', '#HappyNewYear',
      '#NYEFood', '#BBQRide', '#NewYearParty',
    ],
    shots: null,
  },
  {
    id: 'valentine',
    name: "Valentine's",
    emoji: '❤️',
    tagline: 'Love at first bite',
    accent: '#f43f5e',
    grade: 'warm',
    particles: 'hearts',
    lowerThird: {
      title: 'Love at First Bite ❤️',
      subtitle: 'Blackwagon BBQ • Share the flavour',
    },
    hashtags: [
      '#ValentinesBBQ', '#LoveAtFirstBite', '#BlackwagonLove',
      '#ValentinesDay', '#BBQRide', '#FoodLove',
    ],
    shots: null,
  },
  {
    id: 'republic',
    name: 'Republic Day',
    emoji: '🇮🇳',
    tagline: 'Made in India, for India',
    accent: '#ff9800',
    grade: 'cinema',
    particles: 'tricolor',
    lowerThird: {
      title: 'Jai Hind! 🇮🇳',
      subtitle: 'Blackwagon BBQ • Proudly Made in India',
    },
    hashtags: [
      '#RepublicDay', '#JaiHind', '#MadeInIndia',
      '#BlackwagonIndia', '#BBQRide', '#ProudlyIndian',
    ],
    shots: null,
  },
  {
    id: 'eid',
    name: 'Eid',
    emoji: '🌙',
    tagline: 'Eid Mubarak from the streets',
    accent: '#14b8a6',
    grade: 'warm',
    particles: 'stars',
    lowerThird: {
      title: 'Eid Mubarak! 🌙',
      subtitle: 'Blackwagon BBQ • Celebrate together',
    },
    hashtags: [
      '#EidBBQ', '#EidMubarak', '#BlackwagonEid',
      '#EidFood', '#BBQRide', '#EidSpecial',
    ],
    shots: null,
  },
];

export const OCCASION_MAP = Object.fromEntries(OCCASIONS.map(o => [o.id, o]));

export function getOccasion(id) {
  return OCCASION_MAP[id] ?? OCCASION_MAP['none'];
}
