// backend/getAllBlogPosts.web.js
// An Exporter by Naitik Mundra

//CHANGE .limit(200) to the number of posts
import { Permissions, webMethod } from "wix-web-module";
import { posts } from "wix-blog-backend";

// fetch full text content of a single post
export async function getPostContent(postId) {
    const options = {
        fieldsets:  (["RICH_CONTENT"])
    };

    try {
        const result = await posts.getPost(postId, options);
        return result.post;
    } catch (error) {
        console.error("getPostContent error:", error);
        return null;
    }
}

export const getAllBlogPosts = webMethod(
    Permissions.Anyone,
    async () => {
        try {
            const result = await posts.queryPosts()
                .limit(200)
                .find();

            const formatted = await Promise.all(
                result.items.map(async (post) => {

                    let content = await getPostContent(post._id);

                    if (!content) {
                        content = "Failed to Fetch";
                    }

                    return {
                        id: post._id,
                        title: post.title,
                        slug: post.slug,
                        excerpt: post.excerpt,
                        publishedDate: post.firstPublishedDate,
                        category: post.categoryIds,
                        html: content
                    };
                })
            );

            return formatted;

        } catch (e) {
            console.error("getAllBlogPosts error:", e);
            return [];
        }
    }
);
