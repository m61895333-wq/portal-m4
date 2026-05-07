import { categoryName } from "./categories";
import type { PortalPost } from "./types";

const siteName = "Portal M4";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portalm4.com.br";

export function buildPostMetadata(post: PortalPost) {
  const title = `${post.title} | ${siteName}`;
  const description = post.excerpt;
  const url = `${siteUrl}/artigo/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "article",
      images: [{ url: post.imageUrl }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.imageUrl]
    },
    keywords: [categoryName(post.category), ...post.tags, "Portal M4", "Grupo M4"]
  };
}
