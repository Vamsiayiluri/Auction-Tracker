import { z } from "zod";
import { idSchema, nonEmptyString, sportIdSchema } from "./common.validation.js";

const isValidDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const dateOnlySchema = (fieldName) =>
  nonEmptyString(fieldName).refine(
    isValidDateOnly,
    `${fieldName} must use YYYY-MM-DD`
  );

const optionalDateTimeSchema = (fieldName) =>
  z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .datetime({ offset: true, message: `${fieldName} must be an ISO date-time` })
    .optional()
    .nullable();

const normalizedCode = (fieldName, maxLength) =>
  nonEmptyString(fieldName)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
      `${fieldName} may contain letters, numbers, hyphens, and underscores`
    )
    .transform((value) => value.toUpperCase());

const festivalIdParams = z.object({
  festivalId: idSchema("Festival ID"),
});

const participantParams = festivalIdParams.extend({
  participantId: idSchema("Participant ID"),
});

const teamParams = festivalIdParams.extend({
  teamId: idSchema("Festival Team ID"),
});

const sportParticipantParams = festivalIdParams.extend({
  sportId: sportIdSchema,
});

const retentionParams = festivalIdParams.extend({
  id: idSchema("Retention ID"),
});

const moneySchema = (fieldName) =>
  z.coerce
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .int(`${fieldName} must be an integer`)
    .positive(`${fieldName} must be greater than zero`)
    .max(Number.MAX_SAFE_INTEGER, `${fieldName} is too large`);

export const createFestivalSchema = z
  .object({
    body: z.object({
      name: nonEmptyString("Festival name").max(
        120,
        "Festival name must be at most 120 characters"
      ),
      code: normalizedCode("Festival code", 40),
      startDate: dateOnlySchema("Start date"),
      endDate: dateOnlySchema("End date"),
      registrationOpensAt: optionalDateTimeSchema("Registration opens at"),
      registrationClosesAt: optionalDateTimeSchema("Registration closes at"),
      timezone: nonEmptyString("Timezone").max(
        100,
        "Timezone must be at most 100 characters"
      ),
      currencyCode: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{3}$/, "Currency code must be a 3-letter code")
        .transform((value) => value.toUpperCase())
        .optional()
        .nullable(),
    }),
  })
  .superRefine(({ body }, context) => {
    if (body.endDate < body.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "endDate"],
        message: "End date must be on or after start date",
      });
    }

    if (
      body.registrationOpensAt &&
      body.registrationClosesAt &&
      new Date(body.registrationClosesAt) <= new Date(body.registrationOpensAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body", "registrationClosesAt"],
        message: "Registration close must be after registration open",
      });
    }
  });

const festivalDetailsBody = z.object({
  name: nonEmptyString("Festival name")
    .max(120, "Festival name must be at most 120 characters")
    .optional(),
  code: normalizedCode("Festival code", 40).optional(),
  startDate: dateOnlySchema("Start date").optional(),
  endDate: dateOnlySchema("End date").optional(),
  registrationOpensAt: optionalDateTimeSchema(
    "Registration opens at"
  ),
  registrationClosesAt: optionalDateTimeSchema(
    "Registration closes at"
  ),
  timezone: nonEmptyString("Timezone")
    .max(100, "Timezone must be at most 100 characters")
    .optional(),
  currencyCode: z
    .union([
      z
        .string()
        .trim()
        .regex(/^[A-Za-z]{3}$/, "Currency code must be a 3-letter code")
        .transform((value) => value.toUpperCase()),
      z.literal(null),
    ])
    .optional(),
});

export const updateFestivalSchema = z
  .object({
    params: festivalIdParams,
    body: festivalDetailsBody.refine(
      (body) => Object.keys(body).length > 0,
      { message: "At least one Festival detail is required" }
    ),
  });

export const festivalConfigurationLockSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    confirmation: z.enum(["UNLOCK", "RELOCK"]),
  }),
});

export const festivalIdSchema = z.object({
  params: festivalIdParams,
});

export const updateRosterFormationModeSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    rosterFormationMode: z.enum(["auction", "manual"]),
  }),
});

export const addFestivalSportSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    sportId: sportIdSchema,
    config: z.record(z.unknown()).optional().nullable(),
  }),
});

export const bulkAddFestivalSportsSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    sportIds: z
      .array(sportIdSchema)
      .min(1, "At least one sport is required")
      .max(100)
      .superRefine((sportIds, context) => {
        const seen = new Set();
        sportIds.forEach((sportId, index) => {
          if (seen.has(sportId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index],
              message: "Duplicate sport selection",
            });
          }
          seen.add(sportId);
        });
      }),
  }),
});

export const addFestivalParticipantSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    employeeId: idSchema("Employee ID"),
  }),
});

export const createFestivalTeamSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    name: nonEmptyString("Team name").max(
      100,
      "Team name must be at most 100 characters"
    ),
    code: normalizedCode("Team code", 20),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a 6-digit hex value")
      .optional()
      .nullable(),
    logoUrl: z
      .string()
      .trim()
      .url("Logo URL must be valid")
      .optional()
      .nullable(),
  }),
});

