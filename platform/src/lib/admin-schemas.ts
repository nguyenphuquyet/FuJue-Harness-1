/** Validated request bodies for the admin console API. */
import { z } from 'zod'

const httpUrl = z
  .string()
  .trim()
  .max(512)
  .refine(value => value === '' || /^https?:\/\/[^\s]+$/i.test(value), 'URL phải bắt đầu bằng http:// hoặc https://')

const reasoningLevel = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/,
      'Mã mức bắt đầu bằng chữ thường hoặc số, chỉ gồm chữ thường, số và các dấu . _ -',
    ),
  apiValue: z.string().trim().max(80),
})

const reasoningLevels = z
  .array(reasoningLevel)
  .min(1)
  .max(12)
  .superRefine((levels, context) => {
    const seen = new Set<string>()
    for (const [index, level] of levels.entries()) {
      if (seen.has(level.id)) {
        context.addIssue({ code: 'custom', path: [index, 'id'], message: `Mã mức "${level.id}" bị trùng.` })
      }
      seen.add(level.id)
      if (level.id === 'off' && level.apiValue !== '') {
        context.addIssue({ code: 'custom', path: [index, 'apiValue'], message: 'Mức off luôn tắt suy luận nên không có giá trị API.' })
      }
      if (level.id !== 'off' && level.apiValue === '') {
        context.addIssue({ code: 'custom', path: [index, 'apiValue'], message: 'Nhập giá trị API cho mức này.' })
      }
    }
    if (!seen.has('off')) {
      context.addIssue({ code: 'custom', path: [], message: 'Danh sách mức phải có mức off.' })
    }
  })

const modelFields = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-z0-9][a-z0-9._:/-]*$/,
      'Id bắt đầu bằng chữ thường hoặc số, chỉ gồm chữ thường, số và các dấu . _ - / :',
    ),
  name: z.string().trim().min(1).max(160),
  tagline: z.string().trim().max(240),
  description: z.string().trim().max(4000),
  contextWindow: z.number().int().min(1024).max(20_000_000),
  maxOutputTokens: z.number().int().min(1).max(2_000_000),
  inputModalities: z.array(z.enum(['text', 'image'])).min(1).max(2),
  inputPriceUsd: z.number().min(0).max(10_000),
  outputPriceUsd: z.number().min(0).max(10_000),
  capabilities: z.array(z.string().trim().min(1).max(80)).max(12),
  badgeTextVi: z.string().trim().max(40).nullable(),
  badgeTextEn: z.string().trim().max(40).nullable(),
  badgeTone: z.enum(['neutral', 'info', 'success', 'warning']).nullable(),
  recommended: z.boolean(),
  enabled: z.boolean(),
  providerId: z.string().trim().max(64).nullable(),
  upstreamId: z.string().trim().max(120).nullable(),
  reasoningEnabled: z.boolean(),
  reasoningLevels,
  reasoningDefault: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().min(0).max(10_000),
})

interface ReasoningFields {
  readonly reasoningEnabled?: boolean
  readonly reasoningLevels?: readonly { readonly id: string; readonly apiValue: string }[]
  readonly reasoningDefault?: string
}

function checkReasoning(value: ReasoningFields, context: z.RefinementCtx): void {
  const levels = value.reasoningLevels
  if (value.reasoningEnabled === true && levels !== undefined && levels.every(level => level.id === 'off')) {
    context.addIssue({
      code: 'custom',
      path: ['reasoningLevels'],
      message: 'Thêm ít nhất một mức suy luận khi bật suy luận.',
    })
  }
  if (
    levels !== undefined
    && value.reasoningDefault !== undefined
    && !levels.some(level => level.id === value.reasoningDefault)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['reasoningDefault'],
      message: 'Mức mặc định phải nằm trong danh sách mức suy luận.',
    })
  }
}

/** New model row. */
export const modelCreateSchema = modelFields.superRefine(checkReasoning)

/** Model edits; omitted fields keep their stored value. */
export const modelPatchSchema = modelFields.omit({ id: true }).partial().superRefine(checkReasoning)

const providerFields = z.object({
  name: z.string().trim().min(1).max(120),
  chatBaseUrl: httpUrl,
  anthropicBaseUrl: httpUrl,
  apiKey: z.string().trim().max(1024).optional(),
  enabled: z.boolean(),
  note: z.string().trim().max(255),
})

/** New third-party provider. */
export const providerCreateSchema = providerFields

/** Provider edits; a blank `apiKey` keeps the stored credential. */
export const providerPatchSchema = providerFields.partial().extend({ clearApiKey: z.boolean().optional() })

/** Account edits available to administrators. */
export const userPatchSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  balanceUsd: z.number().min(0).max(100_000).optional(),
  bonusUsd: z.number().min(0).max(100_000).optional(),
  grantUsd: z.number().min(0).max(10_000).optional(),
})

/** Bilingual notice published to the desktop channel. */
export const notificationSchema = z
  .object({
    titleVi: z.string().trim().min(1).max(200),
    titleEn: z.string().trim().min(1).max(200),
    bodyVi: z.string().trim().min(1).max(4000),
    bodyEn: z.string().trim().min(1).max(4000),
    actionLabelVi: z.string().trim().min(1).max(80),
    actionLabelEn: z.string().trim().min(1).max(80),
    actionStyle: z.enum(['primary', 'secondary']),
    audience: z.enum(['all', 'user']),
    userId: z.string().trim().regex(/^[0-9a-f-]{36}$/i).nullable(),
    href: z.string().trim().max(512).nullable(),
  })
  .refine(value => value.audience === 'all' || value.userId !== null, {
    message: 'Chọn tài khoản nhận thông báo.',
    path: ['userId'],
  })

/** Installer rows edited on the download settings page. */
export const downloadConfigSchema = z.object({
  version: z.string().trim().min(1).max(40),
  releaseUrl: httpUrl,
  assets: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(120),
        fileName: z.string().trim().max(160),
        url: httpUrl,
        note: z.string().trim().max(240),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(8),
})
