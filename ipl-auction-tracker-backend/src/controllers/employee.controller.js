import crypto from "node:crypto";
import { Op } from "sequelize";
import sequelize from "../config/dbconfig.js";
import { Employee, User } from "../models/index.js";
import { toEmployeeResponse } from "../utils/employeeResponse.js";
import {
  buildEmployeeExportCsv,
  employeeImportTemplate,
  parseEmployeeCsv,
} from "../utils/employeeCsvImport.js";
import {
  activateEmployeeOwnerAssignments,
  linkEmployeeToUser,
} from "../utils/employeeUserLinking.js";

const conflictResponse = (res, message) =>
  res.status(409).json({ success: false, message });

const isUniqueConflict = (error) =>
  error?.name === "SequelizeUniqueConstraintError";

const buildEmployeeWhere = ({
  search,
  gender,
  employmentStatus,
  identityStatus,
}) => ({
  ...(gender ? { gender } : {}),
  ...(employmentStatus ? { employmentStatus } : {}),
  ...(identityStatus ? { identityStatus } : {}),
  ...(search
    ? {
        [Op.or]: [
          { employeeNumber: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { department: { [Op.like]: `%${search}%` } },
        ],
      }
    : {}),
});

export const createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({
      id: crypto.randomUUID(),
      ...req.body,
      employmentStatus: req.body.employmentStatus || "active",
      source: "manual",
      identityStatus: "verified",
      userId: null,
    });

    return res.status(201).json({ data: toEmployeeResponse(employee) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Employee number already exists");
    }
    console.error("Error creating employee:", error);
    return res.status(500).json({ message: "Failed to create employee" });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const {
      page,
      pageSize,
      search,
      gender,
      employmentStatus,
      identityStatus,
    } =
      req.query;
    const where = buildEmployeeWhere({
      search,
      gender,
      employmentStatus,
      identityStatus,
    });

    const { rows, count } = await Employee.findAndCountAll({
      where,
      order: [
        ["name", "ASC"],
        ["employeeNumber", "ASC"],
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return res.status(200).json({
      data: rows.map(toEmployeeResponse),
      meta: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ message: "Failed to fetch employees" });
  }
};

export const exportEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: buildEmployeeWhere(req.query),
      order: [
        ["name", "ASC"],
        ["employeeNumber", "ASC"],
      ],
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="employees.csv"'
    );
    return res.status(200).send(buildEmployeeExportCsv(employees));
  } catch (error) {
    console.error("Error exporting employees:", error);
    return res.status(500).json({ message: "Failed to export employees" });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.employeeId);
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    return res.status(200).json({ data: toEmployeeResponse(employee) });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Failed to fetch employee" });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.employeeId);
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    await employee.update(req.body);
    const linkedUser = employee.userId
      ? await User.findByPk(employee.userId)
      : null;
    await activateEmployeeOwnerAssignments(employee.id, linkedUser?.role);
    return res.status(200).json({ data: toEmployeeResponse(employee) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "Employee number already exists");
    }
    console.error("Error updating employee:", error);
    return res.status(500).json({ message: "Failed to update employee" });
  }
};

export const linkEmployeeUser = async (req, res) => {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const [employee, user] = await Promise.all([
        Employee.findByPk(req.params.employeeId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        User.findByPk(req.body.userId, { transaction }),
      ]);
      if (!employee) return { status: 404, message: "Employee not found" };
      if (!user) return { status: 404, message: "User not found" };

      const linkResult = await linkEmployeeToUser({
        employee,
        user,
        transaction,
      });
      if (linkResult.outcome === "employee_already_linked") {
        return {
          status: 409,
          message: "Employee is already linked to another user",
        };
      }
      if (linkResult.outcome === "user_already_linked") {
        return {
          status: 409,
          message: "User is already linked to another employee",
        };
      }
      return { employeeId: employee.id };
    });
    if (result.status) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }
    const employee = await Employee.findByPk(result.employeeId);
    return res.status(200).json({ data: toEmployeeResponse(employee) });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return conflictResponse(res, "User is already linked to another employee");
    }
    console.error("Error linking employee user:", error);
    return res.status(500).json({ message: "Failed to link employee user" });
  }
};

export const importEmployees = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [{ row: null, message: "CSV file is required" }],
      });
    }
    if (!req.file.originalname?.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [{ row: null, message: "Employee import must be a CSV file" }],
      });
    }

    const parsed = parseEmployeeCsv(req.file.buffer.toString("utf8"));
    if (parsed.processed === 0 && parsed.errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        created: 0,
        updated: 0,
        failed: parsed.errors.length,
        errors: parsed.errors,
      });
    }

    const summary = {
      success: true,
      created: 0,
      updated: 0,
      failed: parsed.processed - parsed.rows.length,
      errors: [...parsed.errors],
    };

    for (const row of parsed.rows) {
      try {
        const employee = await Employee.findOne({
          where: { employeeNumber: row.employee.employeeNumber },
        });

        if (!employee) {
          await Employee.create({
            id: crypto.randomUUID(),
            ...row.employee,
            employmentStatus: "active",
            source: "hr_import",
            identityStatus: "verified",
            userId: null,
          });
          summary.created += 1;
        } else {
          await employee.update({
            name: row.employee.name,
            email: row.employee.email,
            department: row.employee.department,
            gender: row.employee.gender,
            employmentStatus: "active",
            ...(employee.identityStatus === "needs_review"
              ? { identityStatus: "verified", source: "hr_import" }
              : {}),
          });
          summary.updated += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          row: row.rowNumber,
          message: isUniqueConflict(error)
            ? "Employee conflicts with existing data"
            : "Employee row could not be imported",
        });
      }
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error("Error importing employees:", error);
    return res.status(500).json({ message: "Failed to import employees" });
  }
};

export const downloadEmployeeImportTemplate = async (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="employee-import-template.csv"'
  );
  return res.status(200).send(employeeImportTemplate);
};
