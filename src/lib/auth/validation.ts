export const MIN_PASSWORD_LENGTH = 8;
export const MIN_ACCOUNT_AGE_YEARS = 18;

export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

/** Returns true when DOB indicates age >= minYears (calendar age). */
export function isAtLeastAge(
  dateOfBirth: string,
  minYears: number = MIN_ACCOUNT_AGE_YEARS
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return false;
  }

  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthUtc = Date.UTC(year, month - 1, day);
  if (Number.isNaN(birthUtc)) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  if (birthUtc > todayUtc) {
    return false;
  }

  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() - (month - 1);
  const dayDiff = now.getUTCDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= minYears;
}
