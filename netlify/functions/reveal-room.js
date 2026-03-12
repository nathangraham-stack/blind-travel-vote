import { neon } from "@netlify/neon";

function rankToPoints(rank, totalChoices) {
  return totalChoices - rank + 1;
}

function scoreResults(countries, rankings) {
  const scores = countries.map((country) => ({
    country,
    score: 0,
    firstPlaceVotes: 0,
    placements: [],
  }));

  rankings.forEach((personRanking) => {
    personRanking.forEach((country, index) => {
      const rank = index + 1;
      const target = scores.find((item) => item.country === country);
      if (!target) return;
      target.score += rankToPoints(rank, countries.length);
      target.placements.push(rank);
      if (rank === 1) target.firstPlaceVotes += 1;
    });
  });

  return scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.firstPlaceVotes !== a.firstPlaceVotes) return b.firstPlaceVotes - a.firstPlaceVotes;
    const aAvg = a.placements.reduce((sum, n) => sum + n, 0) / a.placements.length;
    const bAvg = b.placements.reduce((sum, n) => sum + n, 0) / b.placements.length;
    if (aAvg !== bAvg) return aAvg - bAvg;
    return a.country.localeCompare(b.country);
  });
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

    const { roomId } = await req.json();

    if (!roomId) {
      return new Response(JSON.stringify({ error: "Missing roomId" }), {
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

    const votes = await sql`
      SELECT ranking
      FROM votes
      WHERE room_id = ${roomId}
      ORDER BY created_at ASC
    `;

    if (!votes.length) {
      return new Response(JSON.stringify({ error: "No votes submitted yet" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const leaderboard = scoreResults(room.countries, votes.map((v) => v.ranking));
    const winner = leaderboard[0];

    await sql`
      UPDATE rooms
      SET status = 'revealed'
      WHERE id = ${roomId}
    `;

    return new Response(JSON.stringify({ winner, leaderboard }), {
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
