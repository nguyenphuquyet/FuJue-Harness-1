#!/usr/bin/env node
/**
 * Apply the FuJue Platform content seed: providers and models rows exported from
 * another deployment. Rows are upserted by primary key, so re-running is safe.
 *
 *   node scripts/apply-content.mjs [path-to-seed.json]
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(join(root, file))
  } catch {
    // Absent dotenv files are expected; configuration may come from the shell.
  }
}

const seedPath = process.argv[2] ?? join(root, 'seed-content.json')
const content = JSON.parse(readFileSync(seedPath, 'utf8'))

const url = process.env.DATABASE_URL?.trim()
if (!url) throw new Error('DATABASE_URL is required')
const parsed = new URL(url)
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
})

for (const [table, rows] of Object.entries(content)) {
  if (table === 'platform_meta' || rows.length === 0) continue
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [table],
  )
  const names = columns.map(column => column.COLUMN_NAME)
  const primary = 'id'
  const assignments = names.filter(name => name !== primary)
    .map(name => `\`${name}\` = VALUES(\`${name}\`)`).join(', ')
  const statement = `INSERT INTO \`${table}\` (${names.map(name => `\`${name}\``).join(', ')})
    VALUES (${names.map(() => '?').join(', ')})
    ON DUPLICATE KEY UPDATE ${assignments}`
  for (const row of rows) {
    const values = names.map(name => {
      const value = row[name]
      if (value !== null && typeof value === 'object') return JSON.stringify(value)
      // An exported row carries its timestamps as ISO strings; MySQL DATETIME takes UTC `YYYY-MM-DD HH:MM:SS.mmm`.
      const iso = typeof value === 'string' ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)Z$/.exec(value) : null
      return iso === null ? value : `${iso[1]} ${iso[2]}`
    })
    await connection.execute(statement, values)
  }
  console.log(`apply-content: ${rows.length} row(s) into ${table}`)
}

await connection.end()
