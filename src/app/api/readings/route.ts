/**
 * HTTP telemetry endpoint for the ESP32 node (or Blynk bridge) to push
 * 3-sensor readings into `data/readings.csv` (PLANS.md §4.1, Rule R3 & R10).
 *
 *   POST /api/readings
 *   { "temperature_c": 28.1, "ph": 8.05, "turbidity_ntu": 1.2,
 *     "timestamp": "2026-11-23 14:30:00" }      // optional; defaults to server GMT+7
 *
 * Missing / null sensors are stored as empty CSV cells (never as 0).
 * Extra non-schema fields are rejected to enforce Rule R3.
 *
 *   GET /api/readings   -> current snapshot as JSON (handy for checking the device)
 */
import { connection } from 'next/server';
import { appendReading, getSnapshot, parseStamp, wallClockNow } from '@/app/lib/data';
import { SENSORS, assess, type SensorValues } from '@/app/lib/water';

const ALLOWED_KEYS = new Set<string>(['timestamp', ...SENSORS]);

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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Body must be a JSON object.' }, { status: 400 });
  }

  // Rule R3: enforce strict 3-sensor automated schema (no fabricated columns)
  const unknownKeys = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k));
  if (unknownKeys.length > 0) {
    return Response.json(
      {
        error: `Unsupported fields (Rule R3 strict 3-sensor schema): ${unknownKeys.join(', ')}. Allowed: timestamp, ${SENSORS.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const values = {} as SensorValues;
  for (const key of SENSORS) {
    const raw = body[key];
    if (raw == null || raw === '') values[key] = null;
    else if (typeof raw === 'number' && Number.isFinite(raw)) values[key] = raw;
    else return Response.json({ error: `"${key}" must be a number or null.` }, { status: 400 });
  }
  if (SENSORS.every((k) => values[k] == null)) {
    return Response.json(
      { error: `Send at least one of: ${SENSORS.join(', ')}.` },
      { status: 400 },
    );
  }

  const t = typeof body.timestamp === 'string' ? parseStamp(body.timestamp) : wallClockNow();
  if (Number.isNaN(t)) {
    return Response.json(
      { error: 'timestamp must be ISO 8601 or "YYYY-MM-DD HH:MM:SS" (GMT+7).' },
      { status: 400 },
    );
  }

  appendReading(t, values);
  return Response.json({ ok: true, assessment: assess(values) }, { status: 201 });
}
