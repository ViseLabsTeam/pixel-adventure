import { migrate } from "./migrate.js";
import { pool } from "./database.js";
try {
  await migrate();
  console.log("Migraciones aplicadas.");
} finally {
  await pool.end();
}
