# PLANS.md — Marine Lobster Tank Water-Quality Monitoring

> **AGENT: READ THIS ENTIRE FILE BEFORE DOING ANYTHING.**
> This file overrides your own assumptions. If a task conflicts with this file, **stop and ask** — do not pick a side silently.

---

## 0. How you (the agent) must work

1. **Read this file first, every session.** Then restate, in 3–5 lines: the task, the files you will touch, the rules in §3 that apply.
2. **One task at a time.** Do only what the current task asks. Do not "also improve" anything else.
3. **Plan before editing.** For any task touching more than one file, write a short plan (files, steps, how you will verify) and wait for approval.
4. **Prove it works.** Never say "done" without running the code/notebook and showing the output (see §12).
5. **Record decisions.** Any choice not already in this file goes into §14 *Decision log* — do not decide silently.
6. **Unknown = ask or flag.** If a number, threshold, name or citation is not in this file or in a source the user gave you, mark it `NEEDS_SOURCE` and ask. **Never fill the gap from memory.**

---

## 1. Goal and non-goals

**Goal:** a monitoring system for **one** small marine lobster holding tank. Five sensors (per the budget plan `RAB_CAPSTONE.xlsx`) are logged continuously: **temperature, salinity, pH, dissolved oxygen, turbidity**. **There is no ammonia sensor.** The system (a) assesses water quality with a **literature-based fuzzy rule set**, (b) **forecasts** the five sensors (30 min – 6 h ahead) with classical time-series models, and (c) turns the forecasts into a **predicted status** (Optimal / Warning / Critical) so a person can act early.

**Non-goals (do NOT build unless a task explicitly says so):**
- Reinforcement learning, RLHF, LLM features. **Machine/deep learning is allowed ONLY as a sensor forecaster behind the fuzzy rules, in notebook 04 (R17).**
- Controlling hardware (blower, pumps, relays, heaters). The blower runs 24/7 and nothing is automatically controlled. **Default: monitoring + alerting only.** NOTE: the budget plan includes a 2-channel relay and a mini aerator "as relay test load" → whether relay/aerator control is in scope is `NEEDS_INFO` (D8). **Write no actuator code until the user confirms it as a task.**
- Dashboards, web apps, mobile apps, authentication.
- Multi-tank support, other species (fish, mantis shrimp) or transport/shipping monitoring.

---

## 2. Facts about the tank

**Known (from the user):**
- One small cemented tank with decor and PVC pipe shelters, on a university campus.
- Blower/air pump runs **24/7**. A protein skimmer and a filter pump circulate **reused** water. No automatic water exchange.
- Animals are display/breeding stock (not for sale). The tank holds mixed marine animals; the **focus is Pearl Lobster (*Panulirus ornatus*)**.
- Sensors (budget plan): DS18B20 temperature, DFRobot EC K=10 salinity, PH-4502C pH, DFRobot SEN0237 galvanic dissolved oxygen, analog turbidity (NTU) — read through an ESP32 + ADS1115 ADC. Reference tools: refractometer, pH buffer powders. **No ammonia sensor; the protein skimmer is relied on to limit organic load.**
- A skimmer removes dissolved organics *before* they become ammonia; it does **not** remove ammonia itself, and turbidity is **not** an ammonia proxy.

**Unknown — flag as `NEEDS_INFO`, never guess:**
- Tank volume; real temperature range; turbidity-sensor calibration (analog modules output voltage, NTU is approximate); calibration schedule; logging interval actually used; whether relay/aerator control is planned.

---

## 3. HARD RULES — never break these

These rules exist because earlier work broke them.

