#!/usr/bin/env python3
"""
SEAL IoT Hardware-to-Web Bridge & Bench-Test CLI (`POST /api/readings`)

Zero-dependency Python script (stdlib only) supporting 3 workflows:
  1. BENCH DRY-RUN (`--simulate`):
     Tests the live ingestion pipeline (`POST /api/readings` -> `data/readings.csv`)
     before connecting physical hardware.
       python scripts/blynk_bridge.py --simulate --count 3 --interval 2

  2. BLYNK CLOUD BRIDGE (`--token <BLYNK_AUTH_TOKEN>`):
     Polls Electrical Engineering's existing Blynk Cloud Virtual Pins (V0, V1, V2)
     and forwards strict 3-sensor JSON payloads to SEAL with zero EE firmware changes.
       python scripts/blynk_bridge.py --token YOUR_BLYNK_TOKEN --temp-pin v0 --ph-pin v1 --turb-pin v2 --interval 5

  3. ARCHIVE / RESET BENCH LOG (`--reset-live`):
     Archives bench-test `data/readings.csv` to `data/readings_bench_backup.csv` so
     cup-of-water bench tests never pollute the 2-week real lobster tank dataset (Rule R1 & R10).
       python scripts/blynk_bridge.py --reset-live
"""
import argparse
import json
import math
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

WIB = timezone(timedelta(hours=7))
ROOT_DIR = Path(__file__).resolve().parents[1]
LIVE_CSV = ROOT_DIR / "data" / "readings.csv"
BACKUP_CSV = ROOT_DIR / "data" / "readings_bench_backup.csv"


def parse_float_or_none(raw, lo: float, hi: float):
    """Parse finite float within physical bounds; return None (JSON null) per Rule R10."""
    if raw is None or raw == "":
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None
    if math.isnan(val) or math.isinf(val) or val < lo or val > hi:
        return None
    return round(val, 4)


def fetch_blynk_pins(server: str, token: str, pins: list[str], timeout: int = 10) -> dict:
    """Calls Blynk Cloud REST API: GET /external/api/get?token=...&v0&v1&v2"""
    query = f"token={urllib.parse.quote(token)}&" + "&".join(pins)
    url = f"{server.rstrip('/')}/external/api/get?{query}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8").strip()
        return json.loads(body)


def post_to_seal(seal_url: str, payload: dict, timeout: int = 10) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        seal_url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8")


def get_seal_snapshot(seal_url: str, timeout: int = 10) -> dict:
    req = urllib.request.Request(seal_url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def reset_live_log() -> int:
    if not LIVE_CSV.exists():
        print(f"[SEAL Bridge] No live log found at {LIVE_CSV}. Dashboard is already in PLACEHOLDER mode.")
        return 0
    shutil.move(str(LIVE_CSV), str(BACKUP_CSV))
    print(
        f"[SEAL Bridge] Archived bench-test log {LIVE_CSV.name} -> {BACKUP_CSV.name} (Rule R1 & R10).\n"
        f"              Dashboard is now reset and ready for real tank deployment."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="SEAL IoT Hardware-to-Web Bridge (Blynk Cloud Poller & Bench Simulator)."
    )
    parser.add_argument("--token", default=os.environ.get("BLYNK_TOKEN", ""), help="Blynk device auth token")
    parser.add_argument("--server", default="https://blynk.cloud", help="Blynk cloud base URL")
    parser.add_argument(
        "--seal-url",
        default="http://localhost:3000/api/readings",
        help="SEAL /api/readings endpoint URL",
    )
    parser.add_argument("--temp-pin", default="v0", help="Virtual pin for temperature_c (default: v0)")
    parser.add_argument("--ph-pin", default="v1", help="Virtual pin for ph (default: v1)")
    parser.add_argument("--turb-pin", default="v2", help="Virtual pin for turbidity_ntu (default: v2)")
    parser.add_argument("--interval", type=float, default=5.0, help="Polling interval in seconds (default: 5)")
    parser.add_argument("--once", action="store_true", help="Send 1 reading and exit")
    parser.add_argument("--count", type=int, default=0, help="Stop after N readings (0 = run continuously)")
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="Run a local bench dry-run with synthetic 3-sensor packets (no Blynk token required)",
    )
    parser.add_argument(
        "--reset-live",
        action="store_true",
        help="Archive bench-test data/readings.csv to data/readings_bench_backup.csv and return to PLACEHOLDER mode",
    )
    args = parser.parse_args()

    if args.reset_live:
        return reset_live_log()

    if not args.simulate and not args.token:
        print(
            "ERROR: Provide --token <BLYNK_AUTH_TOKEN> (or set BLYNK_TOKEN), or pass --simulate for a bench dry-run.",
            file=sys.stderr,
        )
        return 1

    max_iters = 1 if args.once else args.count
    pins = [args.temp_pin.lower(), args.ph_pin.lower(), args.turb_pin.lower()]

    if args.simulate:
        print(f"[SEAL Bench Dry-Run] Pushing simulated 3-sensor packets -> {args.seal_url} (GMT+7)")
    else:
        print(f"[SEAL Blynk Bridge] Polling {args.server} pins {pins} -> {args.seal_url} every {args.interval}s")

    step = 0
    while True:
        step += 1
        now_wib = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")
        try:
            if args.simulate:
                # Realistic bench-test readings oscillating inside Optimal / Warning bounds
                payload = {
                    "timestamp": now_wib,
                    "temperature_c": round(27.8 + 0.25 * math.sin(step * 0.7), 2),
                    "ph": round(8.12 + 0.04 * math.cos(step * 0.5), 2),
                    "turbidity_ntu": round(1.8 + 0.4 * abs(math.sin(step * 0.6)), 2),
                }
            else:
                raw = fetch_blynk_pins(args.server, args.token, pins)
                payload = {
                    "timestamp": now_wib,
                    "temperature_c": parse_float_or_none(raw.get(pins[0]), -5.0, 60.0),
                    "ph": parse_float_or_none(raw.get(pins[1]), 0.0, 14.0),
                    "turbidity_ntu": parse_float_or_none(raw.get(pins[2]), 0.0, 3000.0),
                }

            if all(payload[k] is None for k in ("temperature_c", "ph", "turbidity_ntu")):
                print(f"[{now_wib}] SKIP: All 3 sensors returned null/empty.")
            else:
                code, resp_text = post_to_seal(args.seal_url, payload)
                print(f"[{now_wib}] POST HTTP {code} | sent={json.dumps(payload)} | response={resp_text}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            print(f"[{now_wib}] HTTP ERROR {e.code}: {err_body}", file=sys.stderr)
            if max_iters > 0:
                return 1
        except Exception as e:
            print(f"[{now_wib}] CONNECTION ERROR: {e}", file=sys.stderr)
            if max_iters > 0:
                return 1

        if max_iters > 0 and step >= max_iters:
            try:
                snap = get_seal_snapshot(args.seal_url)
                print(
                    f"[SEAL Verify] GET /api/readings -> mode={snap.get('mode')!r}, "
                    f"rawReadingsCount={snap.get('quality', {}).get('rawReadingsCount')}, "
                    f"status={snap.get('current', {}).get('assessment', {}).get('status')!r}, "
                    f"suitability={snap.get('current', {}).get('assessment', {}).get('suitability')}"
                )
            except Exception:
                pass
            break

        time.sleep(max(0.5, args.interval))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
