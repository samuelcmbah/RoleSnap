// db.ts
import { createClient } from '@libsql/client'
import { Bindings } from '../../shared/types/Bindings'

let db: ReturnType<typeof createClient> | null = null

export const getDbClient = (env: Bindings) => {
  if (!db) {
    db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN
    })
    console.log('DB client created once')
    console.log('URL:', env.TURSO_DATABASE_URL)
  }

  return db
}

export type DbClient = ReturnType<typeof getDbClient>
