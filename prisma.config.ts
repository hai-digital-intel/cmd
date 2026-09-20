import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma ORM 7 moved connection config out of schema.prisma. The CLI (migrate/studio)
// reads the connection from here; the running app instantiates its own driver adapter
// in lib/db/client.ts. Keeping both pointed at the same DATABASE_URL keeps them in sync.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
