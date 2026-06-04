# Wix To WordPress Blog Exporter Via Velo

Export Wix blogs to WordPress automatically using Wix Velo code.

---

## Features

- Post title
- Slug
- Excerpt
- Publish date
- Rich text content (formatting preserved: headings, paragraphs, lists, links)
- Images (Wix CDN URLs compatible with WordPress import)
- Categories
- Internal links

---

## Setup

### Step 1: Enable Velo (Developer Mode)

In your Wix Editor, enable **Developer Mode (Velo)**.

Open any page (Home page is fine) and paste the frontend exporter code into that page's code file.

---

### Step 2: Create Backend File

Go to:

**{ } Code Files → Backend**

Create a file:

```
exportblog.web.js
```

Paste your backend blog export logic there and save.

---

## ⚙️ Configuration

### 1. Category Mapping (IMPORTANT)

Wix uses category IDs (UUIDs), not names.

Inside your code:

```js
const CATEGORY_MAP = {
  "wix-category-id": "Technology",
  "another-category-id": "News"
};
```

**How to get category IDs in Wix:**

1. Go to Wix Dashboard
2. Open **Blog → Categories**
3. Click a category
4. Copy its ID (looks like a UUID)

Example:

```
0dc3f4f3-74f5-4534-87d1-f010a53294a3
```

If not mapped, the category becomes:

```
Uncategorized-xxxxxxx
```

---

### 2. Getting Blog Posts (Wix Entries)

Your exporter uses:

```
getAllBlogPosts()
```

This must return Wix blog post objects containing:

- `title`
- `slug`
- `excerpt`
- `richContent`
- `categoryIds`
- `media`
- `publishedDate`

This function lives in:

```
backend/exportblog.web.js
```

---

### 3. Site Name + Domain (REQUIRED)

You must set your Wix site URL manually:

```js
buildWordPressXml(posts, siteUrl, siteTitle)
```

Example:

```js
const xml = buildWordPressXml(
  data,
  "https://yourdomain.com",
  "My Blog"
);
```

**How to find your Wix domain:**

- Go to **Wix Dashboard → Settings → Domains**
- Or use the default: `https://username.wixsite.com/sitename`
- If a custom domain exists, use that instead

---

## 🚀 Generate Export

1. Run your Wix site in **Preview** or **Live** mode
2. Open browser **DevTools** (`F12`)
3. Go to the **Console** tab
4. Copy the full XML output
5. Save it as:

```
wix-blog-export.xml
```

---

## 📥 Import into WordPress

Go to:

**WordPress Dashboard → Tools → Import → WordPress**

- Install the importer if prompted
- Upload the XML file
- Run the import

WordPress will import:

- Posts
- Categories
- Images (via URLs)
- Content formatting

---

## 📚 WordPress Docs

- https://wordpress.org/documentation/article/tools-import-screen/
- https://wordpress.org/documentation/article/importing-content/
