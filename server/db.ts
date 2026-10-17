import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { User, Poll, VoteRecord, ScheduleSlot } from '../src/types';
import { INITIAL_USERS, INITIAL_POLLS, INITIAL_VOTES, INITIAL_GROUPS, INITIAL_SCHEDULES } from '../src/utils/storage';
import { compareScheduleSlots, normalizeUser, ADMIN_GROUP } from '../src/utils/votingEngine';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'votora.sqlite');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      groups_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      options_json TEXT NOT NULL,
      target_groups_json TEXT NOT NULL,
      hide_from_non_members INTEGER DEFAULT 0,
      allow_freeform INTEGER NOT NULL,
      share_freeform INTEGER NOT NULL,
      is_active INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_code TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      type TEXT NOT NULL,
      value_json TEXT NOT NULL,
      write_in_text TEXT,
      groups_granted_json TEXT
    );

    CREATE TABLE IF NOT EXISTS app_groups (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      date_label TEXT NOT NULL,
      time TEXT NOT NULL,
      watch_title TEXT NOT NULL,
      season_episode TEXT,
      note TEXT,
      attendee_ids_json TEXT NOT NULL,
      attendee_names_json TEXT NOT NULL,
      is_completed INTEGER NOT NULL,
      target_groups_json TEXT NOT NULL,
      interact_groups_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Seed if empty
  const userCountRes = db.exec("SELECT COUNT(*) as count FROM users;");
  const userCount = (userCountRes[0]?.values[0]?.[0] as number) || 0;

  if (userCount === 0) {
    seedDatabase(db);
  }

  // Sync ADMIN_CODE from environment variable (.env) if provided
  const envAdminCode = process.env.ADMIN_CODE ? process.env.ADMIN_CODE.trim().toUpperCase() : null;
  if (envAdminCode) {
    const adminCheck = db.exec("SELECT id, code FROM users WHERE role = 'admin' LIMIT 1;");
    if (adminCheck.length > 0 && adminCheck[0].values.length > 0) {
      const primaryAdminId = adminCheck[0].values[0][0];
      const currentCode = adminCheck[0].values[0][1];
      if (currentCode !== envAdminCode) {
        db.run("UPDATE users SET code = ? WHERE id = ?;", [envAdminCode, primaryAdminId]);
      }
    } else {
      const now = new Date().toISOString();
      db.run(
        `INSERT OR REPLACE INTO users (id, code, name, role, groups_json, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        ['user_admin_01', envAdminCode, 'Kaptan / Host (Admin)', 'admin', JSON.stringify([ADMIN_GROUP]), now, null]
      );
    }
  }

  // Repair any legacy/conflicting user data so the admin invariant holds:
  // admins live only in the admin group, everyone else is never in it.
  migrateUsers(db);

  // Admins are control accounts, not real participants: remove them from any
  // schedule attendee lists left over from older versions.
  stripAdminsFromSchedules(db);

  // Also check if schedules table is populated
  const schedCountRes = db.exec("SELECT COUNT(*) as count FROM schedules;");
  const schedCount = (schedCountRes[0]?.values[0]?.[0] as number) || 0;
  if (schedCount === 0) {
    for (const s of INITIAL_SCHEDULES) {
      db.run(
        `INSERT OR REPLACE INTO schedules (id, date_label, time, watch_title, season_episode, note, attendee_ids_json, attendee_names_json, is_completed, target_groups_json, interact_groups_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.id,
          s.dateLabel,
          s.time,
          s.watchTitle,
          s.seasonEpisode || null,
          s.note || null,
          JSON.stringify(s.attendeeIds),
          JSON.stringify(s.attendeeNames),
          s.isCompleted ? 1 : 0,
          JSON.stringify(s.targetGroups),
          JSON.stringify(s.interactGroups || s.targetGroups),
          s.createdAt,
        ]
      );
    }
  }

  persistDb();
  return db;
}

function persistDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

/**
 * Reconcile persisted user rows with the admin invariant. A user is considered
 * an admin if they belong to the admin group OR carry the legacy `admin` role.
 * The migration then makes the admin group the single source of truth.
 */
