# Deno Canary Sizes

Prompted by a question on the Deno Discord, I created this repo to measure the size of each canary build of `deno`.

<img width="841" alt="image" src="https://github.com/rgbkrk/deno-canary-sizes/assets/836375/56f6e303-9a1a-41be-ae4b-3121d1ecb6ca">

## How are code changes affecting the size of the Deno binary?

`scarf` on the Deno Discord had this question:

> Are there any guide to build a 'stripped-down' version of `deno` from source? for example, i'd like to build a deno binary that runs typescript files but other additional features like `check`, `fmt`, `jupyter`, `lsp` removed. this would be useful to reduce binary size in docker container

I figured the addition of Jupyter code was pretty small (main new requirement is zeromq, the rest is all protocols that Jupyter handles). To test that hypothesis, I calculated the Deno size between Linux canaries from dl.deno.land.

## Canary Locations

You can dowload the canary for any commit (if built successfully) with a URL like below:

`https://dl.deno.land/canary/[COMMIT_HASH]/deno-[TARGET_TUPLE].zip`

These are the currently supported target tuples:

- Apple ARM (64-bit): `aarch64-apple-darwin`

- Apple x86 (64-bit): `x86_64-apple-darwin`

- Linux x86 (64-bit): `x86_64-unknown-linux-gnu`

- Windows x86 (64-bit): `x86_64-pc-windows-msvc`

Since scarf wanted this in Docker, I'm only measuring the Linux canary.

## Methodology

- Pull the last N commits
- Determine the size by performing a `HEAD` and pulling `content-length`
- If a commit download isn't found, skip it.
