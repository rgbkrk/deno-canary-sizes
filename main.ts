// This module converts a notebook to HTML and serves it up

import { marked } from "npm:marked";

type Output = {
  output_type: "display_data" | "execute_result";
  data: {
    "text/plain"?: string[];
    "text/html"?: string[];
  };
};

type CodeCell = {
  cell_type: "code";
  execution_count: number | null;
  metadata: {
    collapsed: boolean;
  };
  outputs: Output[];
  source: string[];
};

type MarkdownCell = {
  cell_type: "markdown";
  metadata: {
    collapsed: boolean;
  };
  source: string[];
};

type Cell = CodeCell | MarkdownCell;

type Notebook = {
  cells: Cell[];
  metadata: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      codemirror_mode: {
        name: string;
        version: number;
      };
      file_extension: string;
      mimetype: string;
      name: string;
      nbconvert_exporter: string;
      pygments_lexer: string;
      version: string;
    };
  };
};

async function readNotebook(location: string): Promise<Notebook> {
  const nbtxt = await Deno.readTextFile(location);
  const nbjson = JSON.parse(nbtxt) as Notebook;
  return nbjson;
}

const config = {
  notebookPath: "./canary-sizes.ipynb",
  repo: "rgbkrk/deno-canary-sizes",
};

Deno.serve(async (_req) => {
  const notebook = await readNotebook(config.notebookPath);

  let html = `<html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css">
  <style>
  
  .markdown-body {
		box-sizing: border-box;
		min-width: 200px;
		max-width: 980px;
		margin: 0 auto;
		padding: 32px;
	}

	@media (max-width: 767px) {
		.markdown-body {
			padding: 15px;
		}
	}

  footer {
    margin-top: 1em;
    font-size: 0.75em;
    color: #555;
  }

  </style></head><body class="markdown-body">`;

  for (const cell of notebook.cells) {
    if (cell.cell_type == "markdown") {
      html += `<div>${
        marked.parse(cell.source.join("\n"), {
          gfm: true,
        })
      }</div>`;
    } else if (cell.cell_type == "code") {
      // Pluck the output out to embed
      for (const output of cell.outputs) {
        if (
          output.output_type == "display_data" ||
          output.output_type == "execute_result"
        ) {
          if (output.data["text/html"]) {
            html += output.data["text/html"].join("\n");
          } else if (output.data["text/plain"]) {
            html += `<pre>${output.data["text/plain"].join("\n")}</pre>`;
          }
        } else {
          continue;
        }
      }
    }
  }

  html += `<footer>
    View <a href="https://github.com/${config.repo}">${config.repo}</a> on GitHub.
  </footer></body></html>`;

  return new Response(
    html,
    {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    },
  );
});
