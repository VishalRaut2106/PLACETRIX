import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://placetrix.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/home/", "/api/", "/auth/", "/verify/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
