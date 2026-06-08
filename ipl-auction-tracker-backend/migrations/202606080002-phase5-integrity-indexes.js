const normalizeFieldNames = (index) =>
  index.fields.map((field) => field.attribute || field.name);

const ensureIndex = async (queryInterface, tableName, fields, options = {}) => {
  const indexes = await queryInterface.showIndex(tableName);
  const exists = indexes.some(
    (index) =>
      normalizeFieldNames(index).join(",") === fields.join(",") &&
      Boolean(index.unique) === Boolean(options.unique)
  );

  if (!exists) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

const assertNoRows = async (queryInterface, sql, message) => {
  const [rows] = await queryInterface.sequelize.query(sql);
  if (Number(rows[0]?.invalidCount || 0) > 0) {
    throw new Error(message);
  }
};

const ensureForeignKey = async (
  queryInterface,
  tableName,
  field,
  referencedTable,
  options
) => {
  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  const exists = references.some(
    (reference) =>
      reference.columnName === field &&
      reference.referencedTableName === referencedTable
  );

  if (!exists) {
    await queryInterface.addConstraint(tableName, {
      fields: [field],
      type: "foreign key",
      references: { table: referencedTable, field: "id" },
      ...options,
    });
  }
};

const removeConstraintIfPresent = async (
  queryInterface,
  tableName,
  constraintName
) => {
  const references =
    await queryInterface.getForeignKeyReferencesForTable(tableName);
  if (
    references.some(
      (reference) => reference.constraintName === constraintName
    )
  ) {
    await queryInterface.removeConstraint(tableName, constraintName);
  }
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    await queryInterface.removeIndex(tableName, indexName);
  }
};

