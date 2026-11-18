/**
 * Generates a valid 10-digit Indian mobile number for isolated test runs.
 */
export function generateTestPhone(): { national: string; full: string } {
  const num = Math.floor(100000000 + Math.random() * 900000000).toString();
  const national = `9${num}`;
  return {
    national,
    full: `+91${national}`
  };
}
