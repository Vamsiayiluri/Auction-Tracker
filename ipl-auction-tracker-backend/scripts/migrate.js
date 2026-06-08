import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sequelize from "../src/config/dbconfig.js";
import {
  getMigrationStatus,
  revertLastMigration,
  runMigrations,
} from "../src/database/migrator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(__dirname, "..", "migrations");

const loadMigrations = async () => {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".js"))
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      name: file,
      ...(await import(pathToFileURL(resolve(migrationsDirectory, file)))),
    }))
  );
};

const command = process.argv[2] || "up";

try {
  await sequelize.authenticate();
  const migrations = await loadMigrations();

  if (command === "up") {
    const applied = await runMigrations({ sequelize, migrations });
    console.log(
      applied.length
        ? `Applied migrations: ${applied.join(", ")}`
        : "Database is already up to date"
    );
  } else if (command === "down") {
    const reverted = await revertLastMigration({ sequelize, migrations });
    console.log(reverted ? `Reverted migration: ${reverted}` : "No migration to revert");
  } else if (command === "status") {
    const status = await getMigrationStatus({ sequelize, migrations });
    status.forEach((migration) =>
      console.log(`${migration.status.padEnd(4)} ${migration.name}`)
    );
  } else {
    throw new Error(`Unknown migration command: ${command}`);
  }
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