| # | Rule |
|---|---|
| R1 | **No invented data presented as real.** Synthetic/placeholder data must be labelled `placeholder` in the filename, the notebook title, and every result summary. |
| R2 | **No invented numbers.** Every threshold, range, parameter or citation needs a source in §7 or `NEEDS_SOURCE`. Never fabricate paper titles, authors, DOIs or values. |
| R3 | **No extra columns.** Datasets contain only the columns defined in §4. Do not add "stress_index", "blower_cmd", event labels, or any other made-up feature to the data. |
| R4 | **Never resample coarser data to finer.** (An hourly file resampled to 30 min caused 50 % interpolated rows before.) Refuse input whose spacing is coarser than the target step. |
| R5 | **Time-ordered splits only.** No shuffling, no random train/test split, no scaling or fitting on future data. |
| R6 | **Test set is touched once**, after model choice is finished on validation. |
| R7 | **Always compare with persistence** ("next = last value"). A model with skill ≤ 0 % at a horizon is reported as *no better than persistence*. |
| R8 | **Report sample sizes.** Always print how many Warning/Critical cases are in each split. With fewer than ~30 non-Optimal cases in test, say the status scores are *unreliable*. |
| R9 | **Do not change fuzzy ranges** (§7) silently. Any change needs a source + a §14 entry + user approval. |
| R10 | **Never delete or overwrite raw data.** Schema changes must be reversible migrations. No `DROP`, `TRUNCATE`, or `DELETE` on raw tables without explicit approval. |
| R11 | **No hardware control code** (GPIO, relays, MQTT commands to actuators). |
| R12 | **No scope creep.** If you notice something worth improving, add it to §14 *Ideas* — do not implement it. |
| R13 | **No hard-coded personal paths.** Use a `DATA_FILE` / config variable at the top of each notebook/script. |
| R14 | **Do not claim biological conclusions.** The fuzzy status means "inside/outside published ranges", not "lobsters are healthy/sick". |
| R15 | **Never imply ammonia is safe.** The status covers only the 5 monitored parameters. Every status summary must say so. Do not use turbidity as an ammonia proxy. |
| R17 | **Fuzzy has the last word.** Water quality (FWQI and status) is computed ONLY by the shared `fuzzy_final()` function, from sensor values (measured or forecast). Machine-learning/deep-learning models may output **future sensor values only** — never a water-quality value, status, class or alert. Forecasts pass guard-rails first (physical limits; out-of-range → persistence). |
| R16 | **Experimental models stay in notebook 03.** Nothing from `03_experimental_models.ipynb` enters the main pipeline unless it was marked KEEP by the pre-set rule (§8) on **real** data and the user approves. |

---

## 4. Data contract

### 4.1 Raw sensor log (what the logger writes)
CSV / DB columns — **exactly these, nothing else**:

| column | unit | notes |
|---|---|---|
| `timestamp` | ISO 8601 (local time or UTC — see §14 decision D1) | one row per reading |
| `temperature_c` | °C | |
| `salinity_ppt` | ppt | |
| `ph` | pH units | |
| `dissolved_oxygen_mgl` | mg/L | |
| `turbidity_ntu` | NTU | analog sensor; calibration = `NEEDS_INFO` |

Raw data may contain spikes, dropouts (NaN), frozen values, drift. **Do not "fix" raw data in place.**

### 4.2 Modelling table (derived, never stored over raw)
- Raw → **30-minute medians**; a bin needs **≥ 3 valid readings** (of ~6 at 5-min logging), otherwise NaN.
- Gaps **≤ 3 h** may be interpolated; longer gaps stay flagged. Always print how many bins were interpolated.
- Derived columns allowed: `fwqi` (crisp fuzzy water-quality value, 0–100), `fuzzy_suitability` (0–1, the minimum) and `fuzzy_status` (Optimal/Warning/Critical). **Nothing else.**

### 4.3 Events table (human annotations — this is the only source of real labels)
`timestamp`, `event_type` (feeding, water_change, calibration, maintenance, skimmer_service, manual_ammonia_test, manual_nitrite_test, alert_ack, alert_ignored, equipment_fault), `value` (for manual tests), `note`, `operator`. **Feeding times are required** (experiment C uses them); **manual ammonia/nitrite test-kit readings are the only ammonia information the system will have.** Created by humans or the alert workflow; **never auto-invented.**

