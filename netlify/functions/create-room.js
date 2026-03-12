import { neon } from "@netlify/neon";

function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default async (req) => {
  try {
    const sql = neon();

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { title = "", countries = [] } = await req.json();

    if (!Array.isArray(countries) || countries.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 countries are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cleaned = countries.map((c) => String(c).trim()).filter(Boolean);
    const unique = [...new Set(cleaned)];

    if (unique.length < 2 || unique.length !== cleaned.length) {
      return new Response(JSON.stringify({ error: "Countries must be unique" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const roomId = makeRoomId();

    const inserted = await sql`
      INSERT INTO rooms (id, title, countries, status)
      VALUES (${roomId}, ${title.trim()}, ${JSON.stringify(unique)}::jsonb, 'open')
      RETURNING id, title, countries, status, created_at
    `;

    return new Response(JSON.stringify({ room: inserted[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Server error",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
