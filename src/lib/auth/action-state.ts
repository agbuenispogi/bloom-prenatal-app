export type ActionState = {
  error?: string;
  message?: string;
  // Echo back non-secret fields so the form keeps what she typed after an error.
  values?: Record<string, string>;
  // Where to sign in instead (e.g. the email already has an account in the shared project).
  signInHref?: string;
};

export const initialActionState: ActionState = {};
