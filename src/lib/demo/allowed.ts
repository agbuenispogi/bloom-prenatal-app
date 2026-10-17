// The /dev demo pages (synthetic data) exist in development, and in production only for a QA build made
// with BLOOM_DEMO=1 (Lighthouse runs). Never set BLOOM_DEMO on the real deployment.
export const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.BLOOM_DEMO === "1";
