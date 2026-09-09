import { z } from 'zod';

/**
 * Boot-time env validation. `load` is passed to ConfigModule.forRoot; if the
 * env is missing/invalid the process fails fast with a readable error instead
 * of blowing up deep inside a request later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  // One origin, a comma-separated list, or "*" (reflect any origin — dev only).
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Storage: "s3" (any S3-compatible endpoint) or "disk" (files on a local
  // mount, served through the API's /api/blob routes — no S3 account needed).
  STORAGE_DRIVER: z.enum(['s3', 'disk']).default('s3'),
  STORAGE_DISK_PATH: z.string().default('./.storage'),
  // The API's own externally-reachable base URL (used to build /api/blob URLs
  // for the disk driver). Falls back to RENDER_EXTERNAL_URL, then localhost.
  API_PUBLIC_URL: z.string().optional(),

  // Only required when STORAGE_DRIVER=s3.
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_BUCKET: z.string().default(''),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  S3_PUBLIC_URL: z.string().optional(),

  UPLOAD_URL_TTL: z.coerce.number().int().default(900),
  DOWNLOAD_URL_TTL: z.coerce.number().int().default(3600),

  MAX_UPLOAD_BYTES: z.coerce.number().int().default(209715200),

  RETENTION_FREE_DAYS: z.coerce.number().int().default(7),
  RETENTION_PREMIUM_DAYS: z.coerce.number().int().default(90),
  CLEANUP_CRON_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
}).superRefine((v, ctx) => {
  if (v.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const) {
      if (!v[key]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
      }
    }
  }
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Passed to ConfigModule.forRoot({ validate }). Using `validate` (not `load`)
 * means the coerced/typed values below REPLACE the raw string env in
 * ConfigService — so `config.get('RETENTION_FREE_DAYS')` is a number, not "7".
 */
export function loadConfiguration(raw: Record<string, unknown> = process.env): AppConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/** Typed getter helper so services read `cfg.get('S3_BUCKET')` with inference. */
export type TypedConfigGet = <K extends keyof AppConfig>(key: K) => AppConfig[K];
