import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { convert } from "html-to-text";
import { BskyAgent, RichText } from "@atproto/api";

// Expose the contents of the .env file as `process.env`
import "dotenv/config";

class Crossposter {
  #dataFilePath = new URL("./data/lastPostId.txt", import.meta.url);
  #agent = new BskyAgent({ service: process.env.BLUESKY_INSTANCE });

  constructor() {
    // Initial (on load) update
    this.update();

    // Keep track of the most recently posted post
    this.lastPostId = this.getLastPostId();

    // Check for new posts on a regular interval
    setInterval(
      this.update.bind(this),
      (process.env.INTERVAL_MINUTES ?? 5) * 60000
    );
  }

  async update() {
    await this.getNewMastodonPosts();
  }

  getLastPostId() {
    try {
      return Number(readFileSync(this.#dataFilePath, { encoding: "utf8" }));
    } catch (err) {
      console.error(err);
    }
  }

  async saveLastPostId() {
    try {
      await writeFile(this.#dataFilePath, String(this.lastPostId), {
        encoding: "utf8",
      });
    } catch (err) {
      console.error(err);
    }
  }

  formatPost(post) {
    // Strip HTML, deencode HTML entities, try and preserve line breaks and
    // paragraphs.
    let postContent = convert(post.object.content, {
      wordwrap: false,
      selectors: [
        {
          selector: "a",
          options: {
            ignoreHref: true,
          },
        },
      ],
    });

    // Truncate content to 250 characters.
    // We're going to append a 48 character URL to the end of each one (plus an
    // ellipsis and a space). Bluesky's character limit is 300, so posts can be
    // a maximum of 250 characters before being cut off.
    // https://chitter.xyz/@batbeeps/112317307773941037
    if (postContent.length > 250) {
      postContent = postContent.substring(0, 250) + "…";
    }

    // Append the original post URL. Kinda needed if things are cut off or media
    // is missing.
    postContent += ` ${post.object.url}`;

    return postContent;
  }

  async postToBluesky(text) {
    // Log into Bluesky
    await this.#agent.login({
      identifier: process.env.BLUESKY_USERNAME,
      password: process.env.BLUESKY_APP_PASSWORD,
    });

    // Do Bluesky's weird facet hoop jumping
    const richText = new RichText({ text });
    await richText.detectFacets(this.#agent);

    // Post the thing
    if (!process.env.DRY_RUN) {
      await this.#agent.post({
        text: richText.text,
        facets: richText.facets,
      });
    }

    console.log(">>> POSTED TO BLUESKY", richText.text);
  }

  async update() {
    console.log(">>> Checking for new posts on Mastodon...");

    const userUrlPrefix = `${process.env.MASTODON_INSTANCE}/users/${process.env.MASTODON_USERNAME}`;
    // Query the user's ActivityPub outbox for the latest posts by a user.
    // This bypasses the Mastodon API in a slightly dodge way, but it saves us
    // first having to query for the internal user ID. 🤷
    const response = await fetch(`${userUrlPrefix}/outbox?page=true`);
    const data = await response.json();
    let posts = data?.orderedItems;

    posts = posts
      // Only act upon creations of the "Note" type (not edits or other types).
      .filter((post) => post.type === "Create" && post.object.type === "Note")

      // Remove replies to other users by filtering down to posts that aren't
      // replies to anything, or which are replies to the source user (to
      // account for post threads).
      .filter(
        (post) =>
          post.object.inReplyTo === null ||
          post.object.inReplyTo.startsWith(userUrlPrefix)
      )

      // Reverse the post order so that the oldest ones get posted first.
      .reverse();

    let highestPostId = 0;

    posts.forEach((post) => {
      const postId = Date.parse(post.published);

      if (postId > highestPostId) {
        highestPostId = postId;
      }

      if (postId > this.lastPostId) {
        console.log(`>>> Found new post: ${postId}`);

        const postText = this.formatPost(post);
        this.postToBluesky(postText);
      }
    });

    if (highestPostId > 0) {
      this.lastPostId = highestPostId;
      await this.saveLastPostId();
    }
  }
}

new Crossposter();
