interface Env {
  META_OEMBED_TOKEN: string; // e.g. "<APP_ID>|<APP_SECRET>" or a valid token Meta accepts for oEmbed
}

const INSTAGRAM_POST = "https://www.instagram.com/p/DSYKS_HEfC-/";
const GRAPH_VERSION = "v24.0";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // A tiny debug endpoint helps reviewers (and you) prove it's really oEmbed.
    if (url.pathname === "/debug") {
      const data = await fetchInstagramOEmbed(env, INSTAGRAM_POST);
      return jsonResponse(
        {
          ok: true,
          post: INSTAGRAM_POST,
          oembed: data,
        },
        200
      );
    }

    // Main page: calls oEmbed server-side and renders returned HTML.
    try {
      const oembed = await fetchInstagramOEmbed(env, INSTAGRAM_POST);

      // oEmbed returns an "html" string (usually a blockquote + script).
      const embedHtml = oembed.html ?? "<p>oEmbed returned no HTML.</p>";

      const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Instagram oEmbed Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fff;
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
    }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; }
    .card { border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <h2>Instagram oEmbed Demo</h2>
  <p>
    This page demonstrates <b>Meta oEmbed Read</b> by calling the
    <code>instagram_oembed</code> endpoint server-side and rendering the returned HTML.
    It is provided for Meta App Review.
  </p>

  <div class="card">
    <div><b>Test post:</b> <a href="${escapeAttr(
      INSTAGRAM_POST
    )}" target="_blank" rel="noreferrer">${escapeHtml(INSTAGRAM_POST)}</a></div>
    <div><b>Debug JSON:</b> <a href="/debug" target="_blank" rel="noreferrer">/debug</a></div>
  </div>

  <div class="card">
    ${embedHtml}
  </div>

  <!-- Safety: ensure the official Instagram embed script can run if oEmbed HTML expects it -->
  <script async src="https://platform.instagram.com/en_US/embeds.js"></script>
</body>
</html>`;

      return new Response(page, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (err: any) {
      return jsonResponse(
        {
          ok: false,
          error: err?.message ?? String(err),
          hint: "Check that META_OEMBED_TOKEN is set and the Instagram URL is public + embeddable.",
          post: INSTAGRAM_POST,
        },
        500
      );
    }
  },
};

async function fetchInstagramOEmbed(env: Env, postUrl: string): Promise<any> {
  if (!env.META_OEMBED_TOKEN) {
    throw new Error("Missing META_OEMBED_TOKEN env var.");
  }

  // Meta oEmbed endpoint (Graph API)
  // Docs typically: GET https://graph.facebook.com/{version}/instagram_oembed?url=...&access_token=...
  const endpoint = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/instagram_oembed`
  );
  endpoint.searchParams.set("url", postUrl);
  endpoint.searchParams.set("access_token", env.META_OEMBED_TOKEN);
  // Optional fields
  endpoint.searchParams.set("omitscript", "true"); // let it include script tag if Meta returns it
  endpoint.searchParams.set("hidecaption", "true");

  const res = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from oEmbed: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(
      `oEmbed error (${res.status}): ${
        json?.error?.message ?? text.slice(0, 300)
      }`
    );
  }

  // Expecting fields like: html, author_name, provider_name, thumbnail_url, etc.
  return json;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Minimal escaping helpers for safety in attributes / text
function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(input: string): string {
  return escapeHtml(input).replaceAll('"', "&quot;");
}
