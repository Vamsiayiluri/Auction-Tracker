import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import User from "./user.model.js";

const FestivalTeamOwner = sequelize.define(
  "FestivalTeamOwner",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    festivalId: { type: DataTypes.STRING, allowNull: false },
    festivalTeamId: { type: DataTypes.STRING, allowNull: false },
    festivalParticipantId: { type: DataTypes.STRING, allowNull: false },
    ownerCost: { type: DataTypes.BIGINT, allowNull: false },
    assignedBy: { type: DataTypes.STRING, allowNull: false },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM(
        "pending_user_registration",
        "active",
        "inactive"
      ),
      allowNull: false,
      defaultValue: "pending_user_registration",
    },
    userProvisioningStatus: {
      type: DataTypes.ENUM("auto_created", "existing_user"),
      allowNull: true,
    },
    credentialsSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        name: "festival_team_owners_team_uq",
        unique: true,
        fields: ["festivalTeamId"],
      },
      {
        name: "festival_team_owners_festival_participant_uq",
        unique: true,
        fields: ["festivalId", "festivalParticipantId"],
      },
      {
        name: "festival_team_owners_status_idx",
        fields: ["festivalId", "status"],
      },
    ],
  }
);

FestivalTeamOwner.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
});
FestivalTeamOwner.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "team",
});
FestivalTeam.hasOne(FestivalTeamOwner, {
  foreignKey: "festivalTeamId",
  as: "ownerAssignment",
});
FestivalTeamOwner.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
});
FestivalParticipant.hasOne(FestivalTeamOwner, {
  foreignKey: "festivalParticipantId",
  as: "ownerAssignment",
});
FestivalTeamOwner.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
});

export default FestivalTeamOwner;
