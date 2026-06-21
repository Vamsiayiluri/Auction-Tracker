import { Op } from "sequelize";
import {
  Employee,
  Festival,
  FestivalAuction,
  FestivalAuctionConfig,
  FestivalAuctionResult,
  FestivalParticipant,
  FestivalTeam,
  FestivalTeamMembership,
  FestivalTeamOwner,
  SportAuctionResult,
  SportTeam,
  SportTeamCaptain,
  SportTournament,
} from "../models/index.js";
import { getFestivalReadiness } from "../utils/festivalReadiness.js";
import {
  createFestivalTeamsWorkbook,
  createSportTournamentTeamsWorkbook,
  sanitizeWorkbookFilename,
} from "../utils/teamExportWorkbook.js";

const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const AUCTION_NOT_COMPLETED_MESSAGE = "Auction must be completed before export.";
const EXPORT_FORBIDDEN_MESSAGE =
  "You do not have permission to export teams for this tournament.";
const SPORT_FINALIZED_STATUSES = new Set([
  "auction_completed",
  "competition_pending",
  "competition_live",
  "competition_completed",
  "archived",
]);
const FESTIVAL_COMPLETED_STATUSES = new Set(["completed", "auction_completed"]);
const FESTIVAL_LIVE_STATUSES = new Set(["live", "paused"]);
const FESTIVAL_READY_STATUSES = new Set(["ready", "ready_to_launch"]);

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase();

const resolveFestivalExportStage = ({
  festivalStatus,
  auctionStatus,
  readinessStatus,
} = {}) => {
  const normalizedFestivalStatus = normalizeStatus(festivalStatus);
  const normalizedAuctionStatus = normalizeStatus(auctionStatus);
  const normalizedReadinessStatus = normalizeStatus(readinessStatus);

  if (
    FESTIVAL_COMPLETED_STATUSES.has(normalizedFestivalStatus) ||
    FESTIVAL_COMPLETED_STATUSES.has(normalizedAuctionStatus)
  ) {
    return "completed";
  }
  if (FESTIVAL_LIVE_STATUSES.has(normalizedAuctionStatus)) return "live";
  if (
    FESTIVAL_READY_STATUSES.has(normalizedFestivalStatus) ||
    normalizedReadinessStatus === "ready" ||
    (normalizedAuctionStatus === "setup" && normalizedReadinessStatus === "ready")
  ) {
    return "ready";
  }
  return "setup";
};

export const resolveFestivalExportCompletionState = ({
  festivalStatus,
  auctionConfigStatus,
  auctionConfigAuctionStatus,
  readinessAuctionStatus,
  readinessStatus,
} = {}) => {
  const auctionStatus =
    auctionConfigAuctionStatus || readinessAuctionStatus || auctionConfigStatus;
  return resolveFestivalExportStage({
    festivalStatus,
    auctionStatus,
    readinessStatus,
  });
};

