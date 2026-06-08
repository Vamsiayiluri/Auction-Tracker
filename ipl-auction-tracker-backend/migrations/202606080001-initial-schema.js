const timestampColumns = (Sequelize) => ({
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn("NOW"),
  },
  updatedAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn("NOW"),
  },
});

const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

const createTableIfMissing = async (
  queryInterface,
  existingTables,
  tableName,
  columns
) => {
  if (!existingTables.includes(tableName)) {
    await queryInterface.createTable(tableName, columns);
    existingTables.push(tableName);
  }
};

const addColumnIfMissing = async (
  queryInterface,
  tableName,
  columnName,
  definition
) => {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  const existingTables = await tableNames(queryInterface);

  await createTableIfMissing(queryInterface, existingTables, "Users", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: true },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    password: { type: Sequelize.STRING, allowNull: false },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "spectator",
    },
    isVerified: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verificationToken: { type: Sequelize.STRING, allowNull: true },
    verificationExpires: { type: Sequelize.DATE, allowNull: true },
    resetPasswordToken: { type: Sequelize.STRING, allowNull: true },
    resetPasswordExpires: { type: Sequelize.DATE, allowNull: true },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "Tournaments", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: false },
    budget: { type: Sequelize.INTEGER, allowNull: false },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "upcoming",
    },
    createdBy: { type: Sequelize.STRING, allowNull: false },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "Teams", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: false, unique: true },
    ownerId: { type: Sequelize.STRING, allowNull: false },
    totalAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2000000,
    },
    amountSpent: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tournamentId: { type: Sequelize.STRING, allowNull: true },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "Players", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    name: { type: Sequelize.STRING, allowNull: false },
    basePrice: { type: Sequelize.FLOAT, allowNull: false },
    soldPrice: { type: Sequelize.FLOAT, allowNull: true },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Batsman",
    },
    isSold: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isInAuction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    teamId: { type: Sequelize.STRING, allowNull: true },
    tournamentId: { type: Sequelize.STRING, allowNull: true },
    auctionId: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "",
    },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "Auctions", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "upcoming",
    },
    currentPlayerId: { type: Sequelize.STRING, allowNull: true },
    tournamentId: { type: Sequelize.STRING, allowNull: true },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "Bids", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    playerId: { type: Sequelize.STRING, allowNull: false },
    tournamentId: { type: Sequelize.STRING, allowNull: true },
    teamName: { type: Sequelize.STRING, allowNull: false },
    teamId: { type: Sequelize.STRING, allowNull: false },
    bidAmount: { type: Sequelize.INTEGER, allowNull: false },
    ownerId: { type: Sequelize.STRING, allowNull: true },
    ...timestampColumns(Sequelize),
  });

  await createTableIfMissing(queryInterface, existingTables, "TournamentTeams", {
    id: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
    tournamentId: { type: Sequelize.STRING, allowNull: false },
    teamId: { type: Sequelize.STRING, allowNull: false },
    totalAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    amountSpent: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ...timestampColumns(Sequelize),
  });

  await addColumnIfMissing(queryInterface, "Users", "resetPasswordToken", {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "Users", "resetPasswordExpires", {
    type: Sequelize.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "Auctions", "tournamentId", {
    type: Sequelize.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "Bids", "tournamentId", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await queryInterface.sequelize.query(`
    UPDATE Users
    SET isVerified = true
    WHERE isVerified = false AND verificationToken IS NULL
  `);
  await queryInterface.sequelize.query(`
    INSERT INTO TournamentTeams
      (id, tournamentId, teamId, totalAmount, amountSpent, createdAt, updatedAt)
    SELECT CONCAT(Teams.tournamentId, '-', Teams.id), Teams.tournamentId,
      Teams.id, Teams.totalAmount, Teams.amountSpent, NOW(), NOW()
    FROM Teams
    WHERE Teams.tournamentId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM TournamentTeams
        WHERE TournamentTeams.tournamentId = Teams.tournamentId
          AND TournamentTeams.teamId = Teams.id
      )
  `);
  await queryInterface.sequelize.query(`
    UPDATE Bids
    INNER JOIN Players ON Bids.playerId = Players.id
    SET Bids.tournamentId = Players.tournamentId
    WHERE Bids.tournamentId IS NULL
      AND Players.tournamentId IS NOT NULL
  `);
  await queryInterface.sequelize.query(`
    UPDATE Auctions
    INNER JOIN Players ON Auctions.currentPlayerId = Players.id
    SET Auctions.tournamentId = Players.tournamentId
    WHERE Auctions.tournamentId IS NULL
      AND Players.tournamentId IS NOT NULL
  `);
};

export const down = async () => {
  throw new Error(
    "The baseline migration is intentionally non-destructive and cannot be reverted"
  );
};