---

## 5. Repository layout (do not reorganise without approval)

```
PLANS.md
data/
  raw/                      # untouched logs (read-only)
  placeholder/              # synthetic test data, always labelled
notebooks/
  01_data_exploration_and_plots.ipynb
  02_model_training_evaluation.ipynb
  03_experimental_models.ipynb        # risky statistical ideas, scored by the pre-set rule (§8)
  04_ml_dl_behind_fuzzy.ipynb         # ML/DL sensor forecasters behind the fuzzy rules (R17)
  datasets/                           # train / validation / test 30-min tables (placeholder)
  results/                  # CSV/JSON outputs written by notebook 02
src/
  lobster_ts_pipeline.py    # fuzzy + forecasting pipeline (CLI: --data <csv>)
db/
  migrations/               # TimescaleDB schema, reversible
docs/
  DECISIONS.md              # mirror of §14 if it grows large
```

---

## 6. Phases (work in order; do not start a phase until the previous gate is passed)

### Phase 0 — Exploration & pipeline on placeholder data ✅ (status: done, synthetic)
- [x] Notebook 01 (exploration, fuzzy, relationships) runs top-to-bottom
- [x] Notebook 02 (ARIMA / SARIMA / VAR evaluation) runs top-to-bottom
- **Gate:** none. Results are **placeholder only** and must not be quoted as findings.

### Phase 1 — Real data capture
- [ ] Logger writes the §4.1 columns at a fixed interval (target 1–5 min)
- [ ] Raw log goes into TimescaleDB (§10) *and* a daily CSV backup
- [ ] Record sensor calibration dates in the events table
- [ ] Verify each sensor against a reference (refractometer for salinity; pH buffers; a turbidity standard if available)
- [ ] Start a routine of manual ammonia/nitrite test-kit readings (frequency set with staff) and log them as events
- [ ] Log every feeding time as an event
- **Gate:** ≥ 14 consecutive days of real data with < 5 % missing; user confirms.

### Phase 2 — Settle the fuzzy ranges
- [ ] Resolve every `NEEDS_SOURCE` item in §7 with a real reference or a supervisor's written decision
- [ ] Confirm lobster species; decide with staff whether 5 NTU (natural-seawater standard) is a sensible Warning level for a fed tank, and source a tolerance limit for turbidity
- **Gate:** user signs off the final ranges; §7 has no `NEEDS_SOURCE` left.

### Phase 3 — Re-run notebooks 01 and 02 on real data
- [ ] Point `DATA_FILE` at the real log; no code changes except configuration
- [ ] Compare real vs placeholder statistics (daily range, ACF at 24 h, missing %)
- [ ] Re-select models on validation; evaluate on test **once**
- **Gate:** results table shows skill vs persistence per sensor/horizon **with sample sizes**.

### Phase 4 — Walk-forward retraining job (§9)
- [ ] Weekly scheduled job, logs every cycle, deploys a new model only if it beats the current one
- **Gate:** two consecutive cycles run unattended without error.

### Phase 5 — Alerts
- [ ] Alert only when a status persists for N minutes (N chosen with staff; `NEEDS_INFO`) with hysteresis
- [ ] Every alert and the operator's response is written to the events table

### Phase 6+ — Not planned yet
Reinforcement learning, human-feedback models, weather inputs: **ideas only (§14).** Do not start.

---

## 7. Fuzzy specification (literature-based)

For each parameter, a trapezoid *suitability* `(zero, full, full, zero)`; **overall suitability = MIN over the five** (most limiting factor).
Status: **Optimal** = overall is exactly 1 · **Warning** = 0 < overall < 1 · **Critical** = overall is 0.

