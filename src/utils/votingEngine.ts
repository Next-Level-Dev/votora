import { Poll, ScheduleSlot, User, VoteRecord } from '../types';

/**
 * Group that grants administrator privileges. Being a member of this group is
 * the single source of truth for "is this account an admin?" — there is no
 * separate administrator flag/setting.
 */
export const ADMIN_GROUP = 'Admins';

/** True when the given user belongs to the administrator group. */
export function isUserAdmin(user: { role?: User['role']; groups?: string[] }): boolean {
  return Boolean(user && Array.isArray(user.groups) && user.groups.includes(ADMIN_GROUP));
}

/**
 * Reconcile a user's role and group membership against the admin invariant:
 * - Members of the admin group are admins and may ONLY belong to that group.
 * - Non-admins may never belong to the admin group.
 * Used to repair legacy/conflicting data and to enforce the rule on writes.
 */
export function normalizeUser<T extends { groups: string[]; role?: User['role'] }>(user: T): T {
  const isAdmin = Array.isArray(user.groups) && user.groups.includes(ADMIN_GROUP);
  return {
    ...user,
    role: (isAdmin ? 'admin' : 'voter') as User['role'],
    groups: isAdmin ? [ADMIN_GROUP] : (user.groups || []).filter((g) => g !== ADMIN_GROUP),
  };
}

export interface OptionResult {
  optionId: string;
  text: string;
  description?: string;
  isWriteIn?: boolean;
  suggestedBy?: string;
  assignsGroup?: string;
  // Stats
  votesCount: number; // Single / Multiple votes, or 1st choice count for ranked
  bordaScore?: number; // for ranked
  percentage: number;
  yesCount?: number; // for yes_no
  noCount?: number; // for yes_no
  yesRate?: number; // for yes_no
}

export interface PollStats {
  totalVotes: number;
  participatedUserIds: string[];
  optionResults: OptionResult[];
  writeInSuggestions: { user: string; text: string; date: string }[];
}