function migrateUsers(database: Database) {
  const res = database.exec("SELECT id, role, groups_json FROM users;");
  if (res.length === 0) return;

  for (const row of res[0].values) {
    const id = row[0] as string;
    const role = row[1] as string;
    let groups: string[] = [];
    try {
      groups = JSON.parse((row[2] as string) || '[]');
    } catch {
      groups = [];
    }

    const isAdmin = role === 'admin' || groups.includes(ADMIN_GROUP);
    const nextRole = isAdmin ? 'admin' : 'voter';
    const nextGroups = isAdmin ? [ADMIN_GROUP] : groups.filter((g) => g !== ADMIN_GROUP);

    const changed =
      nextRole !== role || JSON.stringify(nextGroups) !== JSON.stringify(groups);

    if (changed) {
      database.run("UPDATE users SET role = ?, groups_json = ? WHERE id = ?;", [
        nextRole,
        JSON.stringify(nextGroups),
        id,
      ]);
    }
  }
}

/**
 * Remove admin user ids (and their paired names) from every schedule's
 * attendee lists — admins are reserved for access control and are never
 * actual event participants.
 */
function stripAdminsFromSchedules(database: Database) {
  const adminRes = database.exec("SELECT id FROM users WHERE role = 'admin';");
  const adminIds = new Set<string>(
    adminRes.length > 0 ? adminRes[0].values.map((v) => v[0] as string) : []
  );
  if (adminIds.size === 0) return;

  const schedRes = database.exec("SELECT id, attendee_ids_json, attendee_names_json FROM schedules;");
  if (schedRes.length === 0) return;

  for (const row of schedRes[0].values) {
    const slotId = row[0] as string;
    let ids: string[] = [];
    let names: string[] = [];
    try {
      ids = JSON.parse((row[1] as string) || '[]');
    } catch {
      ids = [];
    }
    try {
      names = JSON.parse((row[2] as string) || '[]');
    } catch {
      names = [];
    }

    if (!ids.some((id) => adminIds.has(id))) continue;

    const nextIds: string[] = [];
    const nextNames: string[] = [];
    ids.forEach((id, idx) => {
      if (!adminIds.has(id)) {
        nextIds.push(id);
        nextNames.push(names[idx] ?? '');
      }
    });

    database.run("UPDATE schedules SET attendee_ids_json = ?, attendee_names_json = ? WHERE id = ?;", [
      JSON.stringify(nextIds),
      JSON.stringify(nextNames),
      slotId,
    ]);
  }
}

function seedDatabase(database: Database) {
  const envAdminCode = process.env.ADMIN_CODE ? process.env.ADMIN_CODE.trim().toUpperCase() : null;

  // Seed Groups
  for (const grp of INITIAL_GROUPS) {
    database.run("INSERT OR IGNORE INTO app_groups (name) VALUES (?);", [grp]);
  }

  // Seed Users
  for (const u of INITIAL_USERS) {
    const normalized = normalizeUser(u);
    const userCode = (normalized.role === 'admin' && envAdminCode) ? envAdminCode : normalized.code;
    database.run(
      `INSERT OR REPLACE INTO users (id, code, name, role, groups_json, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [normalized.id, userCode, normalized.name, normalized.role, JSON.stringify(normalized.groups), normalized.createdAt, normalized.lastLoginAt || null]
    );
  }

  // Seed Polls
  for (const p of INITIAL_POLLS) {
    database.run(
      `INSERT OR REPLACE INTO polls (id, title, description, type, options_json, target_groups_json, hide_from_non_members, allow_freeform, share_freeform, is_active, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        p.id,
        p.title,
        p.description,
        p.type,
        JSON.stringify(p.options),
        JSON.stringify(p.targetGroups),
        p.hideFromNonMembers ? 1 : 0,
        p.allowFreeform ? 1 : 0,
        p.shareFreeformOptions ? 1 : 0,
        p.isActive ? 1 : 0,
        p.createdAt,
        p.createdBy,
      ]
    );
  }

  // Seed Votes
  for (const v of INITIAL_VOTES) {
    database.run(
      `INSERT OR REPLACE INTO votes (id, poll_id, user_id, user_name, user_code, submitted_at, type, value_json, write_in_text, groups_granted_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        v.id,
        v.pollId,
        v.userId,
        v.userName,
        v.userCode,
        v.submittedAt,
        v.type,
        JSON.stringify(v.value),
        v.writeInText || null,
        JSON.stringify(v.groupsGranted || []),
      ]
    );
  }

  // Seed Schedules
  for (const s of INITIAL_SCHEDULES) {
    database.run(
      `INSERT OR REPLACE INTO schedules (id, date_label, time, watch_title, season_episode, note, attendee_ids_json, attendee_names_json, is_completed, target_groups_json, interact_groups_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        s.id,
        s.dateLabel,
        s.time,
        s.watchTitle,
        s.seasonEpisode || null,
        s.note || null,
        JSON.stringify(s.attendeeIds),
        JSON.stringify(s.attendeeNames),
        s.isCompleted ? 1 : 0,
        JSON.stringify(s.targetGroups),
        JSON.stringify(s.interactGroups || s.targetGroups),
        s.createdAt,
      ]
    );
  }
}

