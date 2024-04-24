# m2b: Mastodon to Bluesky crossposter

I quite like using Mastodon, but I'm not so much a fan of Bluesky.

Unfortunately, during the post-Musk acquisiton of Twitter, quite a few of my friends opted to migrate to Bluesky, depriving themselves of seeing my numerous spur-of-the-moment witticisms. Too bad, I should fix that.

This is mainly a personal project to learn how to use Docker and to find a use for the Raspberry Pi 3 B+ I've not done anything with for a little while. The aim here is for something that works, rather than something that's good, so temper any expectations of greatness. Here be dragons.

It is partially derivative of [mauricerenck/mastodon-to-bluesky](https://github.com/mauricerenck/mastodon-to-bluesky) and copies a few of the ways it does things, particularly in how it pulls content from Mastodon and determines what to post.

## Installation

### Create a `.env` file

```env
MASTODON_INSTANCE="https://mastodon.instance"
MASTODON_USERNAME="username"
BLUESKY_INSTANCE="https://bsky.social"
BLUESKY_USERNAME="username.bsky.social"
BLUESKY_APP_PASSWORD="abcd-efgh-ijkl-mnop"
```

For some reason, even though the first-party Bluesky instance is at `bsky.app`, the URL you need to access its API is `bsky.social`. I have no idea why. It's a bit silly.

Go to [Bluesky's app password settings](https://bsky.app/settings/app-passwords) to create an app password.

### Build it with docker

```sh
docker build -t m2b .
```

### Run it with docker

```sh
docker run --restart unless-stopped --name m2b -d m2b
```
