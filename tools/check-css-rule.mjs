// Is a CSS rule actually in the bundle the dev server is serving?
//
// Turbopack's persistent cache occasionally keeps serving a stale compiled
// globals.css after an edit. It is intermittent, and when it happens the
// symptom is indistinguishable from having written the CSS wrong: the rule is
// in the file, the page looks unchanged. This answers that question directly
// instead of leaving you to guess.
//
// Note the `--`: npm needs it to forward arguments to the script.
//
//   npm run check:css -- battle-opening-video-layer
//   npm run check:css -- .bcab-memboard --url http://localhost:3001
//
// Exit code 0 = rule is being served, 1 = it is not (or the check failed), so
// it can gate a script as well as be read by a human.

import { readFile } from "node:fs/promises";

const DEFAULT_URL = "http://localhost:3000";

function parseArgs(argv) {
  const urlFlag = argv.indexOf("--url");
  const hasUrl = urlFlag !== -1;

  return {
    baseUrl: hasUrl ? argv[urlFlag + 1] : DEFAULT_URL,
    // Guard the -1 case explicitly: without it `urlFlag + 1` is 0 and the
    // filter would drop the selector itself.
    needle: argv.filter(
      (_, i) => !hasUrl || (i !== urlFlag && i !== urlFlag + 1)
    )[0],
  };
}

/**
 * Returns an exit code rather than calling process.exit: exiting while a fetch
 * socket is still open trips a libuv assertion on Windows and reports 127
 * instead of the intended code.
 */
async function main(argv) {
  const { baseUrl, needle } = parseArgs(argv);

  if (!needle) {
    console.error(
      "usage: npm run check:css -- <selector-or-substring> [--url http://host:port]"
    );
    return 1;
  }

  // Source of truth first: if it is not on disk, the bundle is not the problem.
  const source = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8"
  ).catch(() => null);

  if (source === null) {
    console.error("✗ could not read app/globals.css");
    return 1;
  }

  const inSource = source.includes(needle);

  let html;
  try {
    html = await (await fetch(baseUrl)).text();
  } catch (error) {
    console.error(`✗ dev server unreachable at ${baseUrl} (${error.message})`);
    return 1;
  }

  const href = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)]
    .map((m) => m[1])
    .find((h) => h.includes("globals"));

  if (!href) {
    console.error("✗ no globals stylesheet linked on the page");
    return 1;
  }

  const cssUrl = href.startsWith("http")
    ? href
    : new URL(href, baseUrl).toString();
  const served = await (await fetch(cssUrl, { cache: "reload" })).text();
  const inServed = served.includes(needle);

  console.log(`selector : ${needle}`);
  console.log(`source   : ${inSource ? "present" : "MISSING"}  (app/globals.css)`);
  console.log(
    `served   : ${inServed ? "present" : "MISSING"}  (${cssUrl.split("/").pop()})`
  );

  if (!inSource) {
    console.error(
      "\n✗ not in the source file — the rule was never written, this is not a cache issue"
    );
    return 1;
  }

  if (!inServed) {
    console.error("\n✗ In the source but NOT in the served bundle: stale Turbopack cache.");
    console.error("  Stop the dev server, then:  npm run dev:clean");
    return 1;
  }

  console.log(
    "\n✓ rule is live — if the page still looks wrong, the CSS itself is the problem"
  );
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