| parameter | trapezoid | source | open issue |
|---|---|---|---|
| temperature (°C) | 19 / 25 / 31 / 32 | Jones (2009), *J World Aquac Soc* 40(6):744-752 (growth 25–31 °C, optimum 27); *P. ornatus* thermal-physiology study (max non-lethal 32 °C — **full citation to be added**); culture guideline 25–30 °C (Vikaspedia, secondary source) | `NEEDS_SOURCE`: 19 °C is only the coldest temperature *tested*, not a lethal limit |
| salinity (ppt) | 25 / 30 / 34 / 38 | culture guideline 30–38 ppt; 25–34 ppt optimum for *P. ornatus*; Jones (2009): 35 ppt best growth but lowest survival | `NEEDS_SOURCE`: lower zero-point 25 ppt is provisional |
| pH | 7.0 / 7.8 / 8.4 / 8.5 | culture guideline 7.8–8.4; marine-biota standard 7.0–8.5 (KepMen LH No. 51/2004) | — |
| turbidity (NTU) | step: suitability 1 if ≤ 5, else 0.5 (**Warning only, never Critical**) | KepMen LH No. 51/2004 marine-biota standard "< 5 NTU" — a **natural-seawater** standard, not a tank standard | `NEEDS_SOURCE`: no tolerance limit found; a fed tank may exceed 5 NTU after every feeding; analog NTU values need calibration |
| dissolved O₂ (**% saturation**) | 70 / 80 / ∞ / ∞ | culture guideline: ≥ 80 % preferred, 70 % minimum; saturation computed from DO, temperature, salinity with **Weiss (1970)** | KepMen LH 51/2004 states > 5 mg/L (consistent at 28–32 °C). **Do not use the old "3.5 mg/L" value — unverified.** |
| ~~ammonia~~ | **removed** (no sensor, per budget plan) | — | Manual test-kit readings go to the events table; if an ammonia sensor is added later, the earlier range (≤ 0.3 mg/L KepMen LH 51/2004; < 2 mg/L guideline; sources differ ~7×) is a starting point only |

**Crisp value (FWQI), decision D9:** `FWQI = 100 × (Π μᵢ)^(1/5)` over the five suitabilities — a zero-order Sugeno system with product-AND, 5th root only to keep the scale readable. FWQI = 100 only when every sensor is inside its optimum; 0 when any sensor is outside tolerance. **Equal sensor weights are provisional** (staff may set weights later); the product form and the 0.5 turbidity floor are design choices, not sourced values.

Rules for the fuzzy code:
- One shared `fuzzy_assess()` function used by **every** notebook/script (no duplicated logic that can drift).
- Output only `fuzzy_suitability` and `fuzzy_status`.
- Do not describe Critical as "lethal" or advise actions ("flush the tank"). The status is informational.

---

## 8. Forecasting specification

- **Step:** 30 minutes (48 steps/day). **Horizons:** 30 min, 1 h, 3 h, 6 h (steps 1, 2, 6, 12).
- **Evaluation:** rolling-origin — a new forecast every hour; parameters frozen from the fitting window, model state updated with each new observation.
- **Experiments (notebook 03 only):** structural model, physics-informed oxygen, feeding-aware ARIMAX, log-turbidity, forecast combination, probabilistic alerts. **Pre-set rule:** KEEP only if ≥ 2 skill points better than the best baseline on **both** validation and test; one-sided = MAYBE; else DROP. A model that is numerically unstable on any sensor is excluded for that sensor.
- **Models (all fitted to every sensor):** Persistence · Seasonal naive (24 h) · ARIMA · SARIMA (s = 48, fitted on the latest 14 days) · VAR · VAR + daily harmonics · ARIMA + daily harmonics.
- **Selection:** per sensor, the model with the lowest mean MAE across the four horizons **on validation**. Report the selected model's **test** score next to the best-on-test model (to show selection noise).
- **Status forecast:** pass the five forecasted sensors through `fuzzy_assess()`; report accuracy, macro-F1, alerts caught, false alarms, with class counts.
- **Required plots:** skill-vs-horizon, forecast-vs-actual (1 h), 24 h fan plot (shows mean reversion), VAR diagnostics, status confusion matrices, per-sensor suitability heat-map.
- **ML/DL (notebook 04 only):** LightGBM, Random Forest, MLP, GRU, LSTM, dilated CNN predict the *change* of every sensor for the next 12 steps. They go through the guard-rails and then `fuzzy_final()`. **Pre-set rule:** KEEP only if the FWQI skill beats the best statistical baseline by ≥ 2 points on **both** validation and test; one-sided = MAYBE; else DROP.
- Do **not** add further models, hyper-parameter searches, or other architectures without a task asking for them.

