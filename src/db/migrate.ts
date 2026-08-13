import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pool } from "./db";
import { pathToFileURL } from "node:url";

const MIGRATION_LOCK_ID: number = 987654321;

export async function migrate(
  dir = join(process.cwd(), "migrations"),
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name    TEXT PRIMARY KEY,
      run_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()  
    )
  `);

  const applied = new Set(
    (
      await pool.query<{ name: string }>("SELECT name FROM _migrations")
    ).rows.map((row) => row.name),
  );

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf-8");
    const client = await pool.connect();

    try {
      await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.log(`Error applying migration: ${file}`, err);
      throw err;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
      client.release();
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
