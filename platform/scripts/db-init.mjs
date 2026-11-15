#!/usr/bin/env node
/**
 * Create the FuJue Platform schema and seed the owner account.
 *
 *   node scripts/db-init.mjs              schema, then seed
 *   node scripts/db-init.mjs --schema-only
 *   node scripts/db-init.mjs --seed-only
 *
 * The owner account comes from PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, and
 * PLATFORM_ADMIN_NAME, defaulting to quyetguic@gmail.com / quyet12345. The password
 * is written only when the row is created.
 *
 * The connection comes from DATABASE_URL, or from MYSQL_HOST / MYSQL_PORT /
 * MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE. .env and .env.local in the
 * platform directory are read when present, like Next.js does.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync } from 'node:crypto'
import mysql from 'mysql2/promise'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(join(root, file))
  } catch {
    // Absent dotenv files are expected; real configuration may come from the shell.
  }
}

const args = new Set(process.argv.slice(2))
const schemaOnly = args.has('--schema-only')
const seedOnly = args.has('--seed-only')

function databaseSettings() {
  const url = process.env.DATABASE_URL?.trim()
  if (url) {
    const parsed = new URL(url)
    if (parsed.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql: scheme')
    const database = parsed.pathname.replace(/^\//, '')
    if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('DATABASE_URL must name a database')
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
    }
  }
  const database = process.env.MYSQL_DATABASE?.trim() || 'fujue_platform'
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('MYSQL_DATABASE must be a plain identifier')
  return {
    host: process.env.MYSQL_HOST?.trim() || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT?.trim() || 3306),
    user: process.env.MYSQL_USER?.trim() || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database,
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const digest = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${digest}`
}

const OWNER_USER_ID = '11111111-1111-4111-8111-111111111111'
const OWNER_EMAIL = process.env.PLATFORM_ADMIN_EMAIL?.trim() || 'quyetguic@gmail.com'
const OWNER_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'quyet12345'
const OWNER_NAME = process.env.PLATFORM_ADMIN_NAME?.trim() || 'QuyetGuic'

async function seed(connection) {
  // The password is set only when the row is created: re-running the seed must not
  // reset a password the owner has since changed.
  await connection.execute(
    `INSERT INTO users (id, email, password_hash, name, locale, status, role, balance_usd, bonus_usd)
     VALUES (?, ?, ?, ?, 'vi', 'active', 'admin', 0, 0)
     ON DUPLICATE KEY UPDATE name = VALUES(name), locale = VALUES(locale), role = 'admin', status = 'active'`,
    [OWNER_USER_ID, OWNER_EMAIL, hashPassword(OWNER_PASSWORD), OWNER_NAME],
  )

  console.log(`seed: admin account ${OWNER_EMAIL}`)
  console.log('seed: change the password after the first sign-in')
}

async function migrate(connection) {
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
  )
  if (columns.length === 0) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER status",
    )
    console.log('db:init: added users.role')
  }

  const [reasoningColumns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'models'
       AND COLUMN_NAME IN ('reasoning_enabled', 'reasoning_levels', 'reasoning_default')`,
  )
  if (reasoningColumns.length !== 0 && reasoningColumns.length !== 3) {
    throw new Error('models has a partial reasoning column set; restore the missing columns by hand')
  }
  if (reasoningColumns.length === 0) {
    await connection.query(
      `ALTER TABLE models
         ADD COLUMN reasoning_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER upstream_id,
         ADD COLUMN reasoning_levels TEXT NOT NULL AFTER reasoning_enabled,
         ADD COLUMN reasoning_default VARCHAR(40) NOT NULL DEFAULT 'off' AFTER reasoning_levels`,
    )
    // Rows created before the columns existed start from the code catalog policy.
    await connection.query(
      "UPDATE models SET reasoning_enabled = 1, reasoning_default = 'high' WHERE id = 'deepseek-v4-pro'",
    )
    await connection.query("UPDATE models SET reasoning_enabled = 1 WHERE id = 'deepseek-flash'")
    console.log('db:init: added models reasoning columns')
  }

  const [levelColumns] = await connection.query(
    `SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'models' AND COLUMN_NAME = 'reasoning_levels'`,
  )
  if (levelColumns.length === 1 && String(levelColumns[0].DATA_TYPE).toLowerCase() !== 'text') {
    // Level rows became editable id/API-value pairs, so the column stores JSON.
    await connection.query('ALTER TABLE models MODIFY COLUMN reasoning_levels TEXT NOT NULL')
    await connection.query("ALTER TABLE models MODIFY COLUMN reasoning_default VARCHAR(40) NOT NULL DEFAULT 'off'")
    const levels = JSON.stringify([
      { id: 'off', apiValue: '' },
      { id: 'low', apiValue: 'low' },
      { id: 'medium', apiValue: 'medium' },
      { id: 'high', apiValue: 'high' },
    ])
    const [legacy] = await connection.query("SELECT id FROM models WHERE reasoning_levels NOT LIKE '[%'")
    for (const row of legacy) {
      await connection.query('UPDATE models SET reasoning_levels = ? WHERE id = ?', [levels, row.id])
    }
    console.log(`db:init: converted ${legacy.length} model reasoning policies to JSON levels`)
  }

  const [metaColumns] = await connection.query(
    `SELECT DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'platform_meta' AND COLUMN_NAME = 'meta_value'`,
  )
  if (metaColumns.length === 1 && String(metaColumns[0].DATA_TYPE).toLowerCase() !== 'text') {
    // Installer links are stored as one JSON document and exceed the original
    // 255-character column.
    await connection.query('ALTER TABLE platform_meta MODIFY COLUMN meta_value TEXT NOT NULL')
    console.log('db:init: widened platform_meta.meta_value')
  }
}

async function main() {
  const { database, ...connection } = databaseSettings()
  const server = await mysql.createConnection({ ...connection, multipleStatements: true })
  try {
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await server.query(`USE \`${database}\``)
    // Match the application pool: stored timestamps are UTC regardless of the host zone.
    await server.query("SET SESSION time_zone = '+00:00'")
    if (!seedOnly) {
      const schema = readFileSync(join(root, 'db', 'schema.sql'), 'utf8')
      await server.query(schema)
      await migrate(server)
      console.log(`db:init: schema applied to ${database}`)
    }
    if (!schemaOnly) await seed(server)
  } finally {
    await server.end()
  }
}

main().catch((error) => {
  console.error(`db:init failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
