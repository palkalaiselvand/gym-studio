import Nedb from '@seald-io/nedb';
const Datastore: any = Nedb;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Member, StudioDetails, StudioClass } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to persistent document database folder in database/data/
const DATA_DIR = path.resolve(__dirname, '../../database/data');
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

export async function initDb(): Promise<void> {
  // Ensure indexes for fast document queries
  await membersDb.ensureIndexAsync({ fieldName: 'id', unique: true });
  await membersDb.ensureIndexAsync({ fieldName: 'email' });
  await classesDb.ensureIndexAsync({ fieldName: 'id', unique: true });

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
    await membersDb.dropDatabaseAsync();
    await membersDb.insertAsync(membersList);
    console.log(`🌱 Seeded ${membersList.length} members into document store.`);
  }

  if (fs.existsSync(studioSeedPath)) {
    const rawStudio = fs.readFileSync(studioSeedPath, 'utf-8');
    const studioData: StudioDetails = JSON.parse(rawStudio);

    await studioDb.dropDatabaseAsync();
    await studioDb.insertAsync(studioData);

    await classesDb.dropDatabaseAsync();
    if (studioData.classes && studioData.classes.length > 0) {
      await classesDb.insertAsync(studioData.classes);
      console.log(`🌱 Seeded ${studioData.classes.length} classes into document store.`);
    }

    console.log(`🌱 Seeded studio details into document store.`);
  }
}

export async function resetDb(): Promise<void> {
  await seedDefaultData();
}
