import crypto from "node:crypto";
import { FestivalOperationAudit } from "../models/index.js";

export const createFestivalAudit = ({
  festivalId,
  actorUserId,
  action,
  entityType,
  entityId = null,
  details = null,
  transaction,
}) =>
  FestivalOperationAudit.create(
    {
      id: crypto.randomUUID(),
      festivalId,
      actorUserId,
      action,
      entityType,
      entityId,
      details,
    },
    { transaction }
  );
