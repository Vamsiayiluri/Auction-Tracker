// 202606170001-seed-sports-master-data.js
//
// Ensures the eight default Sports master-data records exist.
//
// Context
// ───────
// Migrations 202606080005 (7 sports) and 202606090001 (throwball) already
// seed these rows on any database that has run the full migration history.
// This migration acts as a standalone safety net for fresh production
// deployments and is fully idempotent: it only inserts records that are
// absent — it never updates or overwrites existing data.
//
// Additional master-data assessment
// ───────────────────────────────────
//   • FestivalSports  — per-festival pivot table (festivalId + sportId).
//                       Contains only user-created data; no seed required.
//   • SportRoles      — table does NOT exist in this codebase; no action.
//   • All other lookup/master tables (Tournaments, Festivals, Teams, etc.)
//                       hold user-created records; no seed required.
//
// Down migration
// ──────────────
// Removes only the rows whose IDs appear in SEEDED_SPORTS.  On a database
// where these records were introduced by earlier migrations (202606080005 /
// 202606090001) the DELETE still removes them — rolling back only this
// migration while keeping those earlier migrations applied is safe because
// those earlier migrations' own down handlers drop the Sports table entirely
// anyway.

const SEEDED_SPORTS = [
  { id: "cricket",    code: "cricket",    name: "Cricket",       isActive: true },
  { id: "tt",         code: "tt",         name: "Table Tennis",  isActive: true },
  { id: "volleyball", code: "volleyball", name: "Volleyball",    isActive: true },
  { id: "badminton",  code: "badminton",  name: "Badminton",     isActive: true },
  { id: "chess",      code: "chess",      name: "Chess",         isActive: true },
  { id: "carrom",     code: "carrom",     name: "Carrom",        isActive: true },
  { id: "throwball",  code: "throwball",  name: "Throwball",     isActive: true },
  { id: "other",      code: "other",      name: "Other",         isActive: true },
];

const SEEDED_IDS = SEEDED_SPORTS.map((s) => s.id);

export const up = async ({ queryInterface }) => {
  // Find which IDs are already present so we insert only the missing ones.
  // Using a raw query to avoid any ORM model dependency inside a migration.
  const existing = await queryInterface.sequelize.query(
    `SELECT id FROM Sports WHERE id IN (:ids)`,
    {
      replacements: { ids: SEEDED_IDS },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const existingIdSet = new Set(existing.map((row) => row.id));
  const toInsert = SEEDED_SPORTS.filter((s) => !existingIdSet.has(s.id));

  if (toInsert.length === 0) {
    // All records already present — nothing to do.
    return;
  }

  const now = new Date();
  await queryInterface.bulkInsert(
    "Sports",
    toInsert.map((s) => ({ ...s, createdAt: now, updatedAt: now }))
  );
};

export const down = async ({ queryInterface }) => {
  // Remove only the records from the seed set.
  // Uses a raw query so the IN list is constructed safely via named replacements.
  await queryInterface.sequelize.query(
    `DELETE FROM Sports WHERE id IN (:ids)`,
    { replacements: { ids: SEEDED_IDS } }
  );
};