export const updateFestivalTeamSchema = z.object({
  params: teamParams,
  body: z
    .object({
      name: nonEmptyString("Team name")
        .max(100, "Team name must be at most 100 characters")
        .optional(),
      code: normalizedCode("Team code", 20).optional(),
      color: z
        .union([
          z
            .string()
            .trim()
            .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a 6-digit hex value"),
          z.literal(null),
        ])
        .optional(),
      logoUrl: z
        .union([z.string().trim().url("Logo URL must be valid"), z.literal(null)])
        .optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one team field is required",
    }),
});

export const festivalTeamIdSchema = z.object({
  params: teamParams,
});

export const assignFestivalParticipantSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantId: idSchema("Participant ID"),
    teamId: idSchema("Festival Team ID"),
  }),
});

export const autoBalanceFestivalParticipantsSchema = z.object({
  params: festivalIdParams,
  body: z.object({}).passthrough().optional().default({}),
});

export const assignFestivalTeamOwnerSchema = z.object({
  params: teamParams,
  body: z.object({
    participantId: idSchema("Participant ID"),
  }),
});

export const createFestivalRetentionSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantId: idSchema("Participant ID"),
    teamId: idSchema("Festival Team ID"),
    amount: moneySchema("Retention amount"),
  }),
});

export const bulkFestivalRetentionsSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    assignments: z
      .array(
        z.object({
          participantId: idSchema("Participant ID"),
          teamId: idSchema("Festival Team ID"),
          amount: moneySchema("Retention amount"),
        })
      )
      .min(1)
      .max(1000)
      .superRefine((assignments, context) => {
        const seen = new Set();
        assignments.forEach(({ participantId }, index) => {
          if (seen.has(participantId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, "participantId"],
              message: "Participant appears more than once",
            });
          }
          seen.add(participantId);
        });
      }),
  }),
});

export const festivalRetentionIdSchema = z.object({
  params: retentionParams,
});

export const updateFestivalAuctionConfigSchema = z.object({
  params: festivalIdParams,
  body: z
    .object({
      totalBudget: moneySchema("Total budget").optional(),
      ownerCost: moneySchema("Owner cost").optional(),
      incrementPercentage: z.coerce
        .number()
        .int()
        .refine((value) => [20, 25].includes(value), {
          message: "Bid increment percentage must be 20 or 25",
        })
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one auction configuration field is required",
    }),
});

export const festivalAuctionLifecycleSchema = z.object({
  params: festivalIdParams,
  body: z.object({}).passthrough().optional().default({}),
});

export const festivalAuctionParticipantSchema = z.object({
  params: participantParams,
  body: z.object({}).passthrough().optional().default({}),
});

export const festivalAuctionStartParticipantSchema = z.object({
  params: participantParams,
  body: z.object({
    basePrice: moneySchema("Base price"),
  }),
});

export const festivalAuctionBidSchema = z.object({
  params: festivalIdParams,
  body: z.object({}).strict().optional().default({}),
});

export const festivalReauctionSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantIds: z
      .array(idSchema("Participant ID"))
      .min(1)
      .max(1000)
      .optional(),
  }),
});

export const registerParticipantSportSchema = z.object({
  params: participantParams,
  body: z.object({
    sportId: sportIdSchema,
  }),
});

export const participantSportsSchema = z.object({
  params: participantParams,
});

export const sportParticipantsSchema = z.object({
  params: sportParticipantParams,
});

export const bulkParticipantSportsSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantId: idSchema("Participant ID"),
    sports: z
      .array(sportIdSchema, {
        required_error: "Sports are required",
        invalid_type_error: "Sports must be an array",
      })
      .min(1, "At least one sport is required")
      .superRefine((sports, context) => {
        const seen = new Set();
        sports.forEach((sportId, index) => {
          if (seen.has(sportId)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index],
              message: "Duplicate sport registration",
            });
          }
          seen.add(sportId);
        });
      }),
  }),
});

export const bulkSportsAssignmentSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantIds: z
      .array(idSchema("Participant ID"))
      .min(1)
      .max(1000),
    sportIds: z.array(sportIdSchema).max(100).default([]),
  }),
});

export const participantSportsImportSchema = z.object({
  params: festivalIdParams,
});

const uniqueIdArray = (fieldName) =>
  z
    .array(idSchema(fieldName), {
      required_error: `${fieldName}s are required`,
      invalid_type_error: `${fieldName}s must be an array`,
    })
    .min(1, `At least one ${fieldName.toLowerCase()} is required`)
    .max(1000, `No more than 1000 ${fieldName.toLowerCase()}s are allowed`);

export const bulkAddFestivalParticipantsSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    employeeIds: uniqueIdArray("Employee ID"),
  }),
});

export const bulkRemoveFestivalParticipantsSchema = z.object({
  params: festivalIdParams,
  body: z.object({
    participantIds: uniqueIdArray("Participant ID"),
  }),
});
