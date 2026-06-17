import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const { default: sequelizeDb } = await import("./config/dbconfig.js");

async function clearDatabase() {
  try {
    await sequelizeDb.authenticate();

    const [tables] = await sequelizeDb.query("SHOW TABLES");

    await sequelizeDb.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const row of tables) {
      const tableName = Object.values(row)[0];

      if (tableName === "SequelizeMeta") continue;

      console.log(`Truncating ${tableName}`);

      await sequelizeDb.query(`TRUNCATE TABLE \`${tableName}\``);
    }

    await sequelizeDb.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Database cleared successfully");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

clearDatabase();