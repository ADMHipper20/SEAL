# PLANS.md — Marine Lobster Tank Water-Quality Monitoring (SEAL)

> **AGENT: READ THIS ENTIRE FILE BEFORE DOING ANYTHING.**
> This file overrides all prior assumptions. If a task conflicts with this file, **stop and ask** — do not pick a side silently.

---

## 0. How the Agent Must Work

1. **Read this file first, every session.** Restate in 3–5 lines: the task, the files you will touch, and the §3 rules that apply.
2. **One task at a time.** Do only what the current task asks. Do not "also improve" unrelated modules.
3. **Plan before editing.** For any task touching more than one file, write a short plan (files, steps, verification) and wait for approval.
4. **Prove it works.** Never say "done" without building/running the code and showing output (§12).
5. **Record decisions.** Any architectural choice goes into §14 *Decision log* — never decide silently.
6. **Unknown = ask or flag.** If a number, threshold, or citation is not in this file or a user-provided source, mark it `NEEDS_SOURCE` and ask. **Never fabricate values.**

---

## 1. Goal and Non-Goals

**Goal:** A water-quality monitoring, fuzzy suitability assessment, and time-series forecasting web system for **one** marine lobster holding tank (*Panulirus spp.*) on the Telkom University Surabaya campus.
- **Automated IoT Telemetry (3 Sensors):** Continuously logs **Temperature (°C)**, **pH**, and **Turbidity (NTU)** from the ESP32 node.
- **Fuzzy Suitability Engine:** Evaluates water quality against literature-grounded trapezoidal ranges (`Optimal` / `Warning` / `Critical`) using the most-limiting-factor rule (`MIN`).
- **Forecasting Engine:** Projects the active telemetry sensors 30 min – 6 h ahead using classical time-series models (ARIMA / SARIMA / VAR) benchmarked against Persistence.

**Non-Goals (Do NOT build):**
- Automated Dissolved Oxygen (DO) or automated Salinity telemetry ingestion (excluded by Electrical Engineering hardware scope; see §2 & §14 D7).
- Hardware actuator control (no GPIO, relays, or MQTT commands to blowers/pumps/skimmers).
- Deep learning, reinforcement learning, authentication/RBAC, or multi-tank support.

---

## 2. Facts About the Tank & Hardware Scope

**Known Hardware & Tank Setup (Confirmed):**
- Single cemented marine holding tank with PVC shelters at Telkom University Surabaya.
- **24/7 Mechanical Life Support:** Campus blower/air pump, protein skimmer, and circulation pump run continuously 24/7 without software control (relying on continuous aeration for DO and mechanical skimming for organic/ammonia removal).
- **Active Automated ESP32 Sensors (3 Probes Only):**
  1. **Water Temperature (`temperature_c`)**: DS18B20 Waterproof (1-Wire digital).
  2. **Acidity (`ph`)**: PH-4502C + pH electrode probe (via ADS1115 16-bit ADC).
  3. **Turbidity (`turbidity_ntu`)**: Turbidity Red Board optical sensor (via ADS1115 16-bit ADC).
- **Excluded from Automated Telemetry:**
  - **Salinity (`salinity_ppt`)**: Checked manually by staff using a refractometer (not wired to ESP32).
  - **Dissolved Oxygen (`dissolved_oxygen_mgl`)**: Dropped from hardware BOM; assumed maintained by 24/7 campus blower aeration.
- **Tank Volume:** Unmeasured (`NEEDS_INFO`); all software calculations are concentration-based and volume-agnostic.

---

## 3. HARD RULES — Never Break These

| # | Rule |
|---|---|
| R1 | **No invented data presented as real.** Synthetic/demo datasets must be labelled `placeholder` in filenames, UI badges, and summaries. |
| R2 | **No invented numbers.** Every fuzzy threshold or citation needs a source in §7 or `NEEDS_SOURCE`. |
| R3 | **Strict 3-Sensor Automated Schema.** Automated ESP32 ingestion (`POST /api/readings`) and `readings.csv` contain **only** `timestamp`, `temperature_c`, `ph`, and `turbidity_ntu`. Never fabricate `salinity_ppt`, `dissolved_oxygen_mgl`, or `ammonia_mgl` values in automated logs. |
| R4 | **Never resample coarser data to finer.** Refuse input whose median spacing is coarser than 30 min (`spacingGuardOk = false`). |
| R5 | **Time-ordered splits only.** Chronological 60% train / 20% validation / 20% test split. No shuffling. |
| R6 | **Test set is touched once**, after model selection on validation finishes. |
| R7 | **Always compare with persistence** (`next = last value`). Report skill ≤ 0% explicitly as *no better than persistence*. |
| R8 | **Report sample sizes.** Print Warning/Critical counts per split; flag scores as provisional if non-Optimal test cases < 30. |
| R9 | **Do not change fuzzy ranges (§7) silently.** Any change requires a source, a §14 entry, and user approval. |
| R10 | **Append-only raw logs.** Never overwrite or delete `data/readings.csv`. Missing sensor readings stay `null`, never `0`. |
| R11 | **No hardware control code.** Monitoring and alerting only. |
| R12 | **No scope creep.** Log future ideas in §14; do not implement unapproved features. |
| R13 | **No hard-coded local paths.** Use relative paths or config variables. |
| R14 | **No biological diagnosis claims.** Fuzzy status indicates *inside/outside published literature ranges*, not lobster medical health. |

---

## 4. Data Contract (Updated for 3 Automated Sensors)

### 4.1 Raw Sensor Log (`data/readings.csv` & `POST /api/readings`)
| Column | Type | Unit | Notes |
|---|---|---|---|
| `timestamp` | ISO 8601 String | GMT+7 (WIB) | Required; one row per reading |
| `temperature_c` | Float \| null | °C | DS18B20 probe |
| `ph` | Float \| null | pH | PH-4502C probe |
| `turbidity_ntu` | Float \| null | NTU | Turbidity Red Board |

### 4.2 Derived 30-Minute Modelling Table
- Resampled into **30-minute medians** (requires ≥ 3 valid readings per bin; linear interpolation allowed only for internal gaps ≤ 3 h / 6 bins).
- Derived fields allowed: `fuzzy_suitability` (0.0–1.0), `fuzzy_status` (`Optimal` | `Warning` | `Critical` | `No data`), and `interpolated` (boolean).

---

## 5. UI/UX Architecture & Navigation Rules (Supervisor Review — Mr. Nizar)

All frontend components in `src/components/dashboard/` and `src/components/layout/` must enforce:
1. **Top-Down Visual Hierarchy on `Overview`:**
   - **Row 1 (Headline — Full Width):** `Current Condition` displaying the 3 active automated sensors (`Temperature`, `pH`, `Turbidity`) prominently across full container width, plus an informational badge noting Salinity is manually monitored.
   - **Row 2 (Visual Anchor):** `PondHeroVisualizer` (3D Tank Static/Video/Off) centered below `Current Condition` to separate headline telemetry from supporting analytics.
   - **Row 3 (Compact Supporting Grid):** `Fuzzy Suitability & Limiting Factor`, `Ahead Forecast (+30m to +6h)`, `Interactive Trend Chart`, `Data Quality`, and `Threshold Alerts` (placed at the bottom).
2. **Interactive Card-to-Chart Binding:**
   - Clicking any sensor card in `Current Condition` immediately sets that sensor as the active series in the `Live Graph` / `24h` trend chart without requiring page scrolling.
3. **Simplified 2-Tab Top Navbar (`Navbar.tsx`):**
   - Primary top-level tabs: **`Overview`** and **`About`** only.
   - Selecting **`About`** reveals a clean horizontal sub-menu bar (matching the segmented pill style of `Static 3D | Video | Off`—**never** a three-dot `⋮` menu) containing: `Forecast`, `Water Quality`, `Alerts`, `History`, and `Device`.

---

## 6. Phases & Current Status

- [x] **Phase 0**: Synthetic pipeline & Next.js Bento UI prototype built.
- [ ] **Phase 1 (Active)**: Refactor schema, fuzzy engine, ML pipeline, and UI from 5 sensors down to the **3 confirmed automated sensors** (`temperature_c`, `ph`, `turbidity_ntu`) + implement Mr. Nizar's UI hierarchy & 2-tab (`Overview` / `About`) navigation.
- [ ] **Phase 2**: Capture ≥ 14 days of live 3-sensor ESP32 logs into `data/readings.csv` and validate forecasting skill.

---

## 7. Fuzzy Specification (3 Automated Sensors)

Overall suitability: $\text{suitability} = \min(\mu_{\text{temp}}, \mu_{\text{pH}}, \mu_{\text{turbidity}})$ (Rule D5).
Status: **Optimal** ($\mu = 1.0$) · **Warning** ($0.0 < \mu < 1.0$) · **Critical** ($\mu = 0.0$).

| Parameter | Key | Trapezoid $(a, b, c, d)$ | Optimum ($\mu = 1$) | Source |
|---|---|---|---|---|
| Water Temperature | `temperature_c` | `(19, 25, 31, 32)` | $25.0 - 31.0\text{ }^\circ\text{C}$ | Jones (2009), *J World Aquac Soc* 40(6):744–752 (`NEEDS_SOURCE` on 19 °C lower zero-point) |
| Acidity (pH) | `ph` | `(7.0, 7.8, 8.4, 8.5)` | $7.80 - 8.40\text{ pH}$ | KepMen LH No. 51/2004 (7.0–8.5) & marine culture guideline (7.8–8.4) |
| Turbidity | `turbidity_ntu` | `(-∞, -∞, 5.0, 25.0)` | $\le 5.0\text{ NTU}$ | KepMen LH No. 51/2004 marine clarity standard (`NEEDS_SOURCE` on 25 NTU upper zero-point) |

---

## 14. Decision Log

| ID | Decision | Date | Reason |
|---|---|---|---|
| D1 | Timezone fixed to **GMT+7 (WIB)** across logs, Python worker, and UI. | 2026-10-22 | Matches Surabaya campus holding tank operations. |
| D2 | 30-minute median resampling with ≥ 3 valid readings per bin. | 2026-10-22 | Rejects analog sensor spikes without distorting trends. |
| D3 | Chronological 60 / 20 / 20 train/val/test split. | 2026-10-22 | Prevents time-series lookahead leakage. |
| D5 | Overall suitability = `MIN` across active sensors. | 2026-10-22 | Most-limiting-factor biological rule. |
| D6 | Ammonia sensor replaced by Turbidity Red Board; ADS1115 16-bit ADC added. | 2026-11-01 | Campus tank runs 24/7 protein skimmer; ADS1115 fixes ESP32 ADC non-linearity. |
| D7 | **Scope reduced to 3 automated sensors (`temperature_c`, `ph`, `turbidity_ntu`)**; DO & Salinity removed from automated pipeline. | 2026-11-16 | Hardware team finalized 3 probes only (relying on 24/7 campus blower for DO and manual refractometer checks for Salinity). |
| D8 | **UI Layout & Navigation Overhaul**: Full-width `Current Condition` on top, 3D tank middle, compact cards bottom; Top Navbar simplified to `Overview` and `About` (with segmented sub-menu). | 2026-11-16 | Requested by project supervisor Mr. Nizar during Capstone progress review. |