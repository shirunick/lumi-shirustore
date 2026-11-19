export type MockCreator = {
  ref: string
  name: string
}

export type MockCharacter = {
  id: string
  name: string
  description: string
  firstMes: string
  creator: MockCreator
  image: { status: string; url: string }
  tags: string[]
  score: number | null
  clientPaths: { card: string; avatar: string }
}

export const MOCK_CREATORS: MockCreator[] = [
  { ref: 'ashfall', name: 'Ashfall' },
  { ref: 'moonbyte', name: 'Moonbyte' },
  { ref: 'velvetquill', name: 'Velvet Quill' },
  { ref: 'noctis', name: 'Noctis' },
  { ref: 'kumo', name: 'Kumo' },
]

export const MOCK_TAGS = [
  'fantasy',
  'sci-fi',
  'noir',
  'slice of life',
  'adventure',
  'mystery',
  'comedy',
  'cozy',
  'drama',
  'historical',
]

const NAMES = [
  'Mira Vale',
  'Captain Oro',
  'Hollow Saint',
  'Juniper',
  'Detective Kael',
  'Sable of the Fen',
  'Nyx',
  'Professor Ashgrove',
  'Rin and Ren',
  'The Lantern Keeper',
  'Vesper',
  'Okami Hana',
  'Dr. Lysander Crowe',
  'Pip',
  'Sera Unbound',
  'Grimm',
  'Lady Marrow',
  'Taro',
  'Echo-7',
  'Wren Halloway',
  'Marigold',
  'Baron Vex',
  'Lumi',
  'Kestrel',
]

const SCORES = [98, 91, 84, 72, 64, 45, 99, 88]

export function mockCharacterId(i: number): string {
  const hex = i.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

export function makeMockCharacter(i: number): MockCharacter {
  const creator = MOCK_CREATORS[i % MOCK_CREATORS.length]!
  const id = mockCharacterId(i + 1)
  const score = i % 7 === 0 ? null : SCORES[i % SCORES.length]!
  return {
    id,
    name: NAMES[i % NAMES.length]!,
    description:
      'A quiet traveler with a notebook full of strangers. Soft-spoken, sharp-eyed, and always one step ahead of the weather.',
    firstMes:
      '*Rain ticks the windows. Across the room, someone looks up from a battered book and smiles.* "Took you long enough."',
    creator: { name: creator.name, ref: creator.ref },
    image: {
      status: 'ready',
      url: `https://picsum.photos/seed/shirustore-mock-${i}/360/480`,
    },
    tags: [
      MOCK_TAGS[i % MOCK_TAGS.length]!,
      MOCK_TAGS[(i + 3) % MOCK_TAGS.length]!,
      MOCK_TAGS[(i + 5) % MOCK_TAGS.length]!,
    ],
    score,
    clientPaths: {
      card: `/characters/${id}/card`,
      avatar: `/characters/${id}/avatar`,
    },
  }
}

export const MOCK_CHARACTERS: MockCharacter[] = Array.from(
  { length: 48 },
  (_, i) => makeMockCharacter(i),
)
