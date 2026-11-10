// In-memory pending referral codes (telegramId → referralCode)
// Stored between /start and language selection callback
export const pendingReferrals = new Map<string, string>();

// Users waiting to type in a referral code manually
export const awaitingReferralCode = new Set<string>();
