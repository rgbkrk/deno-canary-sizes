import { Canary, fetchCanariesSinceTag } from "./mod.ts";
import Plot from "https://deno.land/x/plot@0.0.2/mod.ts";

const canaries = await fetchCanariesSinceTag("v1.36.0");

const jupyterLines = canaries.filter((point: Canary) =>
  point.subject.includes("jupyter")
);

Deno.serve((_req) => {
  const el = Plot.plot({
    marginLeft: 100,
    height: 300,
    width: 800,
    marks: [
      Plot.lineY(canaries, {
        x: "authoredDate",
        y: "size",
      }),
      Plot.ruleY([0]),
      Plot.ruleX(jupyterLines, {
        stroke: "orange",
        x: "authoredDate",
        y2: "size",
      }),
    ],
  });

  const style = `
  body {
    font-family: system-ui;
    margin: 32px;
  }

  h2 {
    font-size: 1.5em;
    font-weight: 600;
  }

  h3 {
    font-size: 1.25em;
    font-weight: 400;
  }

  .jupyter-orange {
    color: orange;
  }

  footer {
    margin-top: 32px;
    font-size: 0.75em;
  }

  footer a {
    color: black;
  }
  `;

  return new Response(
    `<html><style>${style}</style><body>
    <h2>Size of the Deno Canary on Linux over time (in commits)</h2>
    <h3>Commits that contain Jupyter related changes are in <span class="jupyter-orange">orange</span></h3>
    ${el.toString()}

    <footer>
      View <a href="https://github.com/rgbkrk/deno-canary-sizes">deno-canary-sizes</a> on GitHub.
    </footer>
    </body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
    },
  );
});
