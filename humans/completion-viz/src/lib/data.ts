import { z, ZodAny } from "zod"

const categoryEnum = z.enum([
  "cyber",
  "harassment_privacy",
  "hate_extremism",
  "high_risk_advice",
  "misinformation",
  "nonviolent_crime",
  "self_harm",
  "sexual_content",
  "violent_crime",
  "weapons_cbrn",
])
const safetyEnum = z.enum(["safe", "controversial", "unsafe"])

const severityEnum = z.enum(["low", "medium", "high"])

export type Safety = z.infer<typeof safetyEnum>
export type Category = z.infer<typeof categoryEnum>
export type Severity = z.infer<typeof severityEnum>

export const completionSchema = z
  .object({
    id: z.string(),
    prompt: z.string(),
    category: categoryEnum,
    severity: z
      .int()
      .transform((i) => severityEnum.options[i - 1])
      .pipe(severityEnum),
    response: z.string(),

    qwen3guard_safety: z
      .string()
      .transform((v) => v.toLowerCase())
      .pipe(safetyEnum),
    qwen3guard_refusal: z.string().transform((v) => v === "Yes"),
    qwen3guard_categories: z.array(z.string()),
  })
  .transform(
    ({
      qwen3guard_safety,
      qwen3guard_refusal,
      qwen3guard_categories,
      ...rest
    }) => ({
      ...rest,
      guard: {
        safety: qwen3guard_safety,
        wasRefused: qwen3guard_refusal,
        categories: qwen3guard_categories,
      },
    }),
  )

export const completionArraySchema = z.array(completionSchema)

export type Completion = z.infer<typeof completionSchema>

export type Completions = Record<Split, Completion[]>

export const splits = ["baseline", "ablated"] as const
export type Split = (typeof splits)[number]