---

## 9. Walk-forward (continuous) retraining protocol

Capture **never stops**. Training uses frozen snapshots:

1. Choose a **cutoff time**. Everything before it is the snapshot; its last 20 % (by time) is validation.
2. Train/choose on the snapshot. Rows arriving *during* training are untouched → they become the next out-of-sample test.
3. Forecast live between refits (state updates only).
4. **Weekly:** refit on all data up to the new cutoff; score on the newest week.
5. Log per cycle: model version, cutoff, data range, row counts, validation and test scores, deploy decision.
6. **Deploy a new model only if** it beats the current model on the newest test week; otherwise keep the old one and flag for review.
7. **Pre-refit data-quality gate:** abort the refit if a sensor is frozen, > 10 % missing, or has a calibration event in the window (flag for human review).
- Measure data in **days covered**, not row counts. Minimum for a first meaningful fit ≈ 2–4 weeks; preferred ≥ 2–3 months. Judge reliability by the number of Warning/Critical **episodes**, not rows.

---

## 10. TimescaleDB specification

- `readings` **hypertable**: `time`, `sensor`/column per §4.1, optional `quality_flag`. Partition on `time`.
- `events` table per §4.3.
- **Continuous aggregate** of 30-minute median/min/max/stddev/valid-count per sensor (verify that medians are supported in continuous aggregates in the installed version; otherwise use an approximate percentile or compute in Python — **ask before choosing**).
- **Compression** for old chunks; **retention** only after raw data is archived/exported. Keep the 30-minute aggregates indefinitely.
- `model_runs` table: version, cutoff, data range, metrics, deployed (bool).
- All DDL goes in `db/migrations/` as reversible files. **No destructive statement without approval (R10).**

---

## 11. STOP and ask the user when…

- the task seems to need a column, threshold, parameter or reference that is not in this file;
- a result looks too good (skill > 90 % beyond temperature, accuracy ≈ 100 %) — suspect leakage;
- the data spacing, units, or time zone differ from §4;
- fewer than ~30 Warning/Critical cases exist in any evaluation split;
- you would need to change more than one file that the task did not name;
- you are about to install a system-level package, change the DB schema, or touch anything under `data/raw/`;
- two instructions (this file vs the task, or two sections here) conflict.

---

## 12. Definition of done / verification checklist

A task is **not done** until you show evidence for each item that applies:

- [ ] Code/notebook runs **top-to-bottom from a clean kernel** without errors (state how long it took).
- [ ] Output files exist at the stated paths; list them.
- [ ] §3 rules re-checked; state any that were *at risk* and how you handled them.
- [ ] Dataset columns equal §4 exactly (print `df.columns`).
- [ ] Splits are chronological; print start/end timestamps and row counts per split.
- [ ] Every reported metric has its baseline (persistence) and its sample size.
- [ ] Anything synthetic is labelled `placeholder`.
- [ ] New assumptions are logged in §14.
- [ ] You list what you did **not** verify.

---

## 13. Task request template (user fills this in; agent refuses vague tasks)

