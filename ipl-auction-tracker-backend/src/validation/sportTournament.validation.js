import { z } from "zod";
import { idSchema, nonEmptyString } from "./common.validation.js";

const divisionSchema = z.enum(["men", "women", "mixed", "open"]);
const genderRuleSchema = z.enum(["male", "female", "any"]);
const teamCountSchema = z.coerce.number().int().min(2).max(26);
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional();

export const createSportTournamentSchema = z.object({
  params: z.object({
    festivalId: idSchema("Festival ID"),
    festivalTeamId: idSchema("Festival Team ID"),
  }),
  body: z.object({
    festivalSportId: idSchema("Festival Sport ID"),
    name: nonEmptyString("Tournament name").max(160),
    code: nonEmptyString("Tournament code").max(80),
    division: divisionSchema,
    participantGenderRule: genderRuleSchema,
    teamCount: teamCountSchema,
  }),
  query: z.object({}).optional(),
});

export const sportTournamentIdSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateSportTournamentSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
  }),
  body: z
    .object({
      name: nonEmptyString("Tournament name").max(160).optional(),
      code: nonEmptyString("Tournament code").max(80).optional(),
      division: divisionSchema.optional(),
      participantGenderRule: genderRuleSchema.optional(),
      teamCount: teamCountSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
  query: z.object({}).optional(),
});

export const sportTeamIdSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
    sportTeamId: idSchema("Sport Team ID"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateSportTeamSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
    sportTeamId: idSchema("Sport Team ID"),
  }),
  body: z
    .object({
      name: nonEmptyString("Team name").max(160).optional(),
      code: nonEmptyString("Team code").max(80).optional(),
      color: colorSchema,
      logoUrl: z.string().url().nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
  query: z.object({}).optional(),
});

export const assignSportTeamCaptainSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
    sportTeamId: idSchema("Sport Team ID"),
  }),
  body: z.object({
    festivalParticipantId: idSchema("Festival Participant ID"),
  }),
  query: z.object({}).optional(),
});

const creditSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

export const distributeSportTeamBudgetsSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
  }),
  body: z.object({
    totalCredits: creditSchema.refine((value) => value > 0, {
      message: "Total Tournament Credits must be greater than zero",
    }),
  }),
  query: z.object({}).optional(),
});

export const updateSportTeamBudgetsSchema = z.object({
  params: z.object({
    sportTournamentId: idSchema("Sport Tournament ID"),
  }),
  body: z.object({
    budgets: z
      .array(
        z.object({
          sportTeamId: idSchema("Sport Team ID"),
          allocatedCredits: creditSchema,
          adjustmentCredits: z.coerce
            .number()
            .int()
            .min(-Number.MAX_SAFE_INTEGER)
            .max(Number.MAX_SAFE_INTEGER)
            .default(0),
          status: z.enum(["active", "inactive"]).default("active"),
        })
      )
      .min(1)
      .superRefine((budgets, context) => {
        const teamIds = budgets.map(({ sportTeamId }) => sportTeamId);
        if (new Set(teamIds).size !== teamIds.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each Sport Team may appear only once",
          });
        }
        budgets.forEach((budget, index) => {
          if (
            budget.status === "active" &&
            budget.allocatedCredits + budget.adjustmentCredits <= 0
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, "adjustmentCredits"],
              message: "Active Team effective credits must be greater than zero",
            });
          }
        });
      }),
  }),
  query: z.object({}).optional(),
});

const auctionParams = z.object({
  sportTournamentId: idSchema("Sport Tournament ID"),
});

export const updateSportAuctionConfigSchema = z.object({
  params: auctionParams,
  body: z.object({
    timerDurationSeconds: z.coerce.number().int().min(5).max(300),
    incrementPercentage: z.coerce.number().int().min(1).max(100),
    reauctionEnabled: z.boolean().default(true),
  }),
});

export const sportAuctionLifecycleSchema = z.object({
  params: auctionParams,
  body: z.object({}).passthrough().optional().default({}),
});

export const sportAuctionParticipantSchema = z.object({
  params: auctionParams.extend({
    participantId: idSchema("Festival Participant ID"),
  }),
  body: z.object({}).passthrough().optional().default({}),
});

export const startSportAuctionParticipantSchema = z.object({
  params: auctionParams.extend({
    participantId: idSchema("Festival Participant ID"),
  }),
  body: z.object({
    baseCredits: creditSchema.refine((value) => value > 0, {
      message: "Base credits must be greater than zero",
    }),
  }),
});

export const sportAuctionBidSchema = z.object({
  params: auctionParams,
  body: z.object({
    auctionId: idSchema("Auction ID"),
    expectedCurrentBid: creditSchema,
  }).strict(),
});

export const sportAuctionReauctionSchema = z.object({
  params: auctionParams,
  body: z.object({
    participantIds: z.array(idSchema("Festival Participant ID")).min(1).max(1000).optional(),
  }),
});
