# Art Bible — Arrival: Harbour City, First Day (v2.0.0)

## 1. Visual Direction & Mood

**Concept:** *"Harbour City, first day"* — a bright, welcoming, lived-in coastal city at golden hour where every task location is a physical 3D architectural space rather than a flat photograph behind a counter. Warm low-angle sunlight streams through station canopies and café windows, dust motes and espresso steam drift through the air, trains glide along the platform, commuters walk past, and expressive animated-movie characters make eye contact, breathe, blink, and gesture as you speak with them.

## 2. Colour Palette & Cinematic Grade

| Swatch Name | Hex | Role |
|---|---|---|
| **Harbour Teal** | `#1F8A8A` | Primary architectural & transit accent, harbour water trim, interactive highlights (`--v2-accent: #166969` darkened for WCAG AA) |
| **Terracotta** | `#D9663B` | Warm masonry, café brickwork, exterior harbour facades, sunset warm accents |
| **Sunlit Cream** | `#F4E7CF` | Interior plaster walls, floating HUD surface tint (`#FCF6EC`), sunlit highlights |
| **Transit Blue** | `#2457A6` | Harbour Central concourse beams, help desk, wayfinding & hostel signage |
| **Café Red** | `#B8322A` | Ticket machine header, allergen warning bands, urgent signage callouts |

**Cinematic Grade (`applyCaseGrade('arrival-english')`):**
- **Tone mapping:** Three.js `AgXToneMapping` (fallback `ACESFilmicToneMapping`) at exposure `1.15` for warm, saturated highlights and gently lifted shadows.
- **Sky dome:** Procedural vertex-coloured gradient dome (`v2-sky-dome`, radius `500 m`) transitioning from deep coastal zenith (`#2C6CA0`) to golden-hour horizon (`#F5B882`) and warm slate ground (`#3B424C`).
- **Atmosphere:** Exponential height/distance fog (`THREE.FogExp2`, `#E6CBB2`, density `0.012`) and warm hemisphere fill (`#FFE6C7` sky / `#454D59` ground, intensity `0.65`).

## 3. Typography System (`src/styles/case-fonts.css`)

All three font families are self-hosted WOFF2 files under `src/styles/fonts/` (SIL Open Font License 1.1) with `font-display: swap`:

1. **Display (`--font-display`):** **Bricolage Grotesque** (weights 600, 700) — headings, module titles, and hero banners. Warm, characterful humanist grotesque that evokes friendly travel signage.
2. **Body (`--font-body`):** **Atkinson Hyperlegible** (weights 400, 700) — dialogue transcripts, choice buttons, instructions, and feedback. Specifically designed for maximum character distinction (`I`/`l`/`1`, `0`/`O`), helping A2–B1 language learners read without orthographic ambiguity.
3. **In-World Accent (`--font-accent`):** **Overpass** (weights 600, 700) — transit boards, ticket machine screens, café menus, price tables, badges, and projected 3D tooltips/speech bubbles.

**Accessibility ("Plain font" toggle):** Clicking `Plain font` in the header sets `html[data-plain-font="on"]`, switching all font roles to clean system sans-serif / monospace fallbacks and persisting the preference in `localStorage` (`arrival-english:plain-font`).

## 4. Anti-Greenscreen 3D Architecture & Lighting

In v1.0.0, each location displayed a 360° photographic HDRI on a `GroundedSkybox` right behind the counter, creating a flat "greenscreen" look where 3D props did not share the perspective or ground plane of the photo.

In **v2.0.0**, photographic skyboxes are removed from the visible background:
- **HDRI for IBL only:** The 1K `.hdr` environment maps (`station.hdr`, `cafe.hdr`, `pharmacy.hdr`, `hostel.hdr`) are used strictly for image-based reflections and diffuse irradiance (`scene.environment` at intensity `0.85`).
- **Full 3D enclosures & harbour vistas:** Every location is built as a complete 3D architectural interior/concourse within 30 m — tiled and wooden floors with baseboards, structural columns, roof canopies or ceiling beams with pendant fixtures, side walls, and glazed windows opening onto a 3D Harbour City street and waterfront vista with water, quay wall, distant buildings, and bobbing harbour boats.
- **Contact-shadow grounding (`groundProp`):** Every counter, furniture piece, GLB prop, and character receives a soft radial contact-shadow disc (`v2-contact-shadow`) at `y = 0.006 m` plus real-time directional shadow maps, eliminating floating objects.

## 5. Curated Poly Haven CC0 3D Models (`public/assets/models/manifest.json`)

Loaded via `ModelLibrary` (`src/v2/model-placer.js`) with automatic scale normalisation and contact shadows:

