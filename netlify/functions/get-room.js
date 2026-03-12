import { neon } from "@netlify/neon";

export default async (req) => {
  try {
    const sql = neon();

    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");

    if (!roomId) {
      return new Response(JSON.stringify({ error: "Missing roomId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rooms = await sql`
      SELECT id, title, countries, status, created_at
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

    const votes = await sql`
      SELECT voter_name, ranking, created_at
      FROM votes
      WHERE room_id = ${roomId}
      ORDER BY created_at ASC
    `;

    return new Response(
      JSON.stringify({
        room: rooms[0],
        votes
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
