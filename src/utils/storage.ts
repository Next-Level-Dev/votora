import { Poll, User, VoteRecord, ScheduleSlot } from '../types';
import { sortScheduleSlots } from './votingEngine';

const STORAGE_KEY = 'votora_app_data_v3';

export interface AppState {
  users: User[];
  polls: Poll[];
  votes: VoteRecord[];
  groups: string[];
  schedules: ScheduleSlot[];
}

export const INITIAL_GROUPS: string[] = ['Friends', '2D', 'Live Action', '3D', 'Admins'];

export const INITIAL_USERS: User[] = [
  {
    id: 'user_admin_01',
    code: 'ADMIN-2026',
    name: 'Kaptan / Host (Admin)',
    role: 'admin',
    groups: ['Friends', 'Admins', '2D', 'Live Action'],
    createdAt: '2026-10-01T10:00:00.000Z',
    lastLoginAt: '2026-10-12T06:00:00.000Z',
  },
  {
    id: 'user_voter_01',
    code: 'ARKADAS-CAN',
    name: 'Can',
    role: 'voter',
    groups: ['Friends'],
    createdAt: '2026-10-02T11:00:00.000Z',
    lastLoginAt: '2026-10-11T19:30:00.000Z',
  },
  {
    id: 'user_voter_02',
    code: 'ARKADAS-ELIF',
    name: 'Elif',
    role: 'voter',
    groups: ['Friends'],
    createdAt: '2026-10-02T11:30:00.000Z',
  },
  {
    id: 'user_voter_03',
    code: 'ARKADAS-MERT',
    name: 'Mert',
    role: 'voter',
    groups: ['Friends', '2D'],
    createdAt: '2026-10-03T14:15:00.000Z',
    lastLoginAt: '2026-10-12T02:10:00.000Z',
  },
  {
    id: 'user_voter_04',
    code: 'ARKADAS-ZEYNEP',
    name: 'Zeynep',
    role: 'voter',
    groups: ['Friends', 'Live Action'],
    createdAt: '2026-10-03T15:00:00.000Z',
    lastLoginAt: '2026-10-11T21:40:00.000Z',
  },
  {
    id: 'user_voter_05',
    code: 'ARKADAS-BURAK',
    name: 'Burak',
    role: 'voter',
    groups: ['Friends', '3D'],
    createdAt: '2026-10-04T09:20:00.000Z',
  },
];

export const INITIAL_POLLS: Poll[] = [
  {
    id: 'poll_format_gate',
    title: 'Format Seçimi (2D / Canlı / 3D)',
    description: 'Evet dediğiniz türe ait sonraki anketin kilidi açılır.',
    type: 'yes_no',
    targetGroups: ['Friends'],
    hideFromNonMembers: false,
    allowFreeform: true,
    shareFreeformOptions: true,
    isActive: true,
    createdAt: '2026-10-05T12:00:00.000Z',
    createdBy: 'ADMIN-2026',
    options: [
      {
        id: 'opt_gate_2d',
        text: '2D Animasyon & Anime',
        assignsGroup: '2D',
      },
      {
        id: 'opt_gate_live',
        text: 'Live Action (Dizi / Film)',
        assignsGroup: 'Live Action',
      },
      {
        id: 'opt_gate_3d',
        text: '3D CGI Animasyon',
        assignsGroup: '3D',
      },
    ],
  },
  {
    id: 'poll_2d_ranked',
    title: '2D Dizi / Anime Sıralaması',
    description: 'Favorilerinizi sıralayın (1., 2., 3...).',
    type: 'ranked',
    targetGroups: ['2D'],
    hideFromNonMembers: true, // Only visible to 2D members!
    allowFreeform: true,
    shareFreeformOptions: true,
    isActive: true,
    createdAt: '2026-10-06T14:00:00.000Z',
    createdBy: 'ADMIN-2026',
    options: [
      { id: 'opt_2d_arcane', text: 'Arcane (S2)' },
      { id: 'opt_2d_frieren', text: 'Frieren' },
      { id: 'opt_2d_avatar', text: 'Avatar: The Last Airbender' },
      { id: 'opt_2d_cyberpunk', text: 'Cyberpunk: Edgerunners' },
      {
        id: 'opt_2d_dungeon',
        text: 'Delicious in Dungeon',
        isWriteIn: true,
        suggestedBy: 'Mert',
      },
    ],
  },
  {
    id: 'poll_live_action_single',
    title: 'Live Action Dizi Seçimi',
    description: 'En çok izlemek istediğiniz tek bir yapımı seçin.',
    type: 'single',
    targetGroups: ['Live Action'],
    hideFromNonMembers: true, // Only visible to Live Action members!
    allowFreeform: true,
    shareFreeformOptions: false,
    isActive: true,
    createdAt: '2026-10-07T16:00:00.000Z',
    createdBy: 'ADMIN-2026',
    options: [
      { id: 'opt_la_shogun', text: 'Shōgun' },
      { id: 'opt_la_severance', text: 'Severance' },
      { id: 'opt_la_tlou', text: 'The Last of Us' },
      { id: 'opt_la_succession', text: 'Succession' },
    ],
  },
];

