/** One shared MySQL pool per server process. */
import mysql from 'mysql2/promise'
import { databaseConfig } from './env'

let shared: mysql.Pool | undefined

/**
 * Read the process-wide pool, creating it on first use.
 *
 * @returns the pool configured for the deployment database.
 */
export function pool(): mysql.Pool {
  if (shared === undefined) {
    const created = mysql.createPool({
      ...databaseConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
      charset: 'utf8mb4',
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false,
      // Report matched rows instead of changed rows so an update that rewrites
      // the stored value still distinguishes "row missing" from "no change".
      flags: ['FOUND_ROWS'],
    })
    // `NOW()`, column defaults, and JavaScript `Date` parameters must describe
    // the same instant, so every connection reads and writes UTC. The core pool
    // emits new connections before handing them to a query.
    created.pool.on('connection', connection => {
      connection.query("SET time_zone = '+00:00'", error => {
        if (error !== null) console.error('[db] could not switch the session time zone to UTC', error)
      })
    })
    shared = created
  }
  return shared
}

/**
 * Run one statement and return its rows.
 *
 * @param sql - statement text with `?` placeholders.
 * @param params - positional values.
 * @returns typed rows.
 */
export async function rows<T extends mysql.RowDataPacket>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
  const [result] = await pool().query<T[]>(sql, params as unknown[])
  return result
}

/**
 * Run one write statement.
 *
 * @param sql - statement text with `?` placeholders.
 * @param params - positional values.
 * @returns the driver result with affected rows and insert id.
 */
export async function write(sql: string, params: readonly unknown[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await pool().query<mysql.ResultSetHeader>(sql, params as unknown[])
  return result
}

/**
 * Detect a unique-key violation.
 *
 * @param error - value thrown by the driver.
 * @returns whether MySQL rejected the write because the key already exists.
 */
export function isDuplicateEntry(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
}
