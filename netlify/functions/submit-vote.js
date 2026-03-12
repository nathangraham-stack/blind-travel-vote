import { neon } from "@netlify/neon";

export default async (req) => {
  try {
    const sql = neon();

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { roomId, voterName, ranking } = await req.json();

    if (!roomId || !voterName || !Array.isArray(ranking)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rooms = await sql`
      SELECT id, countries, status
      FROM rooms
      WHERE id = ${roomId}
      LIMIT 1
    `;

    if (!rooms.length) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const room = rooms[0];
    if (room.status !== "open") {
      return new Response(JSON.stringify({ error: "Voting is closed for this room" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const cleanedName = String(voterName).trim();
    const cleanedRanking = ranking.map((item) => String(item).trim()).filter(Boolean);
    const uniqueRanking = [...new Set(cleanedRanking)];
    const roomCountries = room.countries;

    if (!cleanedName) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (cleanedRanking.length !== roomCountries.length || uniqueRanking.length !== roomCountries.length) {
      return new Response(JSON.stringify({ error: "Ranking must include each country exactly once" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validSet = new Set(roomCountries);
    const isValid = cleanedRanking.every((country) => validSet.has(country));

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Ranking includes invalid country choices" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await sql`
      INSERT INTO votes (room_id, voter_name, ranking)
      VALUES (${roomId}, ${cleanedName}, ${JSON.stringify(cleanedRanking)}::jsonb)
      ON CONFLICT (room_id, voter_name)
      DO UPDATE SET ranking = EXCLUDED.ranking, created_at = NOW()
    `;

    return new Response(JSON.stringify({ success: true }), {
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
