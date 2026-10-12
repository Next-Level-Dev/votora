export type UserRole = 'admin' | 'voter';

export type PollType = 'ranked' | 'single' | 'yes_no' | 'multiple';

export interface User {
  id: string;
  code: string;
  name: string;
  role: UserRole;
  groups: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  description?: string;
  assignsGroup?: string; // Group granted if selected (or if voted 'Yes' in yes_no)
  isWriteIn?: boolean;
  suggestedBy?: string; // User name who suggested it
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  type: PollType;
  options: PollOption[];
  targetGroups: string[]; // empty or ['all'] means open to everyone; otherwise restricted
  hideFromNonMembers?: boolean; // if true, only users in targetGroups (and admins) can see this poll
  allowFreeform: boolean;
  shareFreeformOptions: boolean; // if true, voter write-in becomes an option for future voters
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface VoteRecord {
  id: string;
  pollId: string;
  userId: string;
  userName: string;
  userCode: string;
  submittedAt: string;
  type: PollType;
  value: {
    singleOptionId?: string;
    rankedOptionIds?: string[]; // sorted from 1st preference to last
    yesNoMap?: Record<string, boolean>; // optionId -> true (yes/okay) or false (no/pass)
    multipleOptionIds?: string[];
  };
  writeInText?: string;
  groupsGranted?: string[];
}

export interface ScheduleSlot {
  id: string;
  dateLabel: string; // e.g. "10.10 Cmrts", "11.10 Pzr"
  time: string; // e.g. "20:30", "16:30"
  watchTitle: string; // e.g. "cyberpunk", "?", or custom
  seasonEpisode?: string; // e.g. "sezon 1 bölüm 3-5", "? sezon ? bölüm ?"
  note?: string;
  attendeeIds: string[]; // User IDs who marked attendance
  attendeeNames: string[]; // User names
  isCompleted: boolean; // Marked complete & locked by admin
  targetGroups: string[]; // empty or ['all'] means visible to all; otherwise restricted
  interactGroups?: string[]; // empty or ['all'] = same as targetGroups
  createdAt: string;
}

export type Language = 'en' | 'tr';
export type Theme = 'light' | 'dark';
