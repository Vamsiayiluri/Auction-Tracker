const FESTIVALS_TABLE = "Festivals";
const MODE_INDEX = "festivals_roster_formation_mode_idx";

const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

const tableExists = async (queryInterface, tableName) =>
  (await tableNames(queryInterface)).some(
    (existingName) =>
      String(existingName).toLowerCase() === tableName.toLowerCase()
  );

const normalizeIndexFields = (index) =>
  index.fields.map((field) => field.attribute || field.name);

const ensureIndex = async (queryInterface, tableName, fields, options) => {
  const indexes = await queryInterface.showIndex(tableName);
  const namedIndex = indexes.find((index) => index.name === options.name);
  if (
    namedIndex &&
    (normalizeIndexFields(namedIndex).join(",") !== fields.join(",") ||
      Boolean(namedIndex.unique) !== Boolean(options.unique))
  ) {
    throw new Error(
      `Index ${options.name} exists with an incompatible definition`
    );
  }

  const exists =
    Boolean(namedIndex) ||
    indexes.some(
      (index) =>
        normalizeIndexFields(index).join(",") === fields.join(",") &&
        Boolean(index.unique) === Boolean(options.unique)
    );
  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, FESTIVALS_TABLE))) {
    throw new Error(
      "Festivals must exist before the roster formation mode migration"
    );
  }

  const columns = await queryInterface.describeTable(FESTIVALS_TABLE);
  if (!columns.rosterFormationMode) {
    await queryInterface.addColumn(
      FESTIVALS_TABLE,
      "rosterFormationMode",
      {
        type: Sequelize.ENUM("auction", "manual"),
        allowNull: false,
        defaultValue: "auction",
      }
    );
  }

  await queryInterface.sequelize.query(
    "UPDATE `Festivals` SET `rosterFormationMode` = 'auction' WHERE `rosterFormationMode` IS NULL"
  );
  await ensureIndex(
    queryInterface,
    FESTIVALS_TABLE,
    ["rosterFormationMode"],
    { name: MODE_INDEX }
  );
};

export const down = async ({ queryInterface }) => {
  if (!(await tableExists(queryInterface, FESTIVALS_TABLE))) return;

  const indexes = await queryInterface.showIndex(FESTIVALS_TABLE);
  if (indexes.some((index) => index.name === MODE_INDEX)) {
    await queryInterface.removeIndex(FESTIVALS_TABLE, MODE_INDEX);
  }

  const columns = await queryInterface.describeTable(FESTIVALS_TABLE);
  if (columns.rosterFormationMode) {
    await queryInterface.removeColumn(
      FESTIVALS_TABLE,
      "rosterFormationMode"
    );
  }
};
