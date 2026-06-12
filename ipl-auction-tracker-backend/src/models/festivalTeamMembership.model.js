import { DataTypes } from "sequelize";
import sequelize from "../config/dbconfig.js";
import Festival from "./festival.model.js";
import FestivalParticipant from "./festivalParticipant.model.js";
import FestivalTeam from "./festivalTeam.model.js";
import User from "./user.model.js";

const FestivalTeamMembership = sequelize.define(
  "FestivalTeamMembership",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    festivalId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    festivalParticipantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    festivalTeamId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assignmentMethod: {
      type: DataTypes.ENUM("manual", "auto_balanced"),
      allowNull: false,
    },
    rosterSource: {
      type: DataTypes.ENUM(
        "admin_override",
        "auto_balance",
        "owner_retention",
        "retention",
        "auction"
      ),
      allowNull: true,
    },
    assignedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    indexes: [
      {
        name: "festival_team_memberships_festival_participant_uq",
        unique: true,
        fields: ["festivalId", "festivalParticipantId"],
      },
      {
        name: "festival_team_memberships_team_festival_idx",
        fields: ["festivalTeamId", "festivalId"],
      },
      {
        name: "festival_team_memberships_participant_idx",
        fields: ["festivalParticipantId"],
      },
      {
        name: "festival_team_memberships_assigned_by_idx",
        fields: ["assignedBy"],
      },
    ],
  }
);

FestivalTeamMembership.belongsTo(Festival, {
  foreignKey: "festivalId",
  as: "festival",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Festival.hasMany(FestivalTeamMembership, {
  foreignKey: "festivalId",
  as: "teamMemberships",
});
FestivalTeamMembership.belongsTo(FestivalParticipant, {
  foreignKey: "festivalParticipantId",
  as: "participant",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
FestivalParticipant.hasOne(FestivalTeamMembership, {
  foreignKey: "festivalParticipantId",
  as: "teamMembership",
});
FestivalTeamMembership.belongsTo(FestivalTeam, {
  foreignKey: "festivalTeamId",
  as: "team",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
FestivalTeam.hasMany(FestivalTeamMembership, {
  foreignKey: "festivalTeamId",
  as: "memberships",
});
FestivalTeamMembership.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});

export default FestivalTeamMembership;
