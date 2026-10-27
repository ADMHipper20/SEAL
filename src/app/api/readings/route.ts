/**
 * The only HTTP endpoint. The dashboard itself does NOT use it (page.tsx reads
 * data on the server); it exists for the ESP32 to push readings in.
 *
 *   POST /api/readings
 *   { "temperature_c": 28.1, "salinity_ppt": 32.4, "ph": 8.02,
 *     "dissolved_oxygen_mgl": 6.3, "ammonia_mgl": 0.05,
 *     "timestamp": "2026-10-22 14:30:00" }      // optional, defaults to server time
 *
 * Missing / null sensors are stored as empty (never as 0).
 *
 *   GET /api/readings   -> current snapshot as JSON (handy for checking the device)
 */
import { connection } from 'next/server';
import { appendReading, getSnapshot, parseStamp, wallClockNow } from '@/app/lib/data';
import { SENSORS, assess, type SensorValues } from '@/app/lib/water';

export async function GET() {
  await connection();
  return Response.json(getSnapshot());
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const values = {} as SensorValues;
  for (const key of SENSORS) {
    const raw = body[key];
    if (raw == null || raw === '') values[key] = null;
    else if (typeof raw === 'number' && Number.isFinite(raw)) values[key] = raw;
    else return Response.json({ error: `"${key}" must be a number or null.` }, { status: 400 });
  }
  if (SENSORS.every((k) => values[k] == null)) {
    return Response.json({ error: `Send at least one of: ${SENSORS.join(', ')}.` }, { status: 400 });
  }

  const t = typeof body.timestamp === 'string' ? parseStamp(body.timestamp) : wallClockNow();
  if (Number.isNaN(t)) {
    return Response.json({ error: 'timestamp must look like "YYYY-MM-DD HH:MM:SS".' }, { status: 400 });
  }

  appendReading(t, values);
  return Response.json({ ok: true, assessment: assess(values) }, { status: 201 });
}