export async function getAllData() {
  const database = await getDb();

  // Users
  const userRows = database.exec("SELECT * FROM users ORDER BY created_at DESC;");
  const users: User[] = [];
  if (userRows.length > 0) {
    for (const row of userRows[0].values) {
      users.push(
        normalizeUser({
          id: row[0] as string,
          code: row[1] as string,
          name: row[2] as string,
          role: row[3] as any,
          groups: JSON.parse((row[4] as string) || '[]'),
          createdAt: row[5] as string,
          lastLoginAt: (row[6] as string) || undefined,
        })
      );
    }
  }

  // Polls
  const pollRows = database.exec("SELECT * FROM polls ORDER BY created_at DESC;");
  const polls: Poll[] = [];
  if (pollRows.length > 0) {
    for (const row of pollRows[0].values) {
      polls.push({
        id: row[0] as string,
        title: row[1] as string,
        description: (row[2] as string) || '',
        type: row[3] as any,
        options: JSON.parse((row[4] as string) || '[]'),
        targetGroups: JSON.parse((row[5] as string) || '[]'),
        hideFromNonMembers: Boolean(row[6]),
        allowFreeform: Boolean(row[7]),
        shareFreeformOptions: Boolean(row[8]),
        isActive: Boolean(row[9]),
        createdAt: row[10] as string,
        createdBy: row[11] as string,
      });
    }
  }

  // Votes
  const voteRows = database.exec("SELECT * FROM votes ORDER BY submitted_at DESC;");
  const votes: VoteRecord[] = [];
  if (voteRows.length > 0) {
    for (const row of voteRows[0].values) {
      votes.push({
        id: row[0] as string,
        pollId: row[1] as string,
        userId: row[2] as string,
        userName: row[3] as string,
        userCode: row[4] as string,
        submittedAt: row[5] as string,
        type: row[6] as any,
        value: JSON.parse((row[7] as string) || '{}'),
        writeInText: (row[8] as string) || undefined,
        groupsGranted: JSON.parse((row[9] as string) || '[]'),
      });
    }
  }

  // Groups
  const groupRows = database.exec("SELECT name FROM app_groups ORDER BY name ASC;");
  const groups: string[] = [];
  if (groupRows.length > 0) {
    for (const row of groupRows[0].values) {
      groups.push(row[0] as string);
    }
  }

  // Schedules
  const schedRows = database.exec("SELECT * FROM schedules ORDER BY created_at ASC;");
  const schedules: ScheduleSlot[] = [];
  if (schedRows.length > 0) {
    for (const row of schedRows[0].values) {
      schedules.push({
        id: row[0] as string,
        dateLabel: row[1] as string,
        time: row[2] as string,
        watchTitle: row[3] as string,
        seasonEpisode: (row[4] as string) || undefined,
        note: (row[5] as string) || undefined,
        attendeeIds: JSON.parse((row[6] as string) || '[]'),
        attendeeNames: JSON.parse((row[7] as string) || '[]'),
        isCompleted: Boolean(row[8]),
        targetGroups: JSON.parse((row[9] as string) || '[]'),
        interactGroups: JSON.parse((row[10] as string) || '[]'),
        createdAt: row[11] as string,
      });
    }
  }

  schedules.sort(compareScheduleSlots);

  return { users, polls, votes, groups, schedules };
}

