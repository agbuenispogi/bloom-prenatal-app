// Email is optional: it switches on only when Resend is configured. Until then every reminder and the
// morning summary go to the phones (push), and the caregiver's heads-up is a push too.
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