export const INITIAL_SCHEDULES: ScheduleSlot[] = [
  {
    id: 'slot_10_10_2030',
    dateLabel: '10.10 Cmrts',
    time: '20:30',
    watchTitle: 'cyberpunk',
    seasonEpisode: 'sezon 1 bölüm 3-5',
    attendeeIds: ['user_admin_01', 'user_voter_01', 'user_voter_03'],
    attendeeNames: ['Kaptan', 'Can', 'Mert'],
    isCompleted: true,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-09T10:00:00.000Z',
  },
  {
    id: 'slot_11_10_1630',
    dateLabel: '11.10 Pzr',
    time: '16:30',
    watchTitle: 'cyberpunk',
    seasonEpisode: 'sezon 1 bölüm 6-8',
    attendeeIds: ['user_admin_01', 'user_voter_01', 'user_voter_04'],
    attendeeNames: ['Kaptan', 'Can', 'Zeynep'],
    isCompleted: true,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-09T10:00:00.000Z',
  },
  {
    id: 'slot_11_10_2030',
    dateLabel: '11.10 Pzr',
    time: '20:30',
    watchTitle: 'cyberpunk',
    seasonEpisode: 'sezon 1 bölüm 9-10',
    attendeeIds: ['user_admin_01', 'user_voter_03', 'user_voter_04'],
    attendeeNames: ['Kaptan', 'Mert', 'Zeynep'],
    isCompleted: true,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-09T10:00:00.000Z',
  },
  {
    id: 'slot_17_10_2030',
    dateLabel: '17.10 Cmrts',
    time: '20:30',
    watchTitle: 'Topluluk Seçimi',
    seasonEpisode: undefined,
    attendeeIds: ['user_admin_01', 'user_voter_01'],
    attendeeNames: ['Kaptan', 'Can'],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_18_10_1630',
    dateLabel: '18.10 Pzr',
    time: '16:30',
    watchTitle: 'Topluluk Seçimi',
    seasonEpisode: undefined,
    attendeeIds: ['user_voter_03'],
    attendeeNames: ['Mert'],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_18_10_2030',
    dateLabel: '18.10 Pzr',
    time: '20:30',
    watchTitle: 'Anime / Film Gecesi',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_24_10_2030',
    dateLabel: '24.10 Cmrts',
    time: '20:30',
    watchTitle: 'Sezon Finali',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_25_10_1630',
    dateLabel: '25.10 Pzr',
    time: '16:30',
    watchTitle: 'Yeni Seri Başlangıcı',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_25_10_2030',
    dateLabel: '25.10 Pzr',
    time: '20:30',
    watchTitle: 'Dizi Maratonu',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_31_10_2030',
    dateLabel: '31.10 Cmrts',
    time: '20:30',
    watchTitle: 'Cadılar Bayramı Özel',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_01_11_1630',
    dateLabel: '01.11 Pzr',
    time: '16:30',
    watchTitle: 'Sinema Kulübü',
    seasonEpisode: undefined,
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
  {
    id: 'slot_01_11_2030',
    dateLabel: '01.11 Pzr',
    time: '20:30',
    watchTitle: '?',
    seasonEpisode: '? sezon ? bölüm ?',
    attendeeIds: [],
    attendeeNames: [],
    isCompleted: false,
    targetGroups: ['Friends'],
    interactGroups: ['Friends'],
    createdAt: '2026-10-12T05:00:00.000Z',
  },
];

export const INITIAL_VOTES: VoteRecord[] = [
  {
    id: 'vote_sample_01',
    pollId: 'poll_format_gate',
    userId: 'user_voter_03', // Mert
    userName: 'Mert',
    userCode: 'ARKADAS-MERT',
    submittedAt: '2026-10-08T18:20:00.000Z',
    type: 'yes_no',
    value: {
      yesNoMap: {
        opt_gate_2d: true,
        opt_gate_live: false,
        opt_gate_3d: false,
      },
    },
    groupsGranted: ['2D'],
  },
  {
    id: 'vote_sample_02',
    pollId: 'poll_format_gate',
    userId: 'user_voter_04', // Zeynep
    userName: 'Zeynep',
    userCode: 'ARKADAS-ZEYNEP',
    submittedAt: '2026-10-09T19:45:00.000Z',
    type: 'yes_no',
    value: {
      yesNoMap: {
        opt_gate_2d: false,
        opt_gate_live: true,
        opt_gate_3d: false,
      },
    },
    groupsGranted: ['Live Action'],
  },
  {
    id: 'vote_sample_03',
    pollId: 'poll_2d_ranked',
    userId: 'user_voter_03', // Mert
    userName: 'Mert',
    userCode: 'ARKADAS-MERT',
    submittedAt: '2026-10-10T20:10:00.000Z',
    type: 'ranked',
    value: {
      rankedOptionIds: [
        'opt_2d_dungeon',
        'opt_2d_arcane',
        'opt_2d_frieren',
        'opt_2d_cyberpunk',
        'opt_2d_avatar',
      ],
    },
    writeInText: 'Delicious in Dungeon',
  },
  {
    id: 'vote_sample_04',
    pollId: 'poll_live_action_single',
    userId: 'user_voter_04', // Zeynep
    userName: 'Zeynep',
    userCode: 'ARKADAS-ZEYNEP',
    submittedAt: '2026-10-11T12:00:00.000Z',
    type: 'single',
    value: {
      singleOptionId: 'opt_la_severance',
    },
  },
];

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.users && parsed.polls && parsed.votes && parsed.groups) {
        return {
          ...parsed,
          schedules: sortScheduleSlots(parsed.schedules || INITIAL_SCHEDULES),
        };
      }
    }
  } catch {
    // Fallback
  }
  const defaultState: AppState = {
    users: INITIAL_USERS,
    polls: INITIAL_POLLS,
    votes: INITIAL_VOTES,
    groups: INITIAL_GROUPS,
    schedules: sortScheduleSlots(INITIAL_SCHEDULES),
  };
  saveAppState(defaultState);
  return defaultState;
}

export function saveAppState(state: AppState): void {
  try {
    const stateToSave = {
      ...state,
      schedules: sortScheduleSlots(state.schedules || []),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch {
    // Error handling
  }
}
