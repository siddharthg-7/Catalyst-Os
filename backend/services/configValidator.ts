/**
 * CatalystOS - Environment Configuration & Secrets Validator (Phase 1.3)
 * Validates mandatory environment secrets on server boot and fails fast in production if compromised.
 */

export interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironmentConfig(): ConfigValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const warnings: string[] = [];
  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;
  const insecureDefaultSecrets = [
    'catalyst_os_neon_jwt_secret_2026',
    'secret',
    'jwt_secret',
    'change_me',
    'default'
  ];

  if (!jwtSecret) {
    if (isProduction) {
      errors.push('CRITICAL: JWT_SECRET environment variable is not defined.');
    } else {
      warnings.push('NOTICE: JWT_SECRET is not set; using local development key.');
    }
  } else if (insecureDefaultSecrets.includes(jwtSecret)) {
    if (isProduction) {
      errors.push('CRITICAL: JWT_SECRET is set to an insecure known default string. Set a cryptographically random secret.');
    } else {
      warnings.push('NOTICE: JWT_SECRET is using a development default key.');
    }
  }

  // Database validation
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && isProduction) {
    errors.push('CRITICAL: DATABASE_URL must be configured in production.');
  }

  // AI Provider validation
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
    warnings.push('NOTICE: GEMINI_API_KEY is not configured or using placeholder. Multi-agent execution will operate in deterministic local fallback mode.');
  }

  const valid = errors.length === 0;

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[ConfigValidator] ⚠️ ${w}`));
  }

  if (!valid) {
    errors.forEach(e => console.error(`[ConfigValidator] 🚨 ${e}`));
    if (isProduction) {
      throw new Error(`[ConfigValidator] Server boot aborted due to invalid production secrets:\n${errors.join('\n')}`);
    }
  } else {
    console.log('[ConfigValidator] ✅ Environment configuration validation passed.');
  }

  return { valid, warnings, errors };
}
