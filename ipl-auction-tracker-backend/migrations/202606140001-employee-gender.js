const EMPLOYEES_TABLE = "Employees";

const tableExists = async (queryInterface, tableName) =>
  (await queryInterface.showAllTables()).some((table) => {
    const name = typeof table === "string" ? table : table.tableName;
    return String(name).toLowerCase() === tableName.toLowerCase();
  });

const indexFields = (index) =>
  (index.fields || []).map((field) => field.attribute || field.name);

const ensureIndex = async (
  queryInterface,
  tableName,
  fields,
  options
) => {
  const indexes = await queryInterface.showIndex(tableName);
  const named = indexes.find((index) => index.name === options.name);

  if (
    named &&
    (indexFields(named).join(",") !== fields.join(",") ||
      Boolean(named.unique) !== Boolean(options.unique))
  ) {
    throw new Error(
      `Index ${options.name} exists with an incompatible definition`
    );
  }

  if (!named) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, EMPLOYEES_TABLE))) {
    throw new Error("Employees must exist before employee gender migration");
  }

  let columns = await queryInterface.describeTable(EMPLOYEES_TABLE);
  if (!columns.gender) {
    await queryInterface.addColumn(EMPLOYEES_TABLE, "gender", {
      type: Sequelize.ENUM("male", "female"),
      allowNull: true,
    });
  }

  // Existing records have no reliable gender source. Keep the schema usable,
  // but flag every placeholder for explicit HR/admin review.
  await queryInterface.sequelize.query(`
    UPDATE Employees
    SET gender = 'male',
        identityStatus = 'needs_review',
        updatedAt = NOW()
    WHERE gender IS NULL
  `);

  columns = await queryInterface.describeTable(EMPLOYEES_TABLE);
  if (columns.gender.allowNull !== false) {
    await queryInterface.changeColumn(EMPLOYEES_TABLE, "gender", {
      type: Sequelize.ENUM("male", "female"),
      allowNull: false,
    });
  }

  await ensureIndex(queryInterface, EMPLOYEES_TABLE, ["gender"], {
    name: "employees_gender_idx",
  });
};

export const down = async ({ queryInterface }) => {
  if (!(await tableExists(queryInterface, EMPLOYEES_TABLE))) return;

  const indexes = await queryInterface.showIndex(EMPLOYEES_TABLE);
  if (indexes.some((index) => index.name === "employees_gender_idx")) {
    await queryInterface.removeIndex(
      EMPLOYEES_TABLE,
      "employees_gender_idx"
    );
  }

  const columns = await queryInterface.describeTable(EMPLOYEES_TABLE);
  if (columns.gender) {
    await queryInterface.removeColumn(EMPLOYEES_TABLE, "gender");
  }
};
