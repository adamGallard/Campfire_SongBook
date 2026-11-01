import { createHash } from 'node:crypto';

/**
 * Salted hash of the caller's IP: enough to rate-limit, not an address on file.
 * The limit itself is enforced inside the database function that is called, so
 * it holds even if someone calls the database directly.
 */
export function clientIpHash(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.SUBMISSION_SALT ?? 'campfire';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}