export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.sequelize.query(`
    UPDATE Players SET role = 'Batsman' WHERE LOWER(role) = 'batsman'
  `);
  await queryInterface.sequelize.query(`
    UPDATE Players SET role = 'Bowler' WHERE LOWER(role) = 'bowler'
  `);
  await queryInterface.sequelize.query(`
    UPDATE Players SET role = 'All-rounder'
    WHERE LOWER(role) IN ('all-rounder', 'allrounder', 'all rounder')
  `);
  await queryInterface.sequelize.query(`
    UPDATE Players SET role = 'Wicketkeeper'
    WHERE LOWER(role) IN ('wicketkeeper', 'wicket-keeper', 'wicket keeper')
  `);

  await assertNoRows(
    queryInterface,
    `SELECT COUNT(*) AS invalidCount FROM Users
     WHERE role IS NULL OR role NOT IN ('admin', 'team_owner', 'spectator')`,
    "Users contains unsupported role values; correct them before migrating"
  );
  await assertNoRows(
    queryInterface,
    `SELECT COUNT(*) AS invalidCount FROM Tournaments
     WHERE status IS NULL OR status NOT IN ('upcoming', 'live', 'completed')`,
    "Tournaments contains unsupported status values; correct them before migrating"
  );
  await assertNoRows(
    queryInterface,
    `SELECT COUNT(*) AS invalidCount FROM Players
     WHERE role IS NULL
       OR role NOT IN ('Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper')`,
    "Players contains unsupported role values; correct them before migrating"
  );
  await assertNoRows(
    queryInterface,
    `SELECT COUNT(*) AS invalidCount FROM Auctions
     WHERE status IS NULL
       OR status NOT IN ('upcoming', 'live', 'pending', 'completed')`,
    "Auctions contains unsupported status values; correct them before migrating"
  );

  await queryInterface.changeColumn("Users", "role", {
    type: Sequelize.ENUM("admin", "team_owner", "spectator"),
    allowNull: false,
    defaultValue: "spectator",
  });
  await queryInterface.changeColumn("Tournaments", "status", {
    type: Sequelize.ENUM("upcoming", "live", "completed"),
    allowNull: false,
    defaultValue: "upcoming",
  });
  await queryInterface.changeColumn("Players", "role", {
    type: Sequelize.ENUM(
      "Batsman",
      "Bowler",
      "All-rounder",
      "Wicketkeeper"
    ),
    allowNull: false,
    defaultValue: "Batsman",
  });
  await queryInterface.changeColumn("Auctions", "status", {
    type: Sequelize.ENUM("upcoming", "live", "pending", "completed"),
    allowNull: false,
    defaultValue: "upcoming",
  });

  await assertNoRows(
    queryInterface,
    `SELECT COUNT(*) AS invalidCount
     FROM (
       SELECT tournamentId, teamId, COUNT(*) AS duplicateCount
       FROM TournamentTeams
       GROUP BY tournamentId, teamId
       HAVING COUNT(*) > 1
     ) duplicate_pairs`,
    "TournamentTeams contains duplicate tournament/team memberships"
  );

  await ensureIndex(queryInterface, "Teams", ["ownerId"], {
    name: "teams_owner_id_idx",
  });
  await ensureIndex(
    queryInterface,
    "Players",
    ["tournamentId", "isInAuction", "isSold", "auctionId"],
    { name: "players_tournament_auction_state_idx" }
  );
  await ensureIndex(queryInterface, "Players", ["teamId", "tournamentId"], {
    name: "players_team_tournament_idx",
  });
  await ensureIndex(queryInterface, "Auctions", ["tournamentId", "status"], {
    name: "auctions_tournament_status_idx",
  });
  await ensureIndex(
    queryInterface,
    "Auctions",
    ["currentPlayerId", "tournamentId", "status"],
    { name: "auctions_player_tournament_status_idx" }
  );
  await ensureIndex(
    queryInterface,
    "Bids",
    ["playerId", "tournamentId", "bidAmount"],
    { name: "bids_player_tournament_amount_idx" }
  );
  await ensureIndex(
    queryInterface,
    "Bids",
    ["playerId", "tournamentId", "createdAt"],
    { name: "bids_player_tournament_created_at_idx" }
  );
  await ensureIndex(queryInterface, "Bids", ["teamId"], {
    name: "bids_team_id_idx",
  });
  await ensureIndex(queryInterface, "Bids", ["ownerId"], {
    name: "bids_owner_id_idx",
  });
  await ensureIndex(queryInterface, "Tournaments", ["createdBy"], {
    name: "tournaments_created_by_idx",
  });
  await ensureIndex(queryInterface, "TournamentTeams", ["teamId"], {
    name: "tournament_teams_team_id_idx",
  });
  await ensureIndex(
    queryInterface,
    "TournamentTeams",
    ["tournamentId", "teamId"],
    { name: "tournament_teams_tournament_team_uq", unique: true }
  );

  const orphanChecks = [
    [
      `SELECT COUNT(*) AS invalidCount FROM Teams child
       LEFT JOIN Users parent ON parent.id = child.ownerId
       WHERE parent.id IS NULL`,
      "Teams contains ownerId values that do not reference Users",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Tournaments child
       LEFT JOIN Users parent ON parent.id = child.createdBy
       WHERE parent.id IS NULL`,
      "Tournaments contains createdBy values that do not reference Users",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM TournamentTeams child
       LEFT JOIN Tournaments parent ON parent.id = child.tournamentId
       WHERE parent.id IS NULL`,
      "TournamentTeams contains invalid tournamentId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM TournamentTeams child
       LEFT JOIN Teams parent ON parent.id = child.teamId
       WHERE parent.id IS NULL`,
      "TournamentTeams contains invalid teamId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Players child
       LEFT JOIN Teams parent ON parent.id = child.teamId
       WHERE child.teamId IS NOT NULL AND parent.id IS NULL`,
      "Players contains invalid teamId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Players child
       LEFT JOIN Tournaments parent ON parent.id = child.tournamentId
       WHERE child.tournamentId IS NOT NULL AND parent.id IS NULL`,
      "Players contains invalid tournamentId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Auctions child
       LEFT JOIN Players parent ON parent.id = child.currentPlayerId
       WHERE child.currentPlayerId IS NOT NULL AND parent.id IS NULL`,
      "Auctions contains invalid currentPlayerId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Auctions child
       LEFT JOIN Tournaments parent ON parent.id = child.tournamentId
       WHERE child.tournamentId IS NOT NULL AND parent.id IS NULL`,
      "Auctions contains invalid tournamentId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Bids child
       LEFT JOIN Players parent ON parent.id = child.playerId
       WHERE parent.id IS NULL`,
      "Bids contains invalid playerId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Bids child
       LEFT JOIN Tournaments parent ON parent.id = child.tournamentId
       WHERE child.tournamentId IS NOT NULL AND parent.id IS NULL`,
      "Bids contains invalid tournamentId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Bids child
       LEFT JOIN Teams parent ON parent.id = child.teamId
       WHERE parent.id IS NULL`,
      "Bids contains invalid teamId values",
    ],
    [
      `SELECT COUNT(*) AS invalidCount FROM Bids child
       LEFT JOIN Users parent ON parent.id = child.ownerId
       WHERE child.ownerId IS NOT NULL AND parent.id IS NULL`,
      "Bids contains invalid ownerId values",
    ],
  ];

  for (const [sql, message] of orphanChecks) {
    await assertNoRows(queryInterface, sql, message);
  }

  const foreignKeys = [
    ["Teams", "ownerId", "Users", "teams_owner_id_fk", "RESTRICT"],
    [
      "Tournaments",
      "createdBy",
      "Users",
      "tournaments_created_by_fk",
      "RESTRICT",
    ],
    [
      "TournamentTeams",
      "tournamentId",
      "Tournaments",
      "tournament_teams_tournament_id_fk",
      "CASCADE",
    ],
    [
      "TournamentTeams",
      "teamId",
      "Teams",
      "tournament_teams_team_id_fk",
      "CASCADE",
    ],
    ["Players", "teamId", "Teams", "players_team_id_fk", "SET NULL"],
    [
      "Players",
      "tournamentId",
      "Tournaments",
      "players_tournament_id_fk",
      "RESTRICT",
    ],
    [
      "Auctions",
      "currentPlayerId",
      "Players",
      "auctions_current_player_id_fk",
      "SET NULL",
    ],
    [
      "Auctions",
      "tournamentId",
      "Tournaments",
      "auctions_tournament_id_fk",
      "RESTRICT",
    ],
    ["Bids", "playerId", "Players", "bids_player_id_fk", "RESTRICT"],
    [
      "Bids",
      "tournamentId",
      "Tournaments",
      "bids_tournament_id_fk",
      "RESTRICT",
    ],
    ["Bids", "teamId", "Teams", "bids_team_id_fk", "RESTRICT"],
    ["Bids", "ownerId", "Users", "bids_owner_id_fk", "SET NULL"],
  ];

  for (const [
    tableName,
    field,
    referencedTable,
    name,
    onDelete,
  ] of foreignKeys) {
    await ensureForeignKey(queryInterface, tableName, field, referencedTable, {
      name,
      onDelete,
      onUpdate: "CASCADE",
    });
  }
};

