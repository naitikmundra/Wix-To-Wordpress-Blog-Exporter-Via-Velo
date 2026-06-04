# Wix To WordPress Blog Exporter Via Velo

Export Wix blogs to WordPress automatically using Wix Velo code.

### Features

* Post title
* Slug
* Excerpt
* Publish date
* Rich text content (all formatting, paragraphs, and headings preserved in proper sequence)
* Images (using Wix image URLs that WordPress can automatically import into the Media Library)
* Categories
* Internal links inside content

## Setup

### Step 1: Enable Velo (Developer Mode)

In your Wix Editor, enable **Developer Mode (Velo)**.

Open any page (the Home page works fine) and paste the frontend code provided in this repository into the page's code file.

### Step 2: Create the Backend File

Click the **{ } Code Files** icon in the left sidebar.

Under **Backend**, create a new file named:

`exportblog.web.js`

Paste the backend code from this repository into that file and save.

### Step 3: Generate the Export

Preview or run the site.

The script will generate a complete WordPress WXR (XML) export and print it to the browser console.

Copy everything printed in the console and save it as:

`wix-blog-export.xml`

### Step 4: Import into WordPress

In your WordPress dashboard:

**Tools → Import → WordPress**

Install the WordPress Importer if prompted, then upload the generated XML file.

WordPress will import all supported blog data contained in the export file.

### WordPress Import Tutorial

A good official guide is available here:

https://wordpress.org/documentation/article/tools-import-screen/

Or the detailed importer guide:

https://wordpress.org/documentation/article/importing-content/

That's it — no external migration service required.
