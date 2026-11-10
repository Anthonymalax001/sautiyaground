import dotenv from 'dotenv'
import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Client } = pg
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.development.local') })

if (process.env.NEON_BRANCH !== 'sauti-dev') {
  throw new Error('Refusing to migrate: NEON_BRANCH must be sauti-dev.')
}

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED is required for migrations.')
}

if (new URL(process.env.DATABASE_URL_UNPOOLED).hostname.includes('-pooler')) {
  throw new Error('Refusing to migrate over a pooled connection.')
}

const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED })
await client.connect()

try {
  await client.query('BEGIN')
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await client.query('COMMIT')

  const migrationsDirectory = path.join(root, 'db', 'migrations')
  const migrations = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort()
  for (const name of migrations) {
    const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name])
    if (rowCount) continue
    const sql = await readFile(path.join(migrationsDirectory, name), 'utf8')
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
      await client.query('COMMIT')
      console.log(`Applied ${name}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }

  const seedsDirectory = path.join(root, 'db', 'seeds')
  const seeds = (await readdir(seedsDirectory)).filter((name) => name.endsWith('.sql')).sort()
  for (const name of seeds) {
    const sql = await readFile(path.join(seedsDirectory, name), 'utf8')
    await client.query(sql)
    console.log(`Applied seed ${name}`)
  }
} finally {
  await client.end()
}