export function calculatePollStats(poll: Poll, votes: VoteRecord[]): PollStats {
  const pollVotes = votes.filter((v) => v.pollId === poll.id);
  const totalVotes = pollVotes.length;
  const participatedUserIds = Array.from(new Set(pollVotes.map((v) => v.userId)));

  const writeInSuggestions = pollVotes
    .filter((v) => Boolean(v.writeInText && v.writeInText.trim().length > 0))
    .map((v) => ({
      user: v.userName,
      text: v.writeInText!.trim(),
      date: v.submittedAt,
    }));

  if (poll.type === 'single') {
    const counts: Record<string, number> = {};
    poll.options.forEach((opt) => (counts[opt.id] = 0));
    pollVotes.forEach((v) => {
      const optId = v.value.singleOptionId;
      if (optId && counts[optId] !== undefined) {
        counts[optId] += 1;
      }
    });

    const optionResults: OptionResult[] = poll.options.map((opt) => {
      const count = counts[opt.id] || 0;
      return {
        optionId: opt.id,
        text: opt.text,
        description: opt.description,
        isWriteIn: opt.isWriteIn,
        suggestedBy: opt.suggestedBy,
        assignsGroup: opt.assignsGroup,
        votesCount: count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });

    optionResults.sort((a, b) => b.votesCount - a.votesCount);

    return { totalVotes, participatedUserIds, optionResults, writeInSuggestions };
  }

  if (poll.type === 'ranked') {
    const numOptions = poll.options.length;
    const bordaScores: Record<string, number> = {};
    const firstPlaceCounts: Record<string, number> = {};

    poll.options.forEach((opt) => {
      bordaScores[opt.id] = 0;
      firstPlaceCounts[opt.id] = 0;
    });

    pollVotes.forEach((v) => {
      const ranked = v.value.rankedOptionIds || [];
      ranked.forEach((optId, index) => {
        if (bordaScores[optId] !== undefined) {
          // Rank 0 is 1st place -> receives numOptions points, next receives numOptions - 1
          const points = Math.max(1, numOptions - index);
          bordaScores[optId] += points;
          if (index === 0) {
            firstPlaceCounts[optId] += 1;
          }
        }
      });
    });

    const maxPossibleBorda = totalVotes * numOptions;

    const optionResults: OptionResult[] = poll.options.map((opt) => {
      const bScore = bordaScores[opt.id] || 0;
      const firsts = firstPlaceCounts[opt.id] || 0;
      return {
        optionId: opt.id,
        text: opt.text,
        description: opt.description,
        isWriteIn: opt.isWriteIn,
        suggestedBy: opt.suggestedBy,
        assignsGroup: opt.assignsGroup,
        votesCount: firsts,
        bordaScore: bScore,
        percentage: maxPossibleBorda > 0 ? Math.round((bScore / maxPossibleBorda) * 100) : 0,
      };
    });

    optionResults.sort((a, b) => (b.bordaScore || 0) - (a.bordaScore || 0));

    return { totalVotes, participatedUserIds, optionResults, writeInSuggestions };
  }

  if (poll.type === 'yes_no') {
    const yesCounts: Record<string, number> = {};
    const noCounts: Record<string, number> = {};

    poll.options.forEach((opt) => {
      yesCounts[opt.id] = 0;
      noCounts[opt.id] = 0;
    });

    pollVotes.forEach((v) => {
      const map = v.value.yesNoMap || {};
      poll.options.forEach((opt) => {
        if (map[opt.id] === true) {
          yesCounts[opt.id] += 1;
        } else if (map[opt.id] === false) {
          noCounts[opt.id] += 1;
        }
      });
    });

    const optionResults: OptionResult[] = poll.options.map((opt) => {
      const yes = yesCounts[opt.id] || 0;
      const no = noCounts[opt.id] || 0;
      const responded = yes + no;
      const yesRate = responded > 0 ? Math.round((yes / responded) * 100) : 0;
      return {
        optionId: opt.id,
        text: opt.text,
        description: opt.description,
        isWriteIn: opt.isWriteIn,
        suggestedBy: opt.suggestedBy,
        assignsGroup: opt.assignsGroup,
        votesCount: yes,
        yesCount: yes,
        noCount: no,
        yesRate,
        percentage: yesRate,
      };
    });

    optionResults.sort((a, b) => (b.yesRate || 0) - (a.yesRate || 0));

    return { totalVotes, participatedUserIds, optionResults, writeInSuggestions };
  }

  // Multiple choice
  const multipleCounts: Record<string, number> = {};
  poll.options.forEach((opt) => (multipleCounts[opt.id] = 0));
  pollVotes.forEach((v) => {
    const selected = v.value.multipleOptionIds || [];
    selected.forEach((optId) => {
      if (multipleCounts[optId] !== undefined) {
        multipleCounts[optId] += 1;
      }
    });
  });

  const optionResults: OptionResult[] = poll.options.map((opt) => {
    const count = multipleCounts[opt.id] || 0;
    return {
      optionId: opt.id,
      text: opt.text,
      description: opt.description,
      isWriteIn: opt.isWriteIn,
      suggestedBy: opt.suggestedBy,
      assignsGroup: opt.assignsGroup,
      votesCount: count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    };
  });

  optionResults.sort((a, b) => b.votesCount - a.votesCount);
  return { totalVotes, participatedUserIds, optionResults, writeInSuggestions };
}

/**
 * Determine which groups should be granted based on the vote value
 */
export function determineGroupsToGrant(poll: Poll, voteValue: VoteRecord['value']): string[] {
  const granted = new Set<string>();

  if (poll.type === 'single') {
    const chosen = poll.options.find((o) => o.id === voteValue.singleOptionId);
    if (chosen?.assignsGroup) {
      granted.add(chosen.assignsGroup.trim());
    }
  } else if (poll.type === 'yes_no') {
    const map = voteValue.yesNoMap || {};
    poll.options.forEach((opt) => {
      if (map[opt.id] === true && opt.assignsGroup) {
        granted.add(opt.assignsGroup.trim());
      }
    });
  } else if (poll.type === 'ranked') {
    // If top choice has a group assignment
    const topId = voteValue.rankedOptionIds?.[0];
    const topOpt = poll.options.find((o) => o.id === topId);
    if (topOpt?.assignsGroup) {
      granted.add(topOpt.assignsGroup.trim());
    }
  } else if (poll.type === 'multiple') {
    const selected = voteValue.multipleOptionIds || [];
    poll.options.forEach((opt) => {
      if (selected.includes(opt.id) && opt.assignsGroup) {
        granted.add(opt.assignsGroup.trim());
      }
    });
  }

  return Array.from(granted);
}

/**
 * Check if a user has access to a poll based on group restrictions
 */
export function canUserAccessPoll(user: User, poll: Poll): boolean {
  if (user.role === 'admin') return true;
  if (!poll.targetGroups || poll.targetGroups.length === 0 || poll.targetGroups.includes('all')) {
    return true;
  }
  return poll.targetGroups.some((g) => user.groups.includes(g));
}

/**
 * Check if a user can even see a poll (handles hideFromNonMembers)
 */
export function canUserSeePoll(user: User, poll: Poll): boolean {
  if (user.role === 'admin') return true;
  if (!poll.hideFromNonMembers) return true;
  return canUserAccessPoll(user, poll);
}

/**
 * Check if a user can see a schedule slot
 */
export function canUserSeeSchedule(user: User, slot: { targetGroups?: string[] }): boolean {
  if (user.role === 'admin') return true;
  if (!slot.targetGroups || slot.targetGroups.length === 0 || slot.targetGroups.includes('all')) {
    return true;
  }
  return slot.targetGroups.some((g) => user.groups.includes(g));
}

/**
 * Check if a user can interact with (RSVP to) a schedule slot
 */
export function canUserInteractSchedule(
  user: User,
  slot: { targetGroups?: string[]; interactGroups?: string[]; isCompleted: boolean }
): boolean {
  if (slot.isCompleted) return false;
  if (user.role === 'admin') return true;
  const groups = slot.interactGroups && slot.interactGroups.length > 0 ? slot.interactGroups : slot.targetGroups;
  if (!groups || groups.length === 0 || groups.includes('all')) {
    return true;
  }
  return groups.some((g) => user.groups.includes(g));
}

/**
 * Parse date label into a comparable numeric value
 * Supports DD.MM (e.g. "10.10 Cmrts", "18.10 Pzr"), DD.MM.YYYY, YYYY-MM-DD
 */
export function parseDateLabelToTimestamp(label: string): number {
  if (!label) return 0;
  const trimmed = label.trim();

  // 1. Try ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return y * 10000 + m * 100 + d;
  }

  // 2. Try DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return y * 10000 + m * 100 + d;
  }

  // 3. Try DD.MM or D.M (standard European/Turkish day-month, e.g. "10.10 Cmrts", "01.11 Pzr")
  const dmMatch = trimmed.match(/(\d{1,2})[./](\d{1,2})/);
  if (dmMatch) {
    const d = parseInt(dmMatch[1], 10);
    const m = parseInt(dmMatch[2], 10);
    // Assume year 2026 (or 2027 if month rolls over < 6)
    const year = m < 6 ? 2027 : 2026;
    return year * 10000 + m * 100 + d;
  }

  // Fallback: extract any digits
  const anyDigits = trimmed.match(/\d+/g);
  if (anyDigits && anyDigits.length > 0) {
    return parseInt(anyDigits.join(''), 10);
  }

  return 0;
}

export function compareDateLabels(a: string, b: string): number {
  const timeA = parseDateLabelToTimestamp(a);
  const timeB = parseDateLabelToTimestamp(b);
  if (timeA !== 0 || timeB !== 0) {
    if (timeA !== timeB) return timeA - timeB;
  }
  return a.localeCompare(b);
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
  }
  return 0;
}

export function compareScheduleSlots(a: ScheduleSlot, b: ScheduleSlot): number {
  // 1. Primary: Date
  const dateDiff = compareDateLabels(a.dateLabel, b.dateLabel);
  if (dateDiff !== 0) return dateDiff;

  // 2. Secondary: Time (e.g. 16:30 before 20:30)
  const minA = parseTimeToMinutes(a.time);
  const minB = parseTimeToMinutes(b.time);
  if (minA !== minB) return minA - minB;

  const timeStrDiff = a.time.localeCompare(b.time);
  if (timeStrDiff !== 0) return timeStrDiff;

  // 3. Stable tie-breaker: createdAt (if distinct), else id
  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.id.localeCompare(b.id);
}

export function sortScheduleSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort(compareScheduleSlots);
}
