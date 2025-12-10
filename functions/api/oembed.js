// File: functions/api/oembed.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const postUrl = url.searchParams.get("url");

  if (!postUrl) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const oembedUrl =
    "https://graph.facebook.com/v23.0/instagram_oembed?" +
    new URLSearchParams({
      url: postUrl,
      access_token: `${env.APP_ID}|${env.APP_SECRET}`,
    });

  try {
    const res = await fetch(oembedUrl);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Request to oEmbed failed",
        details: String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
