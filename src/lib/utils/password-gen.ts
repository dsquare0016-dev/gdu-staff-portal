/**
 * Generates a secure random password for new staff.
 * Format example: GDU@2026#AB12
 */
export function generateSecurePassword(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format: GDU@{YEAR}#{RANDOM_4_CHARS}
  return `GDU@${year}#${randomPart}`;
}
