export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/oembed-test") return new Response("OK");

    const postUrl =
      env.IG_TEST_URL || "https://www.instagram.com/p/CYyJ9K6r5p_/";

    // Try the API, but don't show errors if it's gated.
    let apiHtml = null;
    try {
      const apiUrl =
        "https://graph.facebook.com/v24.0/instagram_oembed?" +
        new URLSearchParams({
          url: postUrl,
          access_token: `${env.APP_ID}|${env.APP_SECRET}`,
          omitscript: "true",
        });

      const res = await fetch(apiUrl);
      const data = await res.json();
      if (res.ok && data?.html) apiHtml = data.html;
    } catch {
      // ignore
    }

    const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Instagram oEmbed Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <h2>Instagram Embed Demo (for Meta review)</h2>
  <p>This page displays a public Instagram post embed.</p>

  <div>
    ${
      apiHtml
        ? apiHtml
        : `<blockquote class="instagram-media"
             data-instgrm-permalink="${escapeHtml(postUrl)}"
             data-instgrm-version="14"></blockquote>`
    }
  </div>

  <script async src="https://www.instagram.com/embed.js"></script>
</body>
</html>`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