export async function insertUser(user: User) {
  const database = await getDb();
  const normalized = normalizeUser(user);
  database.run(
    `INSERT INTO users (id, code, name, role, groups_json, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [normalized.id, normalized.code, normalized.name, normalized.role, JSON.stringify(normalized.groups), normalized.createdAt, normalized.lastLoginAt || null]
  );
  persistDb();
}

export async function updateUserGroups(userId: string, groups: string[]) {
  const database = await getDb();

  // Read the existing membership so admin status (admin group) is the source of truth.
  const existing = database.exec("SELECT role, groups_json FROM users WHERE id = ?;", [userId]);
  let existingRole = 'voter';
  let existingGroups: string[] = [];
  if (existing.length > 0 && existing[0].values.length > 0) {
    existingRole = existing[0].values[0][0] as string;
    try {
      existingGroups = JSON.parse((existing[0].values[0][1] as string) || '[]');
    } catch {
      existingGroups = [];
    }
  }

  const isAdmin = existingRole === 'admin' || existingGroups.includes(ADMIN_GROUP);

  // Admins are locked to the admin group; non-admins can never be added to it.
  const nextGroups = isAdmin
    ? [ADMIN_GROUP]
    : (groups || []).filter((g) => g !== ADMIN_GROUP);
  const nextRole = isAdmin ? 'admin' : 'voter';

  database.run("UPDATE users SET role = ?, groups_json = ? WHERE id = ?;", [
    nextRole,
    JSON.stringify(nextGroups),
    userId,
  ]);
  persistDb();
}

export async function updateUserLastLogin(code: string) {
  const database = await getDb();
  database.run("UPDATE users SET last_login_at = ? WHERE UPPER(code) = ?;", [
    new Date().toISOString(),
    code.toUpperCase(),
  ]);
  persistDb();
}

export async function deleteUser(userId: string) {
  const database = await getDb();
  database.run("DELETE FROM users WHERE id = ?;", [userId]);
  database.run("DELETE FROM votes WHERE user_id = ?;", [userId]);
  persistDb();
}

export async function insertPoll(poll: Poll) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO polls (id, title, description, type, options_json, target_groups_json, hide_from_non_members, allow_freeform, share_freeform, is_active, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      poll.id,
      poll.title,
      poll.description,
      poll.type,
      JSON.stringify(poll.options),
      JSON.stringify(poll.targetGroups),
      poll.hideFromNonMembers ? 1 : 0,
      poll.allowFreeform ? 1 : 0,
      poll.shareFreeformOptions ? 1 : 0,
      poll.isActive ? 1 : 0,
      poll.createdAt,
      poll.createdBy,
    ]
  );
  persistDb();
}

export async function updatePollOptions(pollId: string, options: any[]) {
  const database = await getDb();
  database.run("UPDATE polls SET options_json = ? WHERE id = ?;", [JSON.stringify(options), pollId]);
  persistDb();
}

export async function deletePoll(pollId: string) {
  const database = await getDb();
  database.run("DELETE FROM polls WHERE id = ?;", [pollId]);
  database.run("DELETE FROM votes WHERE poll_id = ?;", [pollId]);
  persistDb();
}

export async function insertVote(vote: VoteRecord) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO votes (id, poll_id, user_id, user_name, user_code, submitted_at, type, value_json, write_in_text, groups_granted_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      vote.id,
      vote.pollId,
      vote.userId,
      vote.userName,
      vote.userCode,
      vote.submittedAt,
      vote.type,
      JSON.stringify(vote.value),
      vote.writeInText || null,
      JSON.stringify(vote.groupsGranted || []),
    ]
  );
  persistDb();
}

export async function insertGroup(name: string) {
  const database = await getDb();
  database.run("INSERT OR IGNORE INTO app_groups (name) VALUES (?);", [name]);
  persistDb();
}

export async function deleteGroup(name: string) {
  const database = await getDb();
  database.run("DELETE FROM app_groups WHERE name = ?;", [name]);
  persistDb();
}

// Schedule Operations
export async function insertScheduleSlot(slot: ScheduleSlot) {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO schedules (id, date_label, time, watch_title, season_episode, note, attendee_ids_json, attendee_names_json, is_completed, target_groups_json, interact_groups_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      slot.id,
      slot.dateLabel,
      slot.time,
      slot.watchTitle,
      slot.seasonEpisode || null,
      slot.note || null,
      JSON.stringify(slot.attendeeIds),
      JSON.stringify(slot.attendeeNames),
      slot.isCompleted ? 1 : 0,
      JSON.stringify(slot.targetGroups),
      JSON.stringify(slot.interactGroups || slot.targetGroups),
      slot.createdAt,
    ]
  );
  persistDb();
}

export async function deleteScheduleSlot(slotId: string) {
  const database = await getDb();
  database.run("DELETE FROM schedules WHERE id = ?;", [slotId]);
  persistDb();
}
