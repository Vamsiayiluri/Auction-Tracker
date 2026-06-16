import express from "express";
import {
  createEmployee,
  downloadEmployeeImportTemplate,
  exportEmployees,
  getEmployeeById,
  getEmployees,
  importEmployees,
  linkEmployeeUser,
  updateEmployee,
} from "../controllers/employee.controller.js";
import {
  adminMiddleware,
  authMiddleware,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { multipartCsvUpload } from "../middleware/multipartCsv.middleware.js";
import {
  createEmployeeSchema,
  employeeImportSchema,
  employeeIdSchema,
  exportEmployeesSchema,
  linkEmployeeUserSchema,
  listEmployeesSchema,
  updateEmployeeSchema,
} from "../validation/employee.validation.js";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.post(
  "/import",
  multipartCsvUpload,
  validate(employeeImportSchema),
  importEmployees
);
router.get("/import/template", downloadEmployeeImportTemplate);
router.get("/export", validate(exportEmployeesSchema), exportEmployees);
router.post("/", validate(createEmployeeSchema), createEmployee);
router.get("/", validate(listEmployeesSchema), getEmployees);
router.get("/:employeeId", validate(employeeIdSchema), getEmployeeById);
router.patch("/:employeeId", validate(updateEmployeeSchema), updateEmployee);
router.post(
  "/:employeeId/link-user",
  validate(linkEmployeeUserSchema),
  linkEmployeeUser
);

export default router;
