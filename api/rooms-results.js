/**
 * Production alias for /api/rooms?op=results — kept so legacy frontend
 * builds keep working. Delegates to the rooms dispatcher.
 */
import roomsHandler from "./rooms.js";

export default function handler(req, res) {
  req.query = { ...(req.query || {}), op: "results" };
  return roomsHandler(req, res);
}
