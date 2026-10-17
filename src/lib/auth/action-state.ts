export type ActionState = {
  error?: string;
  message?: string;
  // Echo back non-secret fields so the form keeps what she typed after an error.
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};
