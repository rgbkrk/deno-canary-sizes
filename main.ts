import { Canary, fetchCanariesSinceTag } from "./mod.ts";
import Plot from "https://deno.land/x/plot@0.0.2/mod.ts";

const canaries = await fetchCanariesSinceTag("v1.36.0");

const jupyterLines = canaries.filter((point: Canary) =>
  point.subject.includes("jupyter")
);

Deno.serve((_req) => {
  const el = Plot.plot({
    marginLeft: 100,
    height: 600,
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
      Plot.text(
        ["This chart shows the size of the Deno canary on Linux over time."],
        {
          lineWidth: 22,
          fontWeight: "bold",
          fontSize: "12px",
          frameAnchor: "middle",
          dx: -160,
          dy: -150,
        },
      ),

      Plot.text(
        ["Commits that contain Jupyter related changes are in orange"],
        {
          lineWidth: 30,
          frameAnchor: "middle",
          dx: -160,
          dy: -120,
        },
      ),
    ],
  });

  return new Response(`<html><body>${el.toString()}</body></html>`, {
    headers: {
      "content-type": "text/html",
    },
  });
});
