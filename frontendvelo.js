// ============================================================
// Turn on dev mode and paste this code on any page's code file
// An exporter by Naitik Mundra
// Page code — Wix Velo: Wix Blog → WordPress WXR (xml) Exporter
// ============================================================

import { getAllBlogPosts } from 'backend/exportblog.web';

// ─── CATEGORY MAP ─────────────────────────────────────────────
const CATEGORY_MAP = {
  "0dc3f4f3-74f5-4534-87d1-f010a53294a3": "Category Name 1",
};

// ─── CLEAN URL ────────────────────────────────────────────────
function cleanUrl(url = "") {
  return String(url)
    .trim()
    .replace(/^["']|["']$/g, ""); // remove wrapping quotes
}

// ─── CHECK ABSOLUTE URL ───────────────────────────────────────
function isAbsolute(url = "") {
  return /^https?:\/\//i.test(cleanUrl(url));
}

// ─── RESOLVE URL ──────────────────────────────────────────────
function resolveUrl(url = "", baseUrl = "https://yoursite.com") {
  const u = cleanUrl(url);
  if (!u) return "#";
  if (isAbsolute(u)) return u;
  return `${baseUrl}${u.startsWith("/") ? "" : "/"}${u}`;
}

// ─── WIX IMAGE URL ────────────────────────────────────────────
function wixImageUrl(mediaId) {
  if (!mediaId) return "";

  if (mediaId.startsWith("wix:image://")) {
    const withoutPrefix = mediaId.replace("wix:image://v1/", "");
    const fileId = withoutPrefix.split("/")[0].split("#")[0];
    return `https://static.wixstatic.com/media/${fileId}`;
  }

  return `https://static.wixstatic.com/media/${mediaId}`;
}

// ─── XML ESCAPE ───────────────────────────────────────────────
function xmlAttr(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── HTML ESCAPE ──────────────────────────────────────────────
function escHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── TEXT RENDERER ────────────────────────────────────────────
function renderTextNodes(nodes = [], baseUrl) {
  return nodes.map(child => {
    if (child.type === "TEXT") {
      let text = escHtml(child.textData?.text || "")
        .replace(/\\+/g, ""); // remove stray backslashes

      const decs = child.textData?.decorations || [];

      const linkDec = decs.find(d => d.type === "LINK");
      if (linkDec) {
        const raw = linkDec.linkData?.link?.url || "";
        const cleaned = cleanUrl(raw);
        const resolved = isAbsolute(cleaned)
          ? cleaned
          : resolveUrl(cleaned, baseUrl);

        const href = xmlAttr(resolved);

        const target = linkDec.linkData?.link?.target === "BLANK"
          ? ` target="_blank" rel="noreferrer noopener"`
          : "";

        text = `<a href="${href}"${target}>${text}</a>`;
      }

      if (decs.find(d => d.type === "BOLD")) text = `<strong>${text}</strong>`;
      if (decs.find(d => d.type === "ITALIC")) text = `<em>${text}</em>`;
      if (decs.find(d => d.type === "UNDERLINE")) text = `<u>${text}</u>`;

      return text;
    }

    if (child.type === "CAPTION") {
      return renderTextNodes(child.nodes || [], baseUrl);
    }

    return "";
  }).join("");
}

// ─── LIST RENDER ──────────────────────────────────────────────
function renderListItems(nodes = [], baseUrl) {
  return nodes.map(item => {
    if (item.type !== "LIST_ITEM") return "";
    return `<li>${richContentToHtml(item.nodes || [], baseUrl)}</li>`;
  }).join("");
}

// ─── MAIN RICH CONTENT → HTML ────────────────────────────────
function richContentToHtml(nodes = [], baseUrl = "https://yoursite.com") {
  const parts = [];

  for (const node of nodes) {

    if (node.type === "PARAGRAPH") {
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      if (inner.trim()) parts.push(`<p>${inner}</p>`);
    }

    if (node.type === "HEADING") {
      const level = Math.min(Math.max(node.headingData?.level || 2, 1), 6);
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      parts.push(`<h${level}>${inner}</h${level}>`);
    }

    if (node.type === "IMAGE") {
      const srcId = node.imageData?.image?.src?._id || "";
      const url = wixImageUrl(srcId);
      const alt = xmlAttr(node.imageData?.altText || "");
      parts.push(`<img src="${xmlAttr(url)}" alt="${alt}" />`);
    }

    if (node.type === "DIVIDER") {
      parts.push("<hr />");
    }

    if (node.type === "BLOCKQUOTE") {
      const inner = renderTextNodes(node.nodes || [], baseUrl);
      parts.push(`<blockquote>${inner}</blockquote>`);
    }

    if (node.type === "ORDERED_LIST") {
      parts.push(`<ol>${renderListItems(node.nodes || [], baseUrl)}</ol>`);
    }

    if (node.type === "UNORDERED_LIST") {
      parts.push(`<ul>${renderListItems(node.nodes || [], baseUrl)}</ul>`);
    }
  }

  return parts.join("\n");
}

// ─── WORDPRESS DATE HELPERS ───────────────────────────────────
function toWpDate(iso) {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\..+/, "");
  } catch {
    return "";
  }
}

function toWpPubDate(iso) {
  return new Date(iso).toUTCString();
}

// ─── BUILD XML ───────────────────────────────────────────────
function buildWordPressXml(posts, siteUrl = "https://yoursite.com", siteTitle = "My Blog") {

  const items = posts.map((post, i) => {
    const html = post.html || {};

    const title = xmlAttr(html.title || "Untitled");
    const slug = xmlAttr(html.slug || `post-${i}`);
    const pubDate = toWpPubDate(html.firstPublishedDate);
    const content = richContentToHtml(html.richContent?.nodes || [], siteUrl);

    return `
<item>
  <title>${title}</title>
  <link>${siteUrl}/${slug}</link>
  <pubDate>${pubDate}</pubDate>
  <content:encoded><![CDATA[${content}]]></content:encoded>
</item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
xmlns:content="http://purl.org/rss/1.0/modules/content/">

<channel>
  <title>${siteTitle}</title>
  <link>${siteUrl}</link>
  <description>Exported Wix Blog</description>

${items}

</channel>
</rss>`;
}

// ─── RUN EXPORT ───────────────────────────────────────────────
$w.onReady(async () => {
  try {
    const data = await getAllBlogPosts();

    const xml = buildWordPressXml(
      data,
      "https://www.domain.com",
      "Website Name"
    );

    console.log(xml);

  } catch (err) {
    console.error("Export failed:", err);
  }
});
