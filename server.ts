import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import {
  getAllData,
  insertUser,
  updateUserGroups,
  updateUserLastLogin,
  deleteUser,
  insertPoll,
  updatePollOptions,
  deletePoll,
  insertVote,
  insertGroup,
  deleteGroup,
  insertScheduleSlot,
  deleteScheduleSlot,
} from './server/db';
import { ScheduleSlot } from './src/types';
import { ADMIN_GROUP } from './src/utils/votingEngine';

function isAdminUser(user: { role?: string; groups?: string[] } | undefined | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || Boolean(user.groups && user.groups.includes(ADMIN_GROUP));
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());

// Determine whether the requester (via login cookie) is an admin.
async function viewerIsAdmin(req: express.Request): Promise<boolean> {
  try {
    const cookies = (req as any).cookies as Record<string, string> | undefined;
    const code = cookies && cookies.votora_auth_code;
    if (!code) return false;
    const data = await getAllData();
    const user = data.users.find((u) => u.code.toUpperCase() === String(code).toUpperCase());
    return isAdminUser(user);
  } catch {
    return false;
  }
}

// Strip confidential invite codes from data being sent to non-admin viewers.
function sanitizeForViewer(data: Awaited<ReturnType<typeof getAllData>>, isAdmin: boolean) {
  if (isAdmin) return data;
  return {
    ...data,
    users: data.users.map((u) => ({ ...u, code: '' })),
    votes: data.votes.map((v) => ({ ...v, userCode: '' })),
    polls: data.polls.map((p) => ({ ...p, createdBy: '' })),
  };
}

// Server configuration & environment flags
app.get('/api/config', (req, res) => {
  res.json({
    isProd,
    hasEnvAdminCode: Boolean(process.env.ADMIN_CODE),
  });
});

// REST API routes
app.get('/api/state', async (req, res) => {
  try {
    const data = await getAllData();
    const isAdmin = await viewerIsAdmin(req);
    res.json(sanitizeForViewer(data, isAdmin));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const clean = code.trim().toUpperCase();
    const data = await getAllData();
    const user = data.users.find((u) => u.code.toUpperCase() === clean);

    if (!user) {
      return res.status(401).json({ error: 'Invalid invitation code' });
    }

    await updateUserLastLogin(clean);
    res.cookie('votora_auth_code', clean, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
    });

    const updated = { ...user, lastLoginAt: new Date().toISOString() };
    res.json({ user: updated, state: sanitizeForViewer(data, isAdminUser(user)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('votora_auth_code', { path: '/' });
  res.json({ success: true });
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    await insertUser(user);
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/groups', async (req, res) => {
  try {
    const { id } = req.params;
    const { groups } = req.body;
    await updateUserGroups(id, groups);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUser(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/polls', async (req, res) => {
  try {
    const poll = req.body;
    await insertPoll(poll);
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/polls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deletePoll(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/votes', async (req, res) => {
  try {
    const { voteRecord, updatedUserGroups, newPollOption } = req.body;
    if (!voteRecord || !voteRecord.userId) {
      return res.status(400).json({ error: 'Invalid vote record' });
    }

    // Administrators are view/create only and may never cast a vote.
    const preState = await getAllData();
    const voter = preState.users.find((u) => u.id === voteRecord.userId);
    if (isAdminUser(voter) || (await viewerIsAdmin(req))) {
      return res.status(403).json({ error: 'Administrators cannot vote' });
    }

    await insertVote(voteRecord);

    if (updatedUserGroups && updatedUserGroups.length > 0) {
      await updateUserGroups(voteRecord.userId, updatedUserGroups);
    }

    if (newPollOption) {
      const data = await getAllData();
      const currentPoll = data.polls.find((p) => p.id === voteRecord.pollId);
      if (currentPoll) {
        const nextOptions = [...currentPoll.options, newPollOption];
        await updatePollOptions(voteRecord.pollId, nextOptions);
      }
    }

    const nextState = await getAllData();
    const isAdmin = await viewerIsAdmin(req);
    res.json({ success: true, nextState: sanitizeForViewer(nextState, isAdmin) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name } = req.body;
    await insertGroup(name.trim());
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const decoded = decodeURIComponent(name);
    if (decoded === ADMIN_GROUP) {
      return res.status(400).json({ error: 'The admin group cannot be removed' });
    }
    await deleteGroup(decoded);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule endpoints
app.post('/api/schedules', async (req, res) => {
  try {
    const slot: ScheduleSlot = req.body;
    await insertScheduleSlot(slot);
    const data = await getAllData();
    res.json({ success: true, schedules: data.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteScheduleSlot(id);
    const data = await getAllData();
    res.json({ success: true, schedules: data.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/attend', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;
    const data = await getAllData();
    const slot = data.schedules.find((s) => s.id === id);

    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.isCompleted) return res.status(400).json({ error: 'Slot is completed and locked' });

    let attendeeIds = [...slot.attendeeIds];
    let attendeeNames = [...slot.attendeeNames];

    if (attendeeIds.includes(userId)) {
      // Remove
      const idx = attendeeIds.indexOf(userId);
      attendeeIds.splice(idx, 1);
      attendeeNames.splice(idx, 1);
    } else {
      // Add
      attendeeIds.push(userId);
      attendeeNames.push(userName);
    }

    const updatedSlot: ScheduleSlot = {
      ...slot,
      attendeeIds,
      attendeeNames,
    };

    await insertScheduleSlot(updatedSlot);
    const nextState = await getAllData();
    res.json({ success: true, schedules: nextState.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const data = await getAllData();
    const slot = data.schedules.find((s) => s.id === id);

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const updatedSlot: ScheduleSlot = {
      ...slot,
      isCompleted: Boolean(isCompleted),
    };

    await insertScheduleSlot(updatedSlot);
    const nextState = await getAllData();
    res.json({ success: true, schedules: nextState.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedules/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    const { attendeeIds, attendeeNames } = req.body;
    const data = await getAllData();
    const slot = data.schedules.find((s) => s.id === id);

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const updatedSlot: ScheduleSlot = {
      ...slot,
      attendeeIds,
      attendeeNames,
    };

    await insertScheduleSlot(updatedSlot);
    const nextState = await getAllData();
    res.json({ success: true, schedules: nextState.schedules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite or Static assets mounting
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Votora] Server running on http://0.0.0.0:${PORT} (env: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
