const key = (userId: string) => `axon:onboarded:${userId}`;

export function markSessionOnboarded(userId: string) {
  try {
    sessionStorage.setItem(key(userId), "true");
  } catch {
    /* ignore */
  }
}

export function isSessionOnboarded(userId: string): boolean {
  try {
    return sessionStorage.getItem(key(userId)) === "true";
  } catch {
    return false;
  }
}

export function clearSessionOnboarded(userId: string) {
  try {
    sessionStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
