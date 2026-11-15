#!/usr/bin/env node
/**
 * Create the FuJue Platform schema and seed the demo account.
 *
 *   node scripts/db-init.mjs              schema, then seed
 *   node scripts/db-init.mjs --schema-only
 *   node scripts/db-init.mjs --seed-only
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

const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEMO_EMAIL = 'demo@fujue.ai'
const DEMO_PASSWORD = 'fujue123'
const DEMO_API_KEY = 'fjk_sk_demo0000000000000000000000000000000000'
const DEMO_KEY_ID = '22222222-2222-4222-8222-222222222222'

async function seed(connection) {
  await connection.execute(
    `INSERT INTO users (id, email, password_hash, name, locale, status, role, balance_usd, bonus_usd)
     VALUES (?, ?, ?, ?, 'vi', 'active', 'admin', 12.400000, 1.000000)
     ON DUPLICATE KEY UPDATE name = VALUES(name), locale = VALUES(locale), role = 'admin'`,
    [DEMO_USER_ID, DEMO_EMAIL, hashPassword(DEMO_PASSWORD), 'Người dùng Demo'],
  )

  await connection.execute(
    `INSERT INTO api_keys (id, user_id, name, prefix, key_hash)
     VALUES (?, ?, 'Khoá demo', 'fjk_sk_demo', SHA2(?, 256))
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [DEMO_KEY_ID, DEMO_USER_ID, DEMO_API_KEY],
  )

  const notifications = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      titleVi: 'Chào mừng bạn đến với FuJue Platform',
      titleEn: 'Welcome to FuJue Platform',
      bodyVi: 'Tài khoản của bạn đã sẵn sàng. Tạo API key để kết nối FuJue Harness Desktop hoặc gọi API từ ứng dụng của bạn.',
      bodyEn: 'Your account is ready. Create an API key to connect FuJue Harness Desktop or call the API from your app.',
      actionVi: 'Mở API key',
      actionEn: 'Open API keys',
      style: 'primary',
      data: JSON.stringify({ href: '/app/keys' }),
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      titleVi: 'Tặng 1.00 USD dùng thử',
      titleEn: '1.00 USD trial credit',
      bodyVi: 'Số dư thưởng đã được cộng vào tài khoản. Dùng cho mọi mô hình trong Playground hoặc qua API.',
      bodyEn: 'Trial credit has been added to your account. Use it with any model in the playground or through the API.',
      actionVi: 'Xem cách dùng',
      actionEn: 'See how to use it',
      style: 'secondary',
      data: JSON.stringify({ href: '/app/docs' }),
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      titleVi: 'Đồng bộ với ứng dụng Desktop',
      titleEn: 'Sync with the desktop app',
      bodyVi: 'Đăng nhập một lần trên trình duyệt, Desktop sẽ tự nhận phiên và danh sách mô hình từ FuJue Platform.',
      bodyEn: 'Sign in once in the browser and the desktop app receives the session and model catalog from FuJue Platform.',
      actionVi: 'Xem hướng dẫn',
      actionEn: 'Read the guide',
      style: 'primary',
      data: JSON.stringify({ href: '/app/docs' }),
    },
  ]
  for (const item of notifications) {
    await connection.execute(
      `INSERT INTO notifications
         (id, title_vi, title_en, body_vi, body_en, action_label_vi, action_label_en, action_style, audience, data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'all', ?)
       ON DUPLICATE KEY UPDATE
         title_vi = VALUES(title_vi), title_en = VALUES(title_en),
         body_vi = VALUES(body_vi), body_en = VALUES(body_en),
         action_label_vi = VALUES(action_label_vi), action_label_en = VALUES(action_label_en),
         action_style = VALUES(action_style), data_json = VALUES(data_json)`,
      [item.id, item.titleVi, item.titleEn, item.bodyVi, item.bodyEn, item.actionVi, item.actionEn, item.style, item.data],
    )
  }

  const [[countRow]] = await connection.query(
    'SELECT COUNT(*) AS total FROM usage_events WHERE user_id = ?',
    [DEMO_USER_ID],
  )
  if (Number(countRow.total) === 0) {
    const models = [
      { id: 'deepseek-flash', input: 0.14, output: 0.56, weight: 0.7 },
      { id: 'deepseek-v4-pro', input: 0.55, output: 2.2, weight: 0.3 },
    ]
    const sources = ['playground', 'api', 'desktop']
    for (let day = 13; day >= 0; day -= 1) {
      const requests = 3 + ((day * 7) % 9)
      for (let index = 0; index < requests; index += 1) {
        const model = Math.random() < models[0].weight ? models[0] : models[1]
        const promptTokens = 400 + Math.floor(Math.random() * 2600)
        const completionTokens = 120 + Math.floor(Math.random() * 900)
        const cost = (promptTokens * model.input + completionTokens * model.output) / 1_000_000
        await connection.execute(
          `INSERT INTO usage_events
             (user_id, api_key_id, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(3), INTERVAL ? DAY) - INTERVAL ? MINUTE)`,
          [
            DEMO_USER_ID,
            index % 3 === 0 ? DEMO_KEY_ID : null,
            model.id,
            promptTokens,
            completionTokens,
            promptTokens + completionTokens,
            cost.toFixed(8),
            sources[index % sources.length],
            day,
            index * 17,
          ],
        )
      }
    }
  }

  console.log(`seed: demo account ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`seed: demo API key ${DEMO_API_KEY}`)
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