export const down = async ({ queryInterface, Sequelize }) => {
  const constraints = [
    ["Bids", "bids_owner_id_fk"],
    ["Bids", "bids_team_id_fk"],
    ["Bids", "bids_tournament_id_fk"],
    ["Bids", "bids_player_id_fk"],
    ["Auctions", "auctions_tournament_id_fk"],
    ["Auctions", "auctions_current_player_id_fk"],
    ["Players", "players_tournament_id_fk"],
    ["Players", "players_team_id_fk"],
    ["TournamentTeams", "tournament_teams_team_id_fk"],
    ["TournamentTeams", "tournament_teams_tournament_id_fk"],
    ["Tournaments", "tournaments_created_by_fk"],
    ["Teams", "teams_owner_id_fk"],
  ];
  for (const [tableName, constraintName] of constraints) {
    await removeConstraintIfPresent(
      queryInterface,
      tableName,
      constraintName
    );
  }

  const indexes = [
    ["TournamentTeams", "tournament_teams_tournament_team_uq"],
    ["TournamentTeams", "tournament_teams_team_id_idx"],
    ["Tournaments", "tournaments_created_by_idx"],
    ["Bids", "bids_owner_id_idx"],
    ["Bids", "bids_team_id_idx"],
    ["Bids", "bids_player_tournament_created_at_idx"],
    ["Bids", "bids_player_tournament_amount_idx"],
    ["Auctions", "auctions_player_tournament_status_idx"],
    ["Auctions", "auctions_tournament_status_idx"],
    ["Players", "players_team_tournament_idx"],
    ["Players", "players_tournament_auction_state_idx"],
    ["Teams", "teams_owner_id_idx"],
  ];
  for (const [tableName, indexName] of indexes) {
    await removeIndexIfPresent(queryInterface, tableName, indexName);
  }

  await queryInterface.changeColumn("Users", "role", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "spectator",
  });
  await queryInterface.changeColumn("Tournaments", "status", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "upcoming",
  });
  await queryInterface.changeColumn("Players", "role", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "Batsman",
  });
  await queryInterface.changeColumn("Auctions", "status", {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: "upcoming",
  });
};
