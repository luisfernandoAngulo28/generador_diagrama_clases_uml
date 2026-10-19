/**
 * One-off migration (1er → 2do Parcial): copies `diagrams` and
 * `diagram_history_entries` from PostgreSQL into MongoDB, keeping the
 * original UUIDs as `_id` so existing links keep working.
 *
 * Idempotent: every document is upserted by `_id`, so it's safe to re-run.
 * Diagram elements migrated from the 1er Parcial have no authorship stamps
 * (we don't know who created them); new edits will add them.
 *
 * Usage (reads the same env vars as the backend: DB_* and MONGO_URI):
 *   local:  npm run build && node --env-file=.env dist/scripts/migrate-pg-to-mongo.js
 *   server: docker compose -f docker-compose.prod.yml exec backend node dist/scripts/migrate-pg-to-mongo.js
 */
import pg from 'pg';
import mongoose from 'mongoose';

interface PgDiagramRow {
  id: string;
  name: string;
  model: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface PgHistoryRow {
  id: string;
  diagramId: string;
  userId: string;
  userName: string;
  summary: string;
  createdAt: Date;
}

async function tableExists(client: pg.Client, table: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${table}`],
  );
  return rows[0]?.exists ?? false;
}

async function main(): Promise<void> {
  const env = process.env;
  const pgClient = new pg.Client({
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    user: env.DB_USERNAME ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'case_tool',
  });
  const mongoUri = env.MONGO_URI ?? 'mongodb://localhost:27017/case_tool';

  await pgClient.connect();
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No se pudo abrir la base de datos MongoDB');

  try {
    if (await tableExists(pgClient, 'diagrams')) {
      const { rows } = await pgClient.query<PgDiagramRow>(
        'SELECT id, name, model, "createdAt", "updatedAt" FROM diagrams',
      );
      if (rows.length) {
        const result = await db.collection<{ _id: string }>('diagrams').bulkWrite(
          rows.map((row) => ({
            updateOne: {
              filter: { _id: row.id },
              update: {
                $setOnInsert: {
                  name: row.name,
                  model: row.model,
                  createdAt: row.createdAt,
                  updatedAt: row.updatedAt,
                },
              },
              upsert: true,
            },
          })),
        );
        console.log(`diagrams: ${rows.length} leídos, ${result.upsertedCount} insertados`);
      } else {
        console.log('diagrams: tabla vacía');
      }
    } else {
      console.log('diagrams: la tabla no existe en PostgreSQL, nada que migrar');
    }

    if (await tableExists(pgClient, 'diagram_history_entries')) {
      const { rows } = await pgClient.query<PgHistoryRow>(
        'SELECT id, "diagramId", "userId", "userName", summary, "createdAt" FROM diagram_history_entries',
      );
      if (rows.length) {
        const result = await db.collection<{ _id: string }>('diagram_activity_logs').bulkWrite(
          rows.map((row) => ({
            updateOne: {
              filter: { _id: row.id },
              update: {
                $setOnInsert: {
                  diagramId: row.diagramId,
                  actor: { userId: row.userId, userName: row.userName, type: 'USER' },
                  action: 'LEGACY_HISTORY',
                  target: { entityType: 'DIAGRAM', entityId: row.diagramId },
                  details: {},
                  summary: row.summary,
                  timestamp: row.createdAt,
                },
              },
              upsert: true,
            },
          })),
        );
        console.log(`historial: ${rows.length} leídos, ${result.upsertedCount} insertados`);
      } else {
        console.log('historial: tabla vacía');
      }
    } else {
      console.log('historial: la tabla no existe en PostgreSQL, nada que migrar');
    }
  } finally {
    await pgClient.end();
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('La migración falló:', err);
  process.exit(1);
});
