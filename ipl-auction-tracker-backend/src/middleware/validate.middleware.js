import {
  formatZodErrors,
  normalizePayload,
} from "../validation/common.validation.js";

const parseSchema = (schema, value) => {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error.issues),
  };
};

export const validate = (schema) => (req, res, next) => {
  const payload = {
    body: normalizePayload(req.body),
    params: req.params,
    query: req.query,
  };
  const validation = parseSchema(schema, payload);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  req.body = validation.data.body ?? req.body;
  req.params = validation.data.params ?? req.params;
  req.query = validation.data.query ?? req.query;
  return next();
};

export const validateSocketPayload = (schema, payload) => {
  const validation = parseSchema(schema, normalizePayload(payload));

  if (!validation.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    };
  }

  return { success: true, data: validation.data };
};
