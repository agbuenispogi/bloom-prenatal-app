import type { MetadataRoute } from "next";

// Bloom is a private household health app: nothing here should ever be indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
