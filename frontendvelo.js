// ============================================================
// Turn on dev mode and paste this code on any page's code file
// An exporter by Naitik Mundra
// Page code — Wix Velo: Wix Blog → WordPress WXR (xml) Exporter
// ============================================================

import { getAllBlogPosts } from 'backend/exportblog.web';

// ─── Category ID → Label map ─────────────────────────────────
// Add all your category IDs here
const CATEGORY_MAP = {
  "0dc3f4f3-74f5-4534-87d1-f010a53294a3": "Category Name 1",
  "sample category ID": "Category Name 2",
  // Add more: "uuid-here": "Category Name",
};

// ─── Fix backslash-escaped characters from Wix/JSON ──────────
function unescapeStr(str = "") {
  return String(str)
    .replace(/\\_/g, "_")
    .replace(/\\\//g, "/")
    .replace(/\\~/g, "~");
}

// ─── Strip accidental base-URL prefix from a URL ─────────────
// Fixes URLs like: http://mysite.local/"https://static.wixstatic.com/..."
function cleanUrl(url = "") {
  if (!url) return "";
  // Remove backslash escaping first
  url = unescapeStr(url);
  // If another absolute URL is embedded inside (double URL), extract the inner one
  const doubleHttpMatch = url.match(/https?:\/\/[^/]+\/"?(https?:\/\/.+?)"?\s*$/);
  if (doubleHttpMatch) return doubleHttpMatch[1];
  // Also handle encoded version: %22https%3A%2F%2F...
  const encodedMatch = url.match(/https?:\/\/[^/]+\/%22(https?:\/\/.+?)(?:%22|$)/);
  if (encodedMatch) return decodeURIComponent(encodedMatch[1]);
  return url;
}

// ─── Wix media ID → full CDN URL ─────────────────────────────
function wixImageUrl(mediaId) {
  if (!mediaId) return "";
  // Fix backslash escaping in media IDs (e.g. f778f5\_abc~mv2.jpg → f778f5_abc~mv2.jpg)
  mediaId = unescapeStr(mediaId);
  // Strip ALL quotes, backticks, and whitespace — Wix sometimes embeds a leading " in the ID
  // which causes WordPress to treat the URL as relative and prepend the site URL to it
  mediaId = mediaId.replace(/["'`\s]/g, "");
  if (!mediaId) return "";
  // Handle wix:image://v1/FILE_ID/FILENAME#... format
  if (mediaId.startsWith("wix:image://")) {
    const withoutPrefix = mediaId.replace("wix:image://v1/", "");
    const fileId = withoutPrefix.split("/")[0].split("#")[0];
    return `https://static.wixstatic.com/media/${fileId}`;
  }
  // Plain file ID like: f778f5_abc~mv2.jpg
  return `https://static.wixstatic.com/media/${mediaId}`;
}

// ─── Escape XML attribute values ─────────────────────────────
function xmlAttr(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Escape plain text inside HTML (not CDATA) ───────────────
function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Resolve any link URL (handle relative Wix /post/ paths) ─
function resolveUrl(url = "", baseUrl = "https://yoursite.com") {
  if (!url) return "#";
  url = cleanUrl(url);
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ─── Render inline TEXT child nodes with decorations ─────────
function renderTextNodes(nodes = [], baseUrl) {
  return nodes.map(child => {
    if (child.type === "CAPTION") {
      return renderTextNodes(child.nodes || [], baseUrl);
    }
    if (child.type !== "TEXT") return "";

    let text = escHtml(child.textData?.text || "");
    if (!text.trim()) return text;

    const decs = child.textData?.decorations || [];

    const linkDec = decs.find(d => d.type === "LINK");
    if (linkDec) {
      const href = xmlAttr(resolveUrl(linkDec.linkData?.link?.url, baseUrl));
      const target = linkDec.linkData?.link?.target === "BLANK"
        ? ` target="_blank" rel="noreferrer noopener"`
        : "";
      text = `<a href="${href}"${target}>${text}</a>`;
    }

    if (decs.find(d => d.type === "BOLD"))      text = `<strong>${text}</strong>`;
    if (decs.find(d => d.type === "ITALIC"))     text = `<em>${text}</em>`;
    if (decs.find(d => d.type === "UNDERLINE"))  text = `<u>${text}</u>`;
    if (decs.find(d => d.type === "SPOILER"))    text = `<span class="spoiler">${text}</span>`;

    return text;
  }).join("");
}

// ─── Render list items (LIST_ITEM > PARAGRAPH/TEXT children) ─
function renderListItems(nodes = [], baseUrl) {
  return nodes.map(item => {
    if (item.type !== "LIST_ITEM") return "";
    return `<li>${richContentToHtml(item.nodes || [], baseUrl)}</li>`;
  }).join("");
}

// ─── Main rich content node tree → HTML ──────────────────────
function richContentToHtml(nodes = [], baseUrl = "https://yoursite.com") {
  const parts = [];

  for (const node of nodes) {

    // IMAGE
    if (node.type === "IMAGE") {
      const srcId = node.imageData?.image?.src?._id || "";
      if (!srcId) continue;
      // Do NOT wrap image URLs with xmlAttr() — they live inside CDATA so no XML escaping needed
      const url   = wixImageUrl(srcId);
      const w     = node.imageData?.image?.width  || "";
      const h     = node.imageData?.image?.height || "";
      const alt   = (node.imageData?.altText || "").replace(/"/g, "'"); // safe for HTML attr
      const align = node.imageData?.containerData?.alignment || "CENTER";
      const style = align === "CENTER" ? ` style="display:block;margin:0 auto;"` : "";
      parts.push(`<img src="${url}" width="${w}" height="${h}" alt="${alt}"${style} />`);
      continue;
    }

    // VIDEO
    if (node.type === "VIDEO") {
      const rawVideoUrl  = node.videoData?.video?.src?.url || "";
      const videoUrl     = cleanUrl(rawVideoUrl);
      const thumbUrl     = cleanUrl(node.videoData?.thumbnail?.src?.url || "");
      const thumbId      = node.videoData?.thumbnail?.src?._id || "";
      const posterUrl    = thumbUrl || (thumbId ? wixImageUrl(thumbId) : "");
      const title        = (node.videoData?.title || "").replace(/"/g, "'");
      const captionNode  = (node.nodes || []).find(n => n.type === "CAPTION");
      const captionText  = captionNode ? renderTextNodes(captionNode.nodes || [], baseUrl) : "";

      if (!videoUrl) continue;

      const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (ytMatch) {
        const videoId = ytMatch[1];
        parts.push(
          `<figure class="wp-block-embed is-type-video">` +
          `<div class="wp-block-embed__wrapper">` +
          `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" ` +
          `title="${title}" frameborder="0" allowfullscreen></iframe>` +
          `</div>` +
          (captionText ? `<figcaption>${captionText}</figcaption>` : "") +
          `</figure>`
        );
      } else {
        const poster = posterUrl ? ` poster="${posterUrl}"` : "";
        parts.push(
          `<figure class="wp-block-video">` +
          `<video src="${videoUrl}"${poster} controls title="${title}"></video>` +
          (captionText ? `<figcaption>${captionText}</figcaption>` : "") +
          `</figure>`
        );
      }
      continue;
    }

    // HEADING
    if (node.type === "HEADING") {
      const level = Math.min(Math.max(node.headingData?.level || 2, 1), 6);
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      if (inner.trim()) parts.push(`<h${level}>${inner}</h${level}>`);
      continue;
    }

    // PARAGRAPH
    if (node.type === "PARAGRAPH") {
      if (!node.nodes || node.nodes.length === 0) continue;
      const inner = renderTextNodes(node.nodes, baseUrl);
      if (inner.trim()) parts.push(`<p>${inner}</p>`);
      continue;
    }

    // BLOCKQUOTE
    if (node.type === "BLOCKQUOTE") {
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      if (inner.trim()) parts.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // ORDERED LIST
    if (node.type === "ORDERED_LIST") {
      parts.push(`<ol>${renderListItems(node.nodes || [], baseUrl)}</ol>`);
      continue;
    }

    // UNORDERED LIST
    if (node.type === "UNORDERED_LIST") {
      parts.push(`<ul>${renderListItems(node.nodes || [], baseUrl)}</ul>`);
      continue;
    }

    // CODE BLOCK
    if (node.type === "CODE_BLOCK") {
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      parts.push(`<pre><code>${inner}</code></pre>`);
      continue;
    }

    // DIVIDER
    if (node.type === "DIVIDER") {
      parts.push(`<hr />`);
      continue;
    }

    // EMBED (iFrame / generic embed)
    if (node.type === "EMBED") {
      const url = cleanUrl(node.embedData?.url || node.embedData?.src?.url || "");
      if (url) parts.push(`<figure class="wp-block-embed"><div class="wp-block-embed__wrapper"><iframe src="${url}" frameborder="0"></iframe></div></figure>`);
      continue;
    }

    // GIPHY
    if (node.type === "GIPHY") {
      const url = cleanUrl(node.giphyData?.gif?.originalUrl || node.giphyData?.gif?.stillUrl || "");
      if (url) parts.push(`<img src="${url}" alt="gif" />`);
      continue;
    }

    // GALLERY (array of images)
    if (node.type === "GALLERY") {
      const items = node.galleryData?.items || [];
      const imgs = items.map(item => {
        const id  = item.image?.media?.src?._id || "";
        const url = id ? wixImageUrl(id) : cleanUrl(item.image?.media?.src?.url || "");
        const alt = (item.title || "").replace(/"/g, "'");
        return url ? `<img src="${url}" alt="${alt}" />` : "";
      }).filter(Boolean).join("\n");
      if (imgs) parts.push(`<figure class="wp-block-gallery">\n${imgs}\n</figure>`);
      continue;
    }

    // Unknown node type — silently skip
  }

  return parts.join("\n");
}

// ─── Format date for WordPress RSS pubDate ────────────────────
function toWpPubDate(isoStr) {
  try { return new Date(isoStr).toUTCString(); }
  catch { return new Date().toUTCString(); }
}

// ─── Format date for wp:post_date (YYYY-MM-DD HH:MM:SS) ──────
function toWpDate(isoStr) {
  try {
    return new Date(isoStr).toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "");
  } catch { return ""; }
}

// ─── Build the full WXR XML string ───────────────────────────
function buildWordPressXml(posts, siteUrl = "https://yoursite.com", siteTitle = "My Blog") {

  // Collect all unique category IDs across all posts
  const allCategoryIds = [...new Set(posts.flatMap(p => p.html?.categoryIds || []))];

  const categoryTerms = allCategoryIds.map((id, index) => {
    const label = CATEGORY_MAP[id] || `Uncategorized-${id.slice(0, 8)}`;
    const slug  = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `
  <wp:category>
    <wp:term_id>${index + 1}</wp:term_id>
    <wp:category_nicename>${slug}</wp:category_nicename>
    <wp:category_parent></wp:category_parent>
    <wp:cat_name><![CDATA[${label}]]></wp:cat_name>
  </wp:category>`;
  }).join("\n");

  const items = posts.map((post, postIndex) => {
    const html       = post.html || {};
    const title      = html.title  || post.title  || "Untitled";
    const slug       = unescapeStr(html.slug   || post.slug   || "");
    const excerpt    = html.excerpt || post.excerpt || "";
    const pubDate    = html.firstPublishedDate || post.publishedDate || new Date().toISOString();
    const modDate    = html.lastPublishedDate  || pubDate;
    const postId     = html._id || post.id || `post-${postIndex + 1}`;
    const isFeatured = html.featured ? "1" : "0";
    const comments   = html.commentingEnabled ? "open" : "closed";

    // Featured image — clean the media ID before converting
    const rawMediaImage    = html.media?.wixMedia?.image || "";
    const featuredImageUrl = wixImageUrl(unescapeStr(rawMediaImage));

    // Post body HTML
    const contentHtml = richContentToHtml(html.richContent?.nodes || [], siteUrl);

    // Category tags for this post
    const postCategoryTags = (html.categoryIds || []).map(id => {
      const label = CATEGORY_MAP[id] || `Uncategorized-${id.slice(0, 8)}`;
      const slug2 = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return `    <category domain="category" nicename="${slug2}"><![CDATA[${label}]]></category>`;
    }).join("\n");

    // Tags/hashtags
    const hashtagTags = (html.hashtags || []).map(tag => {
      const tagSlug = tag.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return `    <category domain="post_tag" nicename="${tagSlug}"><![CDATA[${tag}]]></category>`;
    }).join("\n");

    return `
  <item>
    <title><![CDATA[${title}]]></title>
    <link>${siteUrl}/post/${xmlAttr(slug)}</link>
    <pubDate>${toWpPubDate(pubDate)}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <guid isPermaLink="false">${siteUrl}/?p=${xmlAttr(postId)}</guid>
    <description></description>
    <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
    <excerpt:encoded><![CDATA[${excerpt}]]></excerpt:encoded>
    <wp:post_id>${postIndex + 1}</wp:post_id>
    <wp:post_date>${toWpDate(pubDate)}</wp:post_date>
    <wp:post_date_gmt>${toWpDate(pubDate)}</wp:post_date_gmt>
    <wp:post_modified>${toWpDate(modDate)}</wp:post_modified>
    <wp:post_modified_gmt>${toWpDate(modDate)}</wp:post_modified_gmt>
    <wp:comment_status>${comments}</wp:comment_status>
    <wp:ping_status>open</wp:ping_status>
    <wp:post_name>${xmlAttr(slug)}</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>post</wp:post_type>
    <wp:is_sticky>${isFeatured}</wp:is_sticky>
${postCategoryTags}
${hashtagTags}
    <wp:postmeta>
      <wp:meta_key>_thumbnail_url</wp:meta_key>
      <wp:meta_value><![CDATA[${featuredImageUrl}]]></wp:meta_value>
    </wp:postmeta>
    <wp:postmeta>
      <wp:meta_key>_yoast_wpseo_metadesc</wp:meta_key>
      <wp:meta_value><![CDATA[${excerpt}]]></wp:meta_value>
    </wp:postmeta>
    <wp:postmeta>
      <wp:meta_key>wix_post_id</wp:meta_key>
      <wp:meta_value><![CDATA[${postId}]]></wp:meta_value>
    </wp:postmeta>
  </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by Wix Velo → WordPress WXR Exporter -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
  <title>${xmlAttr(siteTitle)}</title>
  <link>${siteUrl}</link>
  <description>Exported from Wix Blog</description>
  <language>en</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${siteUrl}</wp:base_site_url>
  <wp:base_blog_url>${siteUrl}</wp:base_blog_url>
${categoryTerms}
${items}
</channel>
</rss>`;
}

// ─── Entry point ──────────────────────────────────────────────
$w.onReady(async () => {
  try {
    const data = await getAllBlogPosts();

    const xml = buildWordPressXml(
      data,
      "https://www.domain.com",  // ← replace with your actual domain
      "Website Name"             // ← replace with your site title
    );

    // OUTPUT: Copy paste this into an XML file
    console.log(xml);

  } catch (err) {
    console.error("Export failed:", err);
  }
});
