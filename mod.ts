// Function to fetch the size of a canary based on its URL
export const fetchSize = async (url: string): Promise<number | null> => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      return null;
    }
    const contentLength = response.headers.get("content-length");

    if (contentLength == null) {
      return null;
    }

    return parseInt(contentLength, 10);
  } catch (_error) {
    // console.warn(`Failed to fetch size for URL: ${url}`, _error);
    return null;
  }
};

const generateUrl = (commitHash: string) =>
  `https://dl.deno.land/canary/${commitHash}/deno-x86_64-unknown-linux-gnu.zip`;

type Commit = {
  hash: string;
  subject: string;
  authoredDate: Date;
  linux_download_url: string;
};

export type Canary = Commit & {
  size: number;
};

// Fetch sizes and augment the data array
const fetchDataWithSize = async (
  commits: (Commit | Canary)[],
): Promise<Canary[]> => {
  const promises = commits.map(async (commit): Promise<Canary> => {
    if ("size" in commit && commit.size != null) {
      return commit;
    }
    const size = await fetchSize(commit.linux_download_url);
    if (size == null) {
      return { ...commit, size: 0 };
    }

    return { ...commit, size };
  });
  return await Promise.all(promises);
};

async function fetchCommitsSinceTag(tag: string) {
  const headers = new Headers();

  if (Deno.env.get("GITHUB_TOKEN") == null) {
    throw new Error("Environment variable GITHUB_TOKEN must be set");
  }

  headers.set("Authorization", `Bearer ${Deno.env.get("GITHUB_TOKEN")}`);
  headers.set("Content-Type", "application/json");

  // First fetch the commit hash for the given tag
  const tagQuery = `
      query {
          repository(owner: "denoland", name: "deno") {
            ref(qualifiedName: "${tag}") {
              target {
                id
                commitUrl
                oid
              }
            }
          }
        }`;

  const tagResponse = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ query: tagQuery }),
  }).then((r) => r.json());

  if (tagResponse.data.repository.ref.target.oid == null) {
    throw new Error(`Hash for ${tag} not found`);
  }

  const startCommitHash = tagResponse.data.repository.ref.target.oid;
  console.log(`Commit for ${tag} is ${startCommitHash}`);

  let commits: Commit[] = [];
  let endCursor = null;

  while (true) {
    // Fetch commit history
    const historyQuery = `
        query {
          repository(owner: "denoland", name: "deno") {
            ref(qualifiedName: "main") {
              target {
                ... on Commit {
                  history(first: 100, after: ${JSON.stringify(endCursor)}) {
                    edges {
                      node {
                        oid
                        messageHeadline
                        authoredDate
                      }
                      cursor
                    }
                    pageInfo {
                      endCursor
                      hasNextPage
                    }
                  }
                }
              }
            }
          }
      }`;

    const historyResponse: object = await fetch(
      "https://api.github.com/graphql",
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ query: historyQuery }),
      },
    ).then((r) => r.json());

    // @ts-ignore I don't feel like typing the GraphQL response
    const history = historyResponse.data.repository.ref.target.history;
    const newCommits = history.edges.map((
      edge: any,
    ): Commit => ({
      hash: edge.node.oid,
      subject: edge.node.messageHeadline,
      authoredDate: new Date(edge.node.authoredDate),
      linux_download_url: generateUrl(edge.node.oid),
    }));

    commits = [...commits, ...newCommits];

    // Check if we've reached the starting commit hash
    if (commits.some((commit) => commit.hash === startCommitHash)) {
      break;
    }

    // Check if more pages are available
    if (history.pageInfo.hasNextPage) {
      endCursor = history.pageInfo.endCursor;
    } else {
      break;
    }
  }

  // Filter commits after the starting commit hash
  commits = commits.slice(
    0,
    commits.findIndex((commit) => commit.hash === startCommitHash),
  );

  return commits;
}

export async function fetchCanariesSinceTag(tag: string) {
  const commits = await fetchCommitsSinceTag(tag);
  let canaries = await fetchDataWithSize(commits);

  canaries = canaries.reverse().map((d) => ({ ...d, size: +d.size })).filter(
    (d) => d.size > 3_000,
  ).reverse();

  return canaries;
}