```
TASK:            <one sentence>
PHASE:           <from §6>
ALLOWED FILES:   <paths the agent may edit/create>
FORBIDDEN:       <paths/areas it must not touch>
INPUT:           <data file / table, real or placeholder?>
EXPECTED OUTPUT: <files, tables, plots — exact names>
ACCEPTANCE TEST: <how I will check it, e.g. "notebook 02 runs; accuracy_test.csv has 7 models × 5 sensors × 12 horizons">
OUT OF SCOPE:    <things it must NOT do>
```

**Paste at the start of each agent session:**
> Read `PLANS.md` completely. Restate the task, the files you will touch, and the §3 rules that apply. Write a short plan and wait for my approval before editing anything. Do only this task.

---

## 14. Decision log, open questions, ideas

### Decisions
| ID | Decision | Date | Reason |
|---|---|---|---|
| D1 | Time zone of `timestamp`: fixed to **GMT+7 (WIB / Asia/Jakarta)** | 2026-10-22 | user confirmed GMT+7 across telemetry and UI |
| D2 | 30-minute medians; ≥ 3 valid readings per bin | | robust to spikes; avoids interpolated rows |
| D3 | Chronological 60 / 20 / 20 split | | no leakage |
| D4 | DO scored as % saturation (Weiss 1970) | | sourced guideline is in % saturation |
| D5 | Overall suitability = MIN over parameters | | most-limiting-factor logic |
| D6 | Ammonia sensor dropped; turbidity added | per RAB_CAPSTONE.xlsx | budget plan; skimmer relied on for organic load |
| D7 | Turbidity can trigger Warning only (suitability 0.5 above 5 NTU) | | no sourced tolerance limit exists |
| D8 | Relay / aerator control in scope? **TODO** | | budget lists a relay + test aerator |
| D9 | Crisp water-quality value = FWQI (product-AND Sugeno, equal weights provisional) | | user wants fuzzy to give the crisp value |
| D10 | ML/DL only as sensor forecasters behind fuzzy (R17) | | user: models must not control the WQI |
| D11 | Target lobster species confirmed: **Pearl Lobster (*Panulirus ornatus*)** | 2026-11-10 | user confirmed; matches Jones (2009) thermal & salinity citations in §7 |
| D12 | Keep Notebook 02 classical statistical models (`VAR + daily harmonics` & `SARIMA s=48`); exclude LightGBM / RF | 2026-11-10 | Notebook 04 (`ml_dl_scorecard.csv`) showed zero ML/DL models passed KEEP on validation |

### Open questions (`NEEDS_INFO` / `NEEDS_SOURCE`)
- [x] Lobster species (Latin names) — confirmed *Panulirus ornatus* (Pearl Lobster, D11)
- [ ] Relay/aerator control: in scope or not (D8)
- [ ] Turbidity: calibration method; is 5 NTU a sensible Warning level for a fed tank; tolerance limit source
- [ ] Manual ammonia/nitrite test routine: who, how often
- [ ] Lower temperature and salinity tolerance limits (sources)
- [ ] Logging interval and whether one row holds all five sensors
- [ ] Alert persistence time N (with staff)

### Ideas (NOT approved — do not implement)
- External weather forecast (air temperature, rain) as an extra model input
- Human-in-the-loop labelling of alerts, then supervised threshold calibration
- RL for aeration scheduling in **simulation only**, with fuzzy as a safety layer
- Ammonia "soft sensor" estimated from sparse manual test-kit readings (needs many paired readings; unproven)
- Temperature + humidity logger for live-lobster transport boxes (separate project)

### Status
| Item | State |
|---|---|
| Notebooks 01–04 | working on placeholder data (sensor set from budget plan, no ammonia); code auto-formatted (one statement per line) |
| Real data | not started |
| Fuzzy ranges | 4 items still `NEEDS_SOURCE` (temperature lower limit, salinity lower limit, turbidity tolerance, plus turbidity 5 NTU suitability for a tank) |
| TimescaleDB schema | not started |
