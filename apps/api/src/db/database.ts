import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DATA_DIR = "local-data";

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true });
};

export const resolveDataDir = () => {
  const baseDir = process.env.APP_USER_DATA_DIR;
  if (baseDir && baseDir.trim().length > 0) {
    return baseDir;
  }

  return resolve(process.cwd(), DEFAULT_DATA_DIR);
};

export const resolveDatabasePath = () => {
  const dataDir = resolveDataDir();
  const dbDir = join(dataDir, "db");
  ensureDir(dbDir);
  return join(dbDir, "schedule.db");
};

const getMigrationDir = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, "..", "..", "migrations");
};

const runMigrations = (db: Database.Database) => {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL);"
  );

  const migrationDir = getMigrationDir();
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const appliedStatement = db.prepare(
    "SELECT filename FROM schema_migrations WHERE filename = ?"
  );
  const insertStatement = db.prepare(
    "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)"
  );

  for (const file of migrationFiles) {
    const alreadyApplied = appliedStatement.get(file) as { filename: string } | undefined;
    if (alreadyApplied) {
      continue;
    }

    const sql = readFileSync(join(migrationDir, file), "utf-8");
    const timestamp = new Date().toISOString();

    const apply = db.transaction(() => {
      db.exec(sql);
      insertStatement.run(file, timestamp);
    });

    apply();
  }
};

let database: Database.Database | null = null;

export const getDatabase = () => {
  if (!database) {
    const dbPath = resolveDatabasePath();
    database = new Database(dbPath);
    runMigrations(database);
  }

  return database;
};