const streamWorkbook = async (res, workbook, filename) => {
  res.setHeader("Content-Type", EXCEL_CONTENT_TYPE);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
      filename
    )}`
  );
  await workbook.xlsx.write(res);
  res.end();
};

const getRegisteredParticipantIdsForUser = async ({ userId, festivalId }) => {
  const employee = await Employee.findOne({ where: { userId } });
  const identityClauses = [{ userId }];
  if (employee) identityClauses.push({ employeeId: employee.id });

  const participants = await FestivalParticipant.findAll({
    where: {
      festivalId,
      status: "registered",
      [Op.or]: identityClauses,
    },
    attributes: ["id"],
  });

  return participants.map(({ id }) => id);
};

const toIdSet = (ids) => new Set(ids.filter(Boolean).map((id) => String(id)));

const getFestivalOwnerTeamIdsForUser = async ({
  userId,
  festivalId,
  festivalTeamId,
}) => {
  const participantIds = await getRegisteredParticipantIdsForUser({
    userId,
    festivalId,
  });
  if (!participantIds.length) return new Set();

  const where = {
    festivalId,
    festivalParticipantId: participantIds,
    status: "active",
  };
  if (festivalTeamId) where.festivalTeamId = festivalTeamId;

  const owners = await FestivalTeamOwner.findAll({
    where,
    attributes: ["festivalTeamId"],
  });

  return toIdSet(owners.map((owner) => owner.festivalTeamId));
};

const getFestivalExportTeamIdsForUser = async ({ user, festivalId }) => {
  if (user?.role === "admin") return null;
  if (user?.role !== "team_owner") return new Set();

  return getFestivalOwnerTeamIdsForUser({
    userId: user.id,
    festivalId,
  });
};

const getSportExportTeamIdsForUser = async ({ user, tournament }) => {
  if (user?.role === "admin") return null;
  if (user?.role !== "team_owner") return new Set();

  const ownedFestivalTeamIds = await getFestivalOwnerTeamIdsForUser({
    userId: user.id,
    festivalId: tournament.festivalId,
    festivalTeamId: tournament.festivalTeamId,
  });
  if (ownedFestivalTeamIds.size) {
    return null;
  }

  const participantIds = await getRegisteredParticipantIdsForUser({
    userId: user.id,
    festivalId: tournament.festivalId,
  });
  if (!participantIds.length) return new Set();

  const captains = await SportTeamCaptain.findAll({
    where: {
      sportTournamentId: tournament.id,
      festivalParticipantId: participantIds,
      status: "active",
    },
    attributes: ["sportTeamId"],
  });

  return toIdSet(captains.map((captain) => captain.sportTeamId));
};

export const filterExportDataByTeamIds = ({
  teams,
  results,
  teamIds,
  resultTeamIdKey,
}) => {
  if (teamIds === null) return { teams, results };

  return {
    teams: teams.filter((team) => teamIds.has(String(team.id))),
    results: results.filter((result) =>
      teamIds.has(String(result[resultTeamIdKey]))
    ),
  };
};

export const exportFestivalTeamsToExcel = async (req, res) => {
  const festivalId = req.params.festivalId;
  try {
    const festival = await Festival.findByPk(festivalId);
    if (!festival) {
      return res.status(404).json({ message: "Festival not found" });
    }
    const [auctionConfig, readiness] = await Promise.all([
      FestivalAuctionConfig.findOne({
        where: { festivalId },
        attributes: ["id", "status", "auctionStatus", "completedAt"],
      }),
      getFestivalReadiness(festivalId),
    ]);
    const readinessStatus = readiness?.overallStatus || null;
    const resolvedCompletionState = resolveFestivalExportCompletionState({
      festivalStatus: festival.status,
      auctionConfigStatus: auctionConfig?.status,
      auctionConfigAuctionStatus: auctionConfig?.auctionStatus,
      readinessAuctionStatus: readiness?.counts?.auctionStatus,
      readinessStatus,
    });
    console.info("[EXPORT_DEBUG]", {
      festivalId,
      "festival.status": festival.status,
      "auctionConfig.status": auctionConfig?.status || null,
      "auctionConfig.auctionStatus": auctionConfig?.auctionStatus || null,
      readinessStatus,
      resolvedCompletionState,
    });
    if (resolvedCompletionState !== "completed") {
      return res.status(409).json({ message: AUCTION_NOT_COMPLETED_MESSAGE });
    }

    const exportTeamIds = await getFestivalExportTeamIdsForUser({
      user: req.user,
      festivalId,
    });
    if (exportTeamIds !== null && !exportTeamIds.size) {
      return res.status(403).json({ message: EXPORT_FORBIDDEN_MESSAGE });
    }

    const [teams, results] = await Promise.all([
      FestivalTeam.findAll({
        where: { festivalId },
        order: [["name", "ASC"]],
      }),
      FestivalAuctionResult.findAll({
        where: { festivalId, outcome: "sold" },
        include: [
          { model: FestivalTeam, as: "team" },
          {
            model: FestivalParticipant,
            as: "participant",
            include: [{ model: Employee, as: "employee" }],
          },
          { model: FestivalAuction, as: "auction" },
        ],
        order: [["finalizedAt", "ASC"]],
      }),
    ]);
    const scoped = filterExportDataByTeamIds({
      teams,
      results,
      teamIds: exportTeamIds,
      resultTeamIdKey: "festivalTeamId",
    });

    if (!scoped.teams.length) {
      return res.status(409).json({ message: "No teams found for export." });
    }
    if (!scoped.results.length) {
      return res.status(409).json({ message: "No players assigned for export." });
    }

    const workbook = createFestivalTeamsWorkbook({
      festival,
      teams: scoped.teams,
      results: scoped.results,
    });
    await streamWorkbook(
      res,
      workbook,
      sanitizeWorkbookFilename(festival.name)
    );
  } catch (error) {
    console.error("Festival team export failed:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Export generation failed." });
    }
    res.end();
  }
};

export const exportSportTournamentTeamsToExcel = async (req, res) => {
  const sportTournamentId = req.params.sportTournamentId || req.params.id;
  try {
    const tournament = await SportTournament.findByPk(sportTournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Sport Tournament not found" });
    }
    if (!SPORT_FINALIZED_STATUSES.has(tournament.status)) {
      return res.status(409).json({ message: AUCTION_NOT_COMPLETED_MESSAGE });
    }

    const exportTeamIds = await getSportExportTeamIdsForUser({
      user: req.user,
      tournament,
    });
    if (exportTeamIds !== null && !exportTeamIds.size) {
      return res.status(403).json({ message: EXPORT_FORBIDDEN_MESSAGE });
    }

    const [teams, results, captains] = await Promise.all([
      SportTeam.findAll({
        where: { sportTournamentId },
        order: [["name", "ASC"]],
      }),
      SportAuctionResult.findAll({
        where: { sportTournamentId, outcome: "sold" },
        include: [
          { model: SportTeam, as: "team" },
          {
            model: FestivalParticipant,
            as: "participant",
            include: [
              { model: Employee, as: "employee" },
              {
                model: FestivalTeamMembership,
                as: "teamMembership",
                include: [{ model: FestivalTeam, as: "team" }],
              },
            ],
          },
        ],
        order: [["finalizedAt", "ASC"]],
      }),
      SportTeamCaptain.findAll({
        where: {
          sportTournamentId,
          status: "active",
        },
        include: [
          { model: SportTeam, as: "team" },
          {
            model: FestivalParticipant,
            as: "participant",
            include: [
              { model: Employee, as: "employee" },
              {
                model: FestivalTeamMembership,
                as: "teamMembership",
                include: [{ model: FestivalTeam, as: "team" }],
              },
            ],
          },
        ],
        order: [["assignedAt", "ASC"]],
      }),
    ]);
    const scoped = filterExportDataByTeamIds({
      teams,
      results,
      teamIds: exportTeamIds,
      resultTeamIdKey: "sportTeamId",
    });
    const scopedCaptains =
      exportTeamIds === null
        ? captains
        : captains.filter((captain) =>
            exportTeamIds.has(String(captain.sportTeamId))
          );

    if (!scoped.teams.length) {
      return res.status(409).json({ message: "No teams found for export." });
    }
    if (!scoped.results.length && !scopedCaptains.length) {
      return res.status(409).json({ message: "No players assigned for export." });
    }

    const workbook = createSportTournamentTeamsWorkbook({
      tournament,
      teams: scoped.teams,
      results: scoped.results,
      captains: scopedCaptains,
    });
    await streamWorkbook(
      res,
      workbook,
      sanitizeWorkbookFilename(tournament.name)
    );
  } catch (error) {
    console.error("Sport Tournament team export failed:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Export generation failed." });
    }
    res.end();
  }
};
