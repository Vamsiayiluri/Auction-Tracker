const OWNER_TABLE = "FestivalTeamOwners";
const AUDIT_TABLE = "EmployeeUserLinkAudits";

const tableNames = async (queryInterface) =>
  (await queryInterface.showAllTables()).map((table) =>
    typeof table === "string" ? table : table.tableName
  );

const tableExists = async (queryInterface, tableName) =>
  (await tableNames(queryInterface)).some(
    (name) => String(name).toLowerCase() === tableName.toLowerCase()
  );

export const up = async ({ queryInterface, Sequelize }) => {
  if (!(await tableExists(queryInterface, OWNER_TABLE))) {
    throw new Error("FestivalTeamOwners must exist before Phase 3D");
  }

  const ownerColumns = await queryInterface.describeTable(OWNER_TABLE);
  if (!ownerColumns.status) {
    await queryInterface.addColumn(OWNER_TABLE, "status", {
      type: Sequelize.ENUM(
        "pending_user_registration",
        "active",
        "inactive"
      ),
      allowNull: false,
      defaultValue: "pending_user_registration",
    });
  }

  await queryInterface.sequelize.query(`
    UPDATE FestivalTeamOwners owner
    INNER JOIN FestivalParticipants participant
      ON participant.id = owner.festivalParticipantId
    INNER JOIN Employees employee
      ON employee.id = participant.employeeId
    LEFT JOIN Users user
      ON user.id = employee.userId
    SET owner.status = CASE
      WHEN participant.status <> 'registered'
        OR employee.employmentStatus <> 'active' THEN 'inactive'
      WHEN employee.userId IS NULL THEN 'pending_user_registration'
      WHEN user.role = 'team_owner' THEN 'active'
      ELSE 'inactive'
    END
  `);

  const ownerIndexes = await queryInterface.showIndex(OWNER_TABLE);
  if (!ownerIndexes.some((index) => index.name === "festival_team_owners_status_idx")) {
    await queryInterface.addIndex(OWNER_TABLE, ["festivalId", "status"], {
      name: "festival_team_owners_status_idx",
    });
  }

  if (!(await tableExists(queryInterface, AUDIT_TABLE))) {
    await queryInterface.createTable(AUDIT_TABLE, {
      id: { type: Sequelize.STRING, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      employeeId: {
        type: Sequelize.STRING,
        allowNull: true,
        references: { model: "Employees", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      normalizedEmail: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      source: {
        type: Sequelize.ENUM("registration", "admin_manual"),
        allowNull: false,
      },
      outcome: {
        type: Sequelize.ENUM(
          "linked",
          "no_match",
          "duplicate_email",
          "employee_already_linked",
          "user_already_linked"
        ),
        allowNull: false,
      },
      details: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(AUDIT_TABLE, ["userId", "createdAt"], {
      name: "employee_user_link_audits_user_created_idx",
    });
    await queryInterface.addIndex(AUDIT_TABLE, ["normalizedEmail", "outcome"], {
      name: "employee_user_link_audits_email_outcome_idx",
    });
  }
};

export const down = async ({ queryInterface }) => {
  if (await tableExists(queryInterface, AUDIT_TABLE)) {
    await queryInterface.dropTable(AUDIT_TABLE);
  }
  if (await tableExists(queryInterface, OWNER_TABLE)) {
    const indexes = await queryInterface.showIndex(OWNER_TABLE);
    if (indexes.some((index) => index.name === "festival_team_owners_status_idx")) {
      await queryInterface.removeIndex(
        OWNER_TABLE,
        "festival_team_owners_status_idx"
      );
    }
    const columns = await queryInterface.describeTable(OWNER_TABLE);
    if (columns.status) {
      await queryInterface.removeColumn(OWNER_TABLE, "status");
    }
  }
};
