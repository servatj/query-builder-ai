import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import mysql, { RowDataPacket } from 'mysql2/promise';

type SchemaTable = { columns: string[]; description: string };
type SchemaMap = Record<string, SchemaTable>;

interface RulesFile {
  schema: SchemaMap;
  query_patterns: any[];
}

const getDatabaseNameFromUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    // pathname may start with '/'
    const db = u.pathname.replace(/^\//, '');
    return db || null;
  } catch {
    return null;
  }
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not configured. Set it to run schema generation.');
    process.exit(1);
  }

  const includeTables = process.env.SCHEMA_INCLUDE_TABLES
    ? new Set(
        process.env.SCHEMA_INCLUDE_TABLES
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

  const excludeTables = process.env.SCHEMA_EXCLUDE_TABLES
    ? new Set(
        process.env.SCHEMA_EXCLUDE_TABLES
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : new Set<string>();

  const connection = await mysql.createConnection(databaseUrl);
  try {
    // Determine current DB name
  const urlDb = getDatabaseNameFromUrl(databaseUrl);
    let dbName = urlDb;
    if (!dbName) {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT DATABASE() AS `Database`'
      );
      dbName = (rows?.[0] as any)?.Database || null;
    }
    if (!dbName) {
      throw new Error('Could not determine database name.');
    }

    // Fetch tables
    const [tables] = await connection.query<RowDataPacket[]>(
      'SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [dbName]
    );

    const schema: SchemaMap = {};

    for (const t of tables as any[]) {
      const table = t.TABLE_NAME as string;
      if (includeTables && !includeTables.has(table)) continue;
      if (excludeTables.has(table)) continue;

      const [cols] = await connection.query<RowDataPacket[]>(
        'SELECT COLUMN_NAME, COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
        [dbName, table]
      );
      const columns = (cols as any[]).map((c) => c.COLUMN_NAME as string);
      const description = ((t.TABLE_COMMENT as string) || '').trim();
      schema[table] = {
        columns,
        description: description || `Table ${table}`,
      };
    }

    // Read current rules.json
    const rulesPath = path.join(__dirname, '..', 'rules.json');
    const raw = await fs.readFile(rulesPath, 'utf-8');
    const rules: RulesFile = JSON.parse(raw);

    // Update schema while preserving query_patterns
    const updated: RulesFile = {
      ...rules,
      schema,
    };

    await fs.writeFile(rulesPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    console.log(`✅ Updated schema for ${Object.keys(schema).length} tables in rules.json`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Schema generation failed:', err);
  process.exit(1);
});
