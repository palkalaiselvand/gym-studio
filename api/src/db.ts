import Nedb from '@seald-io/nedb';
const Datastore: any = Nedb;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import type { Member, StudioDetails, StudioClass } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to persistent document database folder in database/data/
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.resolve(__dirname, '../../database/data'));
const SEEDS_DIR = path.resolve(__dirname, '../../database/seeds');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const membersDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'members.db'),
  autoload: true
});

export const studioDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'studio.db'),
  autoload: true
});

export const classesDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'classes.db'),
  autoload: true
});

export const classBookingsDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'class-bookings.db'),
  autoload: true
});

export const enrollmentsDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'enrollments.db'),
  autoload: true
});

export const usersDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'users.db'),
  autoload: true
});

export const sessionsDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'sessions.db'),
  autoload: true
});

export const configDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'config.db'),
  autoload: true
});

export const accessPassesDb: any = new Datastore({
  filename: path.join(DATA_DIR, 'access-passes.db'),
  autoload: true
});

export async function initDb(): Promise<void> {
  // Ensure indexes for fast document queries
  await membersDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await membersDb.ensureIndexAsync({ fieldName: 'email' });
  await classesDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await classBookingsDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await classBookingsDb.ensureIndexAsync({ fieldName: 'bookingKey', unique: true });
  await enrollmentsDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await enrollmentsDb.ensureIndexAsync({ fieldName: 'memberId', unique: true });
  await usersDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await usersDb.ensureIndexAsync({ fieldName: 'email', unique: true });
  await sessionsDb.ensureIndexAsync({ fieldName: 'tokenHash', unique: true });
  await configDb.ensureIndexAsync({ fieldName: 'key', unique: true });
  await accessPassesDb.ensureIndexAsync({ fieldName: 'memberId', unique: true });

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the first admin account');
  }
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    const existingAdmin = await usersDb.findOneAsync({ email: adminEmail, role: 'admin' });
    if (!existingAdmin) {
      const { hashPassword } = await import('./auth.js');
      await usersDb.insertAsync({
        id: `USR-${randomUUID()}`,
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        role: 'admin',
        memberId: null,
        studioId: process.env.STUDIO_ID || 'apex-main',
        createdAt: new Date().toISOString(),
        active: true
      });
      console.log(`🔐 Bootstrapped administrator ${adminEmail}`);
    }
  }

  const memberCount = await membersDb.countAsync({});
  if (memberCount === 0) {
    console.log('📦 Database is empty. Seeding initial documents from database/seeds/...');
    await seedDefaultData();
  } else {
    console.log(`✅ Loaded existing database: ${memberCount} members found in ${path.join(DATA_DIR, 'members.db')}`);
  }
}

export async function seedDefaultData(): Promise<void> {
  const membersSeedPath = path.join(SEEDS_DIR, 'members.json');
  const studioSeedPath = path.join(SEEDS_DIR, 'studio.json');

  if (fs.existsSync(membersSeedPath)) {
    const rawMembers = fs.readFileSync(membersSeedPath, 'utf-8');
    const membersList: Member[] = JSON.parse(rawMembers);
    await membersDb.removeAsync({}, { multi: true });
    await membersDb.insertAsync(membersList);
    console.log(`🌱 Seeded ${membersList.length} members into document store.`);
  }

  if (fs.existsSync(studioSeedPath)) {
    const rawStudio = fs.readFileSync(studioSeedPath, 'utf-8');
    const studioData: StudioDetails = JSON.parse(rawStudio);

    await studioDb.removeAsync({}, { multi: true });
    await studioDb.insertAsync(studioData);

    await classesDb.removeAsync({}, { multi: true });
    if (studioData.classes && studioData.classes.length > 0) {
      await classesDb.insertAsync(studioData.classes);
      console.log(`🌱 Seeded ${studioData.classes.length} classes into document store.`);
    }

    console.log(`🌱 Seeded studio details into document store.`);
  }
}

export async function resetDb(): Promise<void> {
  await seedDefaultData();
  await enrollmentsDb.removeAsync({}, { multi: true });
  await classBookingsDb.removeAsync({}, { multi: true });
  await accessPassesDb.removeAsync({}, { multi: true });
  await configDb.removeAsync({ key: 'access-pass-signing-key' }, {});
  const memberUsers = await usersDb.findAsync({ role: 'member' });
  for (const user of memberUsers) {
    await sessionsDb.removeAsync({ userId: user.id }, { multi: true });
    await usersDb.removeAsync({ id: user.id }, {});
  }
}
