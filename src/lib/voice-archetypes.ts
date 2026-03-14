export interface VoiceArchetype {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  traits: string[];
  samplePhrase: string;
  toneKeywords: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
}

export const VOICE_ARCHETYPES: VoiceArchetype[] = [
  {
    id: 'authority',
    name: 'The Authority',
    description:
      'Authoritative, data-driven, precise. For companies that want to be seen as the definitive expert in their market.',
    icon: 'Shield',
    traits: ['Authoritative', 'Data-driven', 'Precise', 'Commanding', 'Definitive'],
    samplePhrase:
      'The data is unequivocal — this shift demands immediate strategic recalibration.',
    toneKeywords: ['authoritative', 'precise', 'analytical', 'definitive', 'rigorous'],
    wordsToUse: [
      'unequivocal',
      'analysis',
      'evidence',
      'framework',
      'benchmark',
      'empirical',
      'strategic',
      'recalibrate',
      'quantifiable',
      'substantive',
    ],
    wordsToAvoid: [
      'maybe',
      'sort of',
      'kind of',
      'hopefully',
      'fingers crossed',
      'excited',
      'amazing',
      'game-changer',
      'disrupt',
      'synergy',
    ],
  },
  {
    id: 'challenger',
    name: 'The Challenger',
    description:
      'Provocative, contrarian, bold. For disruptors who challenge industry norms and conventional thinking.',
    icon: 'Flame',
    traits: ['Provocative', 'Contrarian', 'Bold', 'Direct', 'Unapologetic'],
    samplePhrase:
      "Everyone's celebrating this deal. Here's why they shouldn't be.",
    toneKeywords: ['provocative', 'contrarian', 'bold', 'direct', 'challenging'],
    wordsToUse: [
      'actually',
      'overlooked',
      'uncomfortable truth',
      'rethink',
      'wrong',
      'overdue',
      'exposed',
      'blunt',
      'unpopular opinion',
      'reality check',
    ],
    wordsToAvoid: [
      'pleased to announce',
      'delighted',
      'partnership',
      'synergy',
      'best-in-class',
      'world-leading',
      'humbled',
      'proud',
      'thrilled',
      'honoured',
    ],
  },
  {
    id: 'advisor',
    name: 'The Advisor',
    description:
      'Warm, consultative, trustworthy. For client-focused firms that prioritise relationships and practical guidance.',
    icon: 'Handshake',
    traits: ['Warm', 'Consultative', 'Trustworthy', 'Empathetic', 'Practical'],
    samplePhrase:
      "Here's what this means for your portfolio — and what we'd recommend.",
    toneKeywords: ['consultative', 'warm', 'trustworthy', 'practical', 'guiding'],
    wordsToUse: [
      'recommend',
      'consider',
      'guidance',
      'together',
      'support',
      'navigate',
      'tailored',
      'proactive',
      'partnership',
      'here for you',
    ],
    wordsToAvoid: [
      'disruption',
      'revolutionary',
      'unprecedented',
      'pivot',
      'leverage',
      'circle back',
      'move the needle',
      'bandwidth',
      'deep dive',
      'low-hanging fruit',
    ],
  },
  {
    id: 'insider',
    name: 'The Insider',
    description:
      'Connected, informed, exclusive. For those with deep market access and intelligence that others cannot match.',
    icon: 'KeyRound',
    traits: ['Connected', 'Informed', 'Exclusive', 'Credible', 'Networked'],
    samplePhrase:
      "I spoke to three underwriters this week. They're all saying the same thing.",
    toneKeywords: ['informed', 'exclusive', 'connected', 'insider', 'credible'],
    wordsToUse: [
      'sources indicate',
      'behind the scenes',
      'market whispers',
      'first-hand',
      'off the record',
      'early signal',
      'well-placed',
      'intelligence',
      'on the ground',
      'ahead of the curve',
    ],
    wordsToAvoid: [
      'according to reports',
      'it is believed',
      'some say',
      'industry experts',
      'stakeholders',
      'ecosystem',
      'paradigm',
      'holistic',
      'robust',
      'scalable',
    ],
  },
  {
    id: 'innovator',
    name: 'The Innovator',
    description:
      'Forward-thinking, optimistic, tech-savvy. For insurtechs and modernisers building the future of insurance.',
    icon: 'Lightbulb',
    traits: ['Forward-thinking', 'Optimistic', 'Tech-savvy', 'Visionary', 'Energetic'],
    samplePhrase:
      'This is exactly the kind of problem that technology was built to solve.',
    toneKeywords: ['forward-thinking', 'optimistic', 'innovative', 'visionary', 'energetic'],
    wordsToUse: [
      'reimagine',
      'build',
      'solve',
      'automate',
      'modern',
      'transform',
      'unlock',
      'streamline',
      'future-proof',
      'next generation',
    ],
    wordsToAvoid: [
      'legacy',
      'traditional',
      'conservative',
      'status quo',
      'bureaucratic',
      'manual',
      'paper-based',
      'outdated',
      'cumbersome',
      'wait and see',
    ],
  },
];

export function getArchetypeById(id: string): VoiceArchetype | undefined {
  return VOICE_ARCHETYPES.find((a) => a.id === id);
}