| Asset ID | Model Name | Author | License | Scene Placement |
|---|---|---|---|---|
| `painted_wooden_bench` | Painted Wooden Bench | Kirill Sannikov | CC0 1.0 | Station platform waiting area & Hostel lobby |
| `street_lamp_01` | Street Lamp 01 | Josh Dean | CC0 1.0 | Station platform & Harbour street outside windows |
| `potted_plant_02` | Potted Plant 02 | Rico Cilliers | CC0 1.0 | Station concourse, Café corner, Pharmacy entrance, Hostel lobby |
| `CoffeeCart_01` | Coffee Cart 01 | Joe Seabuhr | CC0 1.0 | Harbour Café espresso & pastry service area |
| `CashRegister_01` | Cash Register 01 | Joe Seabuhr | CC0 1.0 | Harbour Café counter & Harbour Pharmacy counter |
| `standing_chalkboard_01` | Standing Chalkboard 01 | ParzivalCG | CC0 1.0 | Harbour Café specials & allergy notice pavement board |
| `bar_chair_round_01` | Bar Chair Round 01 | Dairon Sanchez | CC0 1.0 | Harbour Café counter stools & window bar |
| `sofa_02` | Sofa 02 | Kirill Sannikov | CC0 1.0 | Harbour Hostel lounge waiting area |

## 6. Animated-Movie 3D Characters (`src/scenes/npc.js` + `src/v2/stylized-character.js`)

All NPCs use `createAnimatedCharacter` wrapped by `NPC` / `createNPC`:
- **Hero cast:**
  - **Sam** (Station help desk): cropped dark hair, transit-blue uniform (`#24456B`), orange lanyard.
  - **Priya** (Harbour Café): bun hairstyle, cream top (`#E9E4DA`), forest-green barista apron (`#2F5D50`).
  - **Mr Okafor** (Harbour Pharmacy): cropped hair, glasses, white pharmacist coat (`#F3F5F7`) over navy trousers.
  - **Leo** (Harbour Hostel): curly brown hair, warm burgundy cardigan/top (`#8A3B3B`).
- **Background cast:** Commuters on the station concourse, a seated café customer, a pharmacy shopper, and a hostel backpacker.
- **Expressive rigging & procedural animation:**
  - Layered eyes with sclera, coloured iris, pupil, cornea specular catchlight, blinking upper eyelids, and articulated eyebrows.
  - Procedural chest breathing, periodic natural blinking, and smooth head/iris gaze tracking toward the learner camera (`lookAtWorld`).
  - Lip-flap jaw movement when speaking (`setSpeaking(true)`).
  - Semantic reaction mapping:
    - `neutral` → `'idle'` (`neutral` expression)
    - `warm`, `relieved`, `nod` → `'wave'` / `'idle'` (`happy` / `engaged` expression)
    - `confused`, `puzzled`, `think` → `'confused'` (`confused` expression)
    - `impatient`, `firm`, `put-off` → `'withdrawn'` (`concerned` / `withdrawn` expression)
    - `pointing`, `point` → `'point'` (`engaged` expression)
    - `apologetic`, `look-down`, `shrug` → expressive posture & brow shifts

## 7. Ambient Life Systems (`src/v2/ambient-life.js`)

Every scene runs at least 5 concurrent ambient-life systems via `AmbientLifeManager`:
1. **Volumetric golden-hour light shafts (`addLightShafts`):** Angled sunbeams streaming through station skylights and café/hostel windows.
2. **Atmospheric particle volumes (`addParticleVolume`):** Floating golden dust motes in sunbeams plus rising hot steam particles above the café espresso machine.
3. **Spline movers (`addSplineMover`):**
   - **Station:** An articulated harbour transit train car that glides along the rear platform track, plus a walking commuter on the concourse.
   - **Café / Pharmacy / Hostel:** Walking passers-by and bobbing boats on the harbour outside.
4. **Harmonic oscillators (`addOscillator`):** Gently swaying potted plants, bobbing harbour boats, and softly swinging pendant lamps.
5. **Continuous character life (`addCharacter`):** Breathing, blinking, eye-tracking, and idle posture shifts on both hero NPCs and background figures.

**Calm Mode:** During active `task` dialogue turns, `setCalmMode(true)` smoothly slows ambient motion to `30%` and dims particle/beam opacity so the NPC's reaction and readable signage remain the most salient elements on screen. In `pre` (Before), `post` (After), and Start/Wrap-up views, `setCalmMode(false)` restores `100%` ambient life. When `prefers-reduced-motion` is enabled, all non-essential motion pauses completely.

## 8. In-World Interactions (`src/v2/in-world-interaction.js`)

- **3D Picking & Hover Highlights:** Pointing at any 3D sign, ticket machine, menu board, medicine box, booking screen, or NPC highlights it with a warm emissive rim and displays a high-contrast projected 3D tooltip (`#11161D` background, `#F8FAFC` text, `14.8:1` contrast).
- **Cinematic Camera Glide & Hotspots:** Clicking any interactive 3D object or glowing floor hotspot ring (`addHotspotRing`) smoothly glides the camera (`glideTo` / `setView`) to frame that object or character and opens an in-world projected callout / speech bubble (`setSpeechBubble`) showing the sign text or latest NPC dialogue line.
- **Free Navigation:** Learners can drag the mouse on the 3D canvas to look around and use `WASD` / Arrow keys (`Q`/`E` to turn) to walk freely through each place at any time.
- **Full Keyboard & Text-Mode Parity:** Every in-world view and sign has a 1-to-1 equivalent in the `Look at:` button bar, the `Read the signs in this place` disclosure, and Text Mode.
