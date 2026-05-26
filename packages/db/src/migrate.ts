import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: join(__dirname, 'migrations') });
await sql.end();
console.info('Migrations complete');
