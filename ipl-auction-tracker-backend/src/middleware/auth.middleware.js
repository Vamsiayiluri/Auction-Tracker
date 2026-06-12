import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    if (!req.user) return res.status(401).json({ message: "User not found" });
    if (
      req.user.mustChangePassword &&
      !(req.baseUrl === "/api/auth" && req.path === "/change-password")
    ) {
      return res.status(403).json({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your temporary password before continuing.",
      });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
};
export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied, Only Admin allowed" });
  }
  next();
};
export const teamOwnerMiddleware = (req, res, next) => {
  if (req.user?.role !== "team_owner") {
    return res
      .status(403)
      .json({ message: "Access denied, Only Team Owners allowed" });
  }
  next();
};
