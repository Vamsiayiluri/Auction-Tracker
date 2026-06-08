import { DataTypes } from "sequelize";

const META_TABLE = "SequelizeMeta";

const ensureMetaTable = async (queryInterface) => {
  const tables = (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

  if (!tables.includes(META_TABLE)) {
    await queryInterface.createTable(META_TABLE, {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
    });
  }
};

const getAppliedNames = async (sequelize) => {
  const [rows] = await sequelize.query(
    `SELECT name FROM \`${META_TABLE}\` ORDER BY name ASC`
  );
  return rows.map((row) => row.name);
};

export const runMigrations = async ({ sequelize, migrations }) => {
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface);

  const applied = new Set(await getAppliedNames(sequelize));
  const pending = migrations
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((migration) => !applied.has(migration.name));

  for (const migration of pending) {
    await migration.up({ queryInterface, Sequelize: sequelize.constructor });
    await queryInterface.bulkInsert(META_TABLE, [{ name: migration.name }]);
  }

  return pending.map((migration) => migration.name);
};

export const revertLastMigration = async ({ sequelize, migrations }) => {
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface);

  const appliedNames = await getAppliedNames(sequelize);
  const lastName = appliedNames.at(-1);
  if (!lastName) return null;

  const migration = migrations.find((candidate) => candidate.name === lastName);
  if (!migration) {
    throw new Error(`Applied migration is missing from disk: ${lastName}`);
  }

  await migration.down({ queryInterface, Sequelize: sequelize.constructor });
  await queryInterface.bulkDelete(META_TABLE, { name: lastName });
  return lastName;
};

export const getMigrationStatus = async ({ sequelize, migrations }) => {
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface);
  const applied = new Set(await getAppliedNames(sequelize));

  return migrations
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((migration) => ({
      name: migration.name,
      status: applied.has(migration.name) ? "up" : "down",
    }));
};
