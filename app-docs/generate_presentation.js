const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "AuctionArena";
pres.title = "AuctionArena — Final Submission Presentation";

const C = {
  DARK_BG: "0D1B3E",
  NAVY: "1E3A8A",
  GOLD: "F0A030",
  WHITE: "FFFFFF",
  LIGHT_BG: "F8FAFC",
  DARK_TEXT: "1E293B",
  MUTED: "64748B",
  SUCCESS: "059669",
  SUCCESS_LIGHT: "D1FAE5",
  CARD: "FFFFFF",
  BORDER: "E2E8F0",
  ROYAL: "2563EB",
  TEAL: "0891B2",
  PURPLE: "7C3AED",
  ORANGE: "EA580C",
  SECTION: "EEF2FF",
  GOLD_LIGHT: "FEF3C7",
  RED: "DC2626",
};

const mkShadow = () => ({ type: "outer", color: "000000", blur: 10, offset: 2, angle: 45, opacity: 0.09 });

function addCard(slide, x, y, w, h, fill = C.CARD) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: C.BORDER, width: 0.75 },
    rectRadius: 0.1,
    shadow: mkShadow(),
  });
}

function addSlideTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.18, w: 9, h: 0.6,
    fontSize: 26, fontFace: "Cambria", bold: true,
    color: C.DARK_TEXT, align: "left", valign: "middle", margin: 0,
  });
}

function addEyebrow(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0.5, y: 0.1, w: 9, h: 0.18,
    fontSize: 9, fontFace: "Calibri", color: C.GOLD,
    bold: true, charSpacing: 2, align: "left", margin: 0,
  });
}

function addDivider(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.82, w: 9, h: 0.02,
    fill: { color: C.BORDER }, line: { color: C.BORDER, width: 0 },
  });
}

function addChipShape(slide, x, y, w, h, bg, textColor = C.WHITE) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: bg, width: 0 },
    rectRadius: 0.12,
  });
  return { x, y, w, h, textColor };
}

// ── SLIDE 1 — TITLE ──────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.DARK_BG };

  // Gold arc shape top-right decoration
  s.addShape(pres.shapes.OVAL, {
    x: 6.5, y: -1.5, w: 5, h: 5,
    fill: { color: C.GOLD, transparency: 85 },
    line: { color: C.GOLD, width: 0 },
  });

  s.addText("AuctionArena", {
    x: 0.7, y: 1.0, w: 8.5, h: 1.3,
    fontSize: 56, fontFace: "Cambria", bold: true,
    color: C.WHITE, align: "left", valign: "middle", margin: 0,
  });

  s.addText("Full-Stack Real-Time Employee Auction Platform", {
    x: 0.7, y: 2.35, w: 8, h: 0.55,
    fontSize: 20, fontFace: "Calibri", color: C.GOLD,
    align: "left", valign: "middle", margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 3.0, w: 1.5, h: 0.03,
    fill: { color: C.GOLD }, line: { color: C.GOLD, width: 0 },
  });

  s.addText([
    { text: "Developer: Vamsi Ayiluri", options: { breakLine: true } },
    { text: "Email: alluripranithavarma@gmail.com", options: { breakLine: true } },
    { text: "June 2026  ·  Final Project Submission" },
  ], {
    x: 0.7, y: 3.2, w: 7, h: 0.9,
    fontSize: 13, fontFace: "Calibri", color: "ADBCE6",
    align: "left", valign: "top", margin: 0,
  });

  s.addText([
    { text: "Festival Auction  ·  Sport Tournament Auction  ·  Real-Time Bidding Engine", },
  ], {
    x: 0.7, y: 4.9, w: 8.5, h: 0.4,
    fontSize: 10, fontFace: "Calibri", color: "6B82BB",
    align: "left", margin: 0,
  });

  s.addNotes("Welcome to AuctionArena — a production-grade, real-time employee auction platform built for company sports festivals and tournaments. Introduce yourself and briefly state the problem this platform solves before advancing to the executive summary.");
}

// ── SLIDE 2 — EXECUTIVE SUMMARY ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Executive Summary");
  addSlideTitle(s, "AuctionArena at a Glance");
  addDivider(s);

  // 3 stat callout cards
  const stats = [
    { val: "2", label: "Auction Systems", sub: "Festival + Sport Tournament", color: C.NAVY },
    { val: "90+", label: "REST API Endpoints", sub: "Auth · Festival · Sport", color: C.ROYAL },
    { val: "~3 Months", label: "Delivery Time", sub: "vs 6–9 months estimated without AI", color: C.SUCCESS },
  ];
  stats.forEach(({ val, label, sub, color }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 1.0, 2.9, 1.55);
    s.addText(val, { x, y: 1.05, w: 2.9, h: 0.7, fontSize: 36, fontFace: "Cambria", bold: true, color, align: "center", margin: 0 });
    s.addText(label, { x, y: 1.72, w: 2.9, h: 0.28, fontSize: 12, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, align: "center", margin: 0 });
    s.addText(sub, { x, y: 2.0, w: 2.9, h: 0.24, fontSize: 9, fontFace: "Calibri", color: C.MUTED, align: "center", margin: 0 });
  });

  // 3 key points below
  const points = [
    { icon: "🎯", title: "Real Problem Solved", body: "Replaces manual, error-prone spreadsheet and whiteboard auctions with a browser-based, budget-enforcing, fully auditable system." },
    { icon: "⚡", title: "Real-Time First", body: "Socket.IO WebSocket rooms broadcast every bid instantly to all participants. Revision-guarded state prevents stale updates." },
    { icon: "🔐", title: "Multi-Role Architecture", body: "Three roles (admin, team_owner, spectator) enforced at every API endpoint. Captains and team owners bid; spectators observe." },
  ];
  points.forEach(({ icon, title, body }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 2.8, 2.9, 2.55);
    s.addText(icon, { x, y: 2.92, w: 2.9, h: 0.4, fontSize: 22, align: "center", margin: 0 });
    s.addText(title, { x, y: 3.32, w: 2.9, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, align: "center", margin: 0 });
    s.addText(body, { x: x + 0.15, y: 3.65, w: 2.6, h: 1.6, fontSize: 10, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("AuctionArena solves the real problem of running company sports day auctions. It delivers two complete auction systems, 90+ REST endpoints, and was built in approximately 3 months with AI-assisted development. Emphasise that all three pillars — problem, real-time, and multi-role — were delivered and are in the live product.");
}

// ── SLIDE 3 — PROBLEM STATEMENT ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Problem Statement");
  addSlideTitle(s, "Why AuctionArena Was Needed");
  addDivider(s);

  // Left: pain points
  addCard(s, 0.5, 1.0, 4.55, 4.35, C.CARD);
  s.addText("BEFORE — Manual Auction Problems", { x: 0.65, y: 1.1, w: 4.2, h: 0.3, fontSize: 11, fontFace: "Calibri", bold: true, color: C.RED, margin: 0 });

  const pains = [
    "No simultaneous bid visibility — disputes arise",
    "No budget enforcement — teams overspend",
    "No audit trail — bid history permanently lost",
    "Manual admin overhead — verbal announcements",
    "No role separation — spectators could interfere",
    "Spreadsheets break with 50+ participants",
  ];
  pains.forEach((pain, i) => {
    s.addText(`✗  ${pain}`, {
      x: 0.65, y: 1.55 + i * 0.52, w: 4.2, h: 0.44,
      fontSize: 11, fontFace: "Calibri", color: C.DARK_TEXT,
      align: "left", valign: "top", margin: 0,
    });
    if (i < pains.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.65, y: 1.97 + i * 0.52, w: 4.1, h: 0.01, fill: { color: C.BORDER }, line: { color: C.BORDER, width: 0 } });
    }
  });

  // Right: after
  addCard(s, 5.3, 1.0, 4.2, 4.35, "EEF6FF");
  s.addText("AFTER — AuctionArena", { x: 5.45, y: 1.1, w: 3.9, h: 0.3, fontSize: 11, fontFace: "Calibri", bold: true, color: C.SUCCESS, margin: 0 });

  const solutions = [
    "Live bid stream visible to all simultaneously",
    "Hard budget caps enforced on every bid",
    "Complete bid history stored per auction round",
    "Admin controls the full lifecycle from one screen",
    "Role-based access: admin / owner / spectator",
    "Scales to hundreds of participants via database",
  ];
  solutions.forEach((sol, i) => {
    s.addText(`✓  ${sol}`, {
      x: 5.45, y: 1.55 + i * 0.52, w: 3.9, h: 0.44,
      fontSize: 11, fontFace: "Calibri", color: C.DARK_TEXT,
      align: "left", valign: "top", margin: 0,
    });
    if (i < solutions.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: 5.45, y: 1.97 + i * 0.52, w: 3.8, h: 0.01, fill: { color: "C7E4FF" }, line: { color: "C7E4FF", width: 0 } });
    }
  });

  s.addNotes("Emphasise the six real pain points that drove this project. Every bullet on the left is something the developer personally witnessed in company auction events. The right column is the exact solution AuctionArena delivers for each one — this is a direct mapping, not aspirational.");
}

// ── SLIDE 4 — MISSION, VISION & GOALS ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Mission & Vision");
  addSlideTitle(s, "Mission, Vision & Goals");
  addDivider(s);

  // Mission box
  addCard(s, 0.5, 1.0, 4.55, 1.7, "EEF2FF");
  s.addText("MISSION", { x: 0.65, y: 1.1, w: 4.1, h: 0.28, fontSize: 10, fontFace: "Calibri", bold: true, color: C.NAVY, charSpacing: 1.5, margin: 0 });
  s.addText("Make every employee sports auction fast, fair, and fully transparent — giving every participant a real-time window into the bidding process and giving administrators a single screen to run the full auction lifecycle.", {
    x: 0.65, y: 1.44, w: 4.1, h: 1.15, fontSize: 12, fontFace: "Calibri", color: C.DARK_TEXT,
    align: "left", valign: "top", margin: 0,
  });

  // Vision box
  addCard(s, 5.3, 1.0, 4.2, 1.7, "FFF7ED");
  s.addText("VISION", { x: 5.45, y: 1.1, w: 3.9, h: 0.28, fontSize: 10, fontFace: "Calibri", bold: true, color: C.ORANGE, charSpacing: 1.5, margin: 0 });
  s.addText("Become the definitive internal tooling platform for gamified employee allocation events — extensible beyond sports to any scenario where employees are drafted into competing groups via live bidding.", {
    x: 5.45, y: 1.44, w: 3.9, h: 1.15, fontSize: 12, fontFace: "Calibri", color: C.DARK_TEXT,
    align: "left", valign: "top", margin: 0,
  });

  // Goals
  s.addText("BUSINESS GOALS", { x: 0.5, y: 2.85, w: 9, h: 0.28, fontSize: 10, fontFace: "Calibri", bold: true, color: C.MUTED, charSpacing: 1.5, margin: 0 });

  const goals = [
    { num: "01", title: "Admin Self-Service", body: "Administrators configure, launch and complete auctions entirely via browser — no technical support required." },
    { num: "02", title: "Real-Time Bidding", body: "Team owners and captains place bids from any device, seeing live updates within 300ms via Socket.IO." },
    { num: "03", title: "Auditable Results", body: "Every bid and result is permanently stored — finance and HR can export complete bid histories at any time." },
  ];
  goals.forEach(({ num, title, body }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 3.2, 2.9, 2.2);
    s.addText(num, { x, y: 3.28, w: 2.9, h: 0.48, fontSize: 28, fontFace: "Cambria", bold: true, color: C.GOLD, align: "center", margin: 0 });
    s.addText(title, { x, y: 3.76, w: 2.9, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, align: "center", margin: 0 });
    s.addText(body, { x: x + 0.15, y: 4.08, w: 2.6, h: 1.18, fontSize: 10, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("The mission is concise and measurable. The vision extends the platform beyond sports — this is a realistic future direction given the auction engine is domain-agnostic. The three business goals map directly to the three user types: admin, team owner, and HR/finance reviewer.");
}

// ── SLIDE 5 — PRODUCT OVERVIEW ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Product Overview");
  addSlideTitle(s, "Two Auction Systems, One Platform");
  addDivider(s);

  const modules = [
    { title: "Festival Management", body: "Create festivals, import employees, configure sport selections, create teams and assign owners.", color: C.NAVY, icon: "🏟️" },
    { title: "Festival Auction", body: "Live bidding for employee assignment across festival teams. Budget enforcement, retention picks, pause/resume.", color: C.ROYAL, icon: "🔨" },
    { title: "Sport Tournament Setup", body: "Create sport tournaments, configure teams and captains, distribute credit budgets, generate auction pools.", color: C.TEAL, icon: "🏆" },
    { title: "Sport Auction Arena", body: "Real-time sport auction with team-specific credit tracking, gender eligibility rules, and sold/unsold results.", color: C.PURPLE, icon: "⚡" },
  ];

  modules.forEach(({ title, body, color, icon }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.6;
    const y = 1.0 + row * 2.1;
    addCard(s, x, y, 4.4, 1.95);
    s.addText(icon, { x, y: y + 0.1, w: 4.4, h: 0.45, fontSize: 22, align: "center", margin: 0 });
    s.addText(title, { x: x + 0.15, y: y + 0.55, w: 4.1, h: 0.3, fontSize: 13, fontFace: "Calibri", bold: true, color, margin: 0 });
    s.addText(body, { x: x + 0.15, y: y + 0.88, w: 4.1, h: 0.95, fontSize: 10.5, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
  });

  // Real-time engine spanning full width
  addCard(s, 0.5, 5.22, 9, 0.22, "0F1B3C");
  s.addText("⚡  SHARED REAL-TIME AUCTION ENGINE  ·  Socket.IO WebSocket  ·  Revision-Guarded State  ·  Role-Based Controls", {
    x: 0.5, y: 5.22, w: 9, h: 0.22,
    fontSize: 9, fontFace: "Calibri", bold: true, color: C.GOLD, align: "center", valign: "middle", margin: 0,
  });

  s.addNotes("Both systems — Festival and Sport Tournament — share the same underlying real-time auction engine at the bottom. This is important: the Socket.IO infrastructure, revision guard, and role-based bid controls are not duplicated. The architecture reuses the engine while exposing different product surfaces for each domain.");
}

// ── SLIDE 6 — KEY FEATURES BY ROLE ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Role-Based Features");
  addSlideTitle(s, "What Each Role Can Do");
  addDivider(s);

  const roles = [
    {
      role: "Admin", color: C.NAVY, bg: "EEF2FF",
      features: [
        "Create & configure festivals",
        "Import employees via directory",
        "Create sport tournaments",
        "Assign team owners & captains",
        "Configure budgets & auction pools",
        "Start, pause, resume & complete auctions",
        "Mark participants sold / unsold",
        "View all results and bid histories",
      ],
    },
    {
      role: "Team Owner / Captain", color: C.TEAL, bg: "F0FDFA",
      features: [
        "Join the live auction arena",
        "Place bids on participants",
        "Monitor own team budget in real time",
        "View competing team credit balances",
        "Review team roster after auction",
        "Access bid history for own team",
        "View results page after completion",
        "Receive sold/unsold toast notifications",
      ],
    },
    {
      role: "Spectator", color: C.PURPLE, bg: "FAF5FF",
      features: [
        "View live auction arena (read-only)",
        "See real-time bid stream",
        "View all team panel budgets",
        "Track auction queue and progress",
        "View completed auction results",
        "Access festival & sport directories",
        "See which team they were assigned to",
        "Toast notifications for sale outcomes",
      ],
    },
  ];

  roles.forEach(({ role, color, bg, features }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 0.95, 2.9, 4.5, bg);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 0.95, w: 2.9, h: 0.44, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(role, { x, y: 0.95, w: 2.9, h: 0.44, fontSize: 13, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    features.forEach((feat, j) => {
      s.addText(`›  ${feat}`, {
        x: x + 0.15, y: 1.47 + j * 0.44, w: 2.6, h: 0.38,
        fontSize: 10, fontFace: "Calibri", color: C.DARK_TEXT,
        align: "left", valign: "top", margin: 0,
      });
    });
  });

  s.addNotes("Role separation is enforced at every API endpoint — not just the UI. An admin token is required to start or pause an auction. Team owner tokens can only bid in arenas where they hold ownership. Spectator tokens receive real-time state but all bid submission endpoints reject them at the authorization layer.");
}

// ── SLIDE 7 — USER JOURNEY ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "User Journey");
  addSlideTitle(s, "End-to-End Auction Lifecycle");
  addDivider(s);

  // Festival journey
  s.addText("Festival Auction Journey", { x: 0.5, y: 0.95, w: 4.55, h: 0.28, fontSize: 12, fontFace: "Calibri", bold: true, color: C.NAVY, margin: 0 });

  const festSteps = ["Create Festival", "Add Participants", "Configure Teams", "Lock & Ready", "Live Auction", "Results"];
  const festColors = [C.NAVY, C.ROYAL, C.TEAL, C.GOLD, C.ORANGE, C.SUCCESS];
  festSteps.forEach((step, i) => {
    const x = 0.5 + i * 1.52;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.3, w: 1.35, h: 0.55, fill: { color: festColors[i] }, line: { color: festColors[i], width: 0 }, rectRadius: 0.08 });
    s.addText(step, { x, y: 1.3, w: 1.35, h: 0.55, fontSize: 9, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    if (i < festSteps.length - 1) {
      s.addText("›", { x: x + 1.36, y: 1.3, w: 0.15, h: 0.55, fontSize: 14, fontFace: "Calibri", color: C.MUTED, align: "center", valign: "middle", margin: 0 });
    }
  });

  // Descriptions
  const festDescs = [
    "Admin creates festival, selects sports",
    "Import CSV, register employees",
    "Create teams, assign owners, set budgets",
    "Readiness check passes, config locked",
    "Real-time bidding, Socket.IO broadcast",
    "Final rosters, bid history, export",
  ];
  festDescs.forEach((desc, i) => {
    s.addText(desc, { x: 0.5 + i * 1.52, y: 1.92, w: 1.35, h: 0.55, fontSize: 8, fontFace: "Calibri", color: C.MUTED, align: "center", valign: "top", margin: 0 });
  });

  // Sport journey
  s.addText("Sport Tournament Journey", { x: 0.5, y: 2.65, w: 4.55, h: 0.28, fontSize: 12, fontFace: "Calibri", bold: true, color: C.TEAL, margin: 0 });

  const sportSteps = ["Create Tournament", "Assign Captains", "Set Credit Budgets", "Auction Pool", "Sport Auction", "Results"];
  const sportColors = [C.TEAL, "0E7490", "0891B2", C.GOLD, C.ORANGE, C.SUCCESS];
  sportSteps.forEach((step, i) => {
    const x = 0.5 + i * 1.52;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.0, w: 1.35, h: 0.55, fill: { color: sportColors[i] }, line: { color: sportColors[i], width: 0 }, rectRadius: 0.08 });
    s.addText(step, { x, y: 3.0, w: 1.35, h: 0.55, fontSize: 9, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    if (i < sportSteps.length - 1) {
      s.addText("›", { x: x + 1.36, y: 3.0, w: 0.15, h: 0.55, fontSize: 14, fontFace: "Calibri", color: C.MUTED, align: "center", valign: "middle", margin: 0 });
    }
  });

  const sportDescs = [
    "Admin creates sport tournament within festival",
    "Assign SportTeamCaptain per team",
    "Equal or manual credit distribution",
    "Pool filtered by gender rule",
    "Real-time sport auction arena",
    "Team purchase records, credit spend",
  ];
  sportDescs.forEach((desc, i) => {
    s.addText(desc, { x: 0.5 + i * 1.52, y: 3.62, w: 1.35, h: 0.55, fontSize: 8, fontFace: "Calibri", color: C.MUTED, align: "center", valign: "top", margin: 0 });
  });

  // Common infrastructure bar
  addCard(s, 0.5, 4.35, 9, 0.98, "F1F5F9");
  s.addText("Common Platform Infrastructure", { x: 0.5, y: 4.38, w: 9, h: 0.25, fontSize: 10, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, align: "center", margin: 0 });
  s.addText("JWT Authentication  ·  Role-Based Authorization  ·  Socket.IO Real-Time Engine  ·  Sequelize ORM  ·  MySQL Database  ·  Audit Logging", {
    x: 0.5, y: 4.65, w: 9, h: 0.62, fontSize: 10, fontFace: "Calibri", color: C.MUTED, align: "center", margin: 0,
  });

  s.addNotes("Both journeys converge on the same infrastructure layer at the bottom. Note that the Sport Tournament journey sits inside the Festival — a sport tournament can only exist within a festival and its participants are already registered festival attendees. This hierarchy is enforced in the data model.");
}

// ── SLIDE 8 — FESTIVAL AUCTION WORKFLOW ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Festival Auction");
  addSlideTitle(s, "Festival Auction Lifecycle");
  addDivider(s);

  const stages = [
    {
      name: "DRAFT", color: C.MUTED, bg: "F1F5F9",
      points: ["Festival record created", "Sports selected", "Settings configured", "No participants yet"],
    },
    {
      name: "SETUP", color: C.NAVY, bg: "EEF2FF",
      points: ["Employees imported", "Participants registered", "Teams created", "Owners provisioned", "Retentions configured"],
    },
    {
      name: "READY", color: C.GOLD, bg: "FFFBEB",
      points: ["All blockers resolved", "Config locked", "Auction pool generated", "Readiness check passed", "Launch available"],
    },
    {
      name: "LIVE", color: C.ORANGE, bg: "FFF7ED",
      points: ["Admin nominates participant", "Teams bid in real time", "Timer enforces bid window", "Sold / Unsold recorded", "Socket.IO broadcasts state"],
    },
    {
      name: "COMPLETED", color: C.SUCCESS, bg: "F0FDF4",
      points: ["All pool participants auctioned", "Final results stored", "Team rosters visible", "Bid history accessible", "Results page published"],
    },
  ];

  stages.forEach(({ name, color, bg, points }, i) => {
    const x = 0.35 + i * 1.88;
    addCard(s, x, 1.0, 1.72, 4.35, bg);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.0, w: 1.72, h: 0.44, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(name, { x, y: 1.0, w: 1.72, h: 0.44, fontSize: 11, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    points.forEach((pt, j) => {
      s.addText(`·  ${pt}`, { x: x + 0.1, y: 1.55 + j * 0.58, w: 1.52, h: 0.52, fontSize: 9.5, fontFace: "Calibri", color: C.DARK_TEXT, align: "left", valign: "top", margin: 0 });
    });
    if (i < stages.length - 1) {
      s.addText("→", { x: x + 1.73, y: 2.05, w: 0.14, h: 0.38, fontSize: 14, color: C.MUTED, align: "center", margin: 0 });
    }
  });

  s.addNotes("The festival lifecycle is strictly linear — an admin cannot jump from DRAFT to LIVE without passing through SETUP and READY. The readiness check at the READY gate validates: minimum teams, all owners assigned, auction pool generated, and at least one participant eligible. This gate is enforced in both the frontend UI and the backend readiness endpoint.");
}

// ── SLIDE 9 — SPORT TOURNAMENT WORKFLOW ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Sport Tournament Auction");
  addSlideTitle(s, "Sport Tournament Lifecycle");
  addDivider(s);

  const stages = [
    {
      name: "DRAFT", color: C.MUTED, bg: "F1F5F9",
      points: ["Tournament record created", "Linked to parent festival", "Sport type selected", "Initial config set"],
    },
    {
      name: "SETUP", color: C.TEAL, bg: "F0FDFA",
      points: ["Sport teams configured", "Captains assigned", "Budget distributed", "Gender rule set", "Pool eligibility defined"],
    },
    {
      name: "READY", color: C.GOLD, bg: "FFFBEB",
      points: ["Readiness blockers resolved", "Auction pool generated", "All captains confirmed", "Configuration locked", "Launch enabled"],
    },
    {
      name: "AUCTION LIVE", color: C.ORANGE, bg: "FFF7ED",
      points: ["Admin nominates athlete", "Captains bid in real time", "Credit budgets enforced", "Socket.IO push updates", "Revision guard active"],
    },
    {
      name: "COMPLETED", color: C.SUCCESS, bg: "F0FDF4",
      points: ["All pool athletes auctioned", "Final sport team rosters set", "Credit spend recorded", "Results page live", "History accessible"],
    },
  ];

  stages.forEach(({ name, color, bg, points }, i) => {
    const x = 0.35 + i * 1.88;
    addCard(s, x, 1.0, 1.72, 4.35, bg);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.0, w: 1.72, h: 0.44, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(name, { x, y: 1.0, w: 1.72, h: 0.44, fontSize: 10, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    points.forEach((pt, j) => {
      s.addText(`·  ${pt}`, { x: x + 0.1, y: 1.55 + j * 0.58, w: 1.52, h: 0.52, fontSize: 9.5, fontFace: "Calibri", color: C.DARK_TEXT, align: "left", valign: "top", margin: 0 });
    });
    if (i < stages.length - 1) {
      s.addText("→", { x: x + 1.73, y: 2.05, w: 0.14, h: 0.38, fontSize: 14, color: C.MUTED, align: "center", margin: 0 });
    }
  });

  s.addNotes("The sport tournament auction mirrors the festival lifecycle but operates at the participant level within a single sport. The credit budget (e.g., 200 credits per team) is distributed before the auction begins. The auction pool is generated from festival participants who are eligible for the tournament based on gender rules configured by the admin.");
}

// ── SLIDE 10 — LIVE AUCTION ENGINE ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Real-Time Engine");
  addSlideTitle(s, "Live Auction Engine — How It Works");
  addDivider(s);

  // Left: Socket architecture
  addCard(s, 0.5, 1.0, 4.4, 4.35);
  s.addText("Socket.IO Architecture", { x: 0.65, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.NAVY, margin: 0 });

  const socketItems = [
    ["join-festival-auction", "Client joins festival room"],
    ["join-sport-auction", "Client joins sport room"],
    ["auction-state", "Server pushes full state snapshot"],
    ["leave-festival-auction", "Client exits room on unmount"],
    ["Revision Guard", "shouldApplyAuctionSnapshot() prevents stale overwrites"],
    ["Reconnect Handler", "socket.on('connect', rejoin) re-enters room after drop"],
    ["Broadcast Scope", "Server filters broadcast to matching scopeType + scopeId"],
  ];

  socketItems.forEach(([key, desc], i) => {
    s.addText(key, { x: 0.65, y: 1.48 + i * 0.52, w: 1.7, h: 0.46, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.ROYAL, align: "left", valign: "top", margin: 0 });
    s.addText(desc, { x: 2.38, y: 1.48 + i * 0.52, w: 2.4, h: 0.46, fontSize: 9.5, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
    if (i < socketItems.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.65, y: 1.92 + i * 0.52, w: 3.85, h: 0.01, fill: { color: C.BORDER }, line: { color: C.BORDER, width: 0 } });
    }
  });

  // Right: bid engine features
  addCard(s, 5.1, 1.0, 4.4, 4.35);
  s.addText("Auction Controls & Validation", { x: 5.25, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.TEAL, margin: 0 });

  const bidItems = [
    ["Budget Enforcement", "Bids rejected if team budget < bid amount"],
    ["Minimum Increment", "Configurable minimum bid step (e.g. +5 credits)"],
    ["Timer Countdown", "Admin-controlled auction clock per participant"],
    ["Pause / Resume", "Admin can pause the entire auction at any point"],
    ["Extend Timer", "Admin can extend time for active participant"],
    ["Mark Unsold", "Admin marks participant unsold if no bids placed"],
    ["Re-Auction", "Admin can return a participant to the pool"],
    ["Toast Notifications", "Sold/unsold result shown to all roles instantly"],
  ];

  bidItems.forEach(([key, desc], i) => {
    s.addText(key, { x: 5.25, y: 1.48 + i * 0.52, w: 1.6, h: 0.46, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.TEAL, align: "left", valign: "top", margin: 0 });
    s.addText(desc, { x: 6.88, y: 1.48 + i * 0.52, w: 2.5, h: 0.46, fontSize: 9.5, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
    if (i < bidItems.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, { x: 5.25, y: 1.92 + i * 0.52, w: 3.85, h: 0.01, fill: { color: C.BORDER }, line: { color: C.BORDER, width: 0 } });
    }
  });

  s.addNotes("The revision guard is the key reliability mechanism. Every auction-state payload carries a monotonically increasing revision number. The client compares incoming revision to its lastRevision ref — if the incoming revision is not greater, the update is discarded. This prevents buffered or out-of-order socket events from overwriting newer in-memory state, which was a real defect fixed during Sport Tournament parity work.");
}

// ── SLIDE 11 — TECHNICAL ARCHITECTURE ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0D1B3E" };

  addEyebrow(s, "Technical Architecture");
  s.addText("System Architecture", {
    x: 0.5, y: 0.18, w: 9, h: 0.6,
    fontSize: 26, fontFace: "Cambria", bold: true,
    color: C.WHITE, align: "left", valign: "middle", margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.82, w: 9, h: 0.02, fill: { color: "1E3A5E" }, line: { color: "1E3A5E", width: 0 } });

  // Browser layer
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.0, y: 1.0, w: 4, h: 0.8, fill: { color: "1E3A8A" }, line: { color: "2563EB", width: 1 }, rectRadius: 0.1 });
  s.addText("🖥  Browser — React 19 SPA\nVite 6  ·  MUI 6  ·  React Router 7  ·  socket.io-client", {
    x: 3.0, y: 1.0, w: 4, h: 0.8, fontSize: 10, fontFace: "Calibri", color: C.WHITE, align: "center", valign: "middle", margin: 0,
  });

  // Arrows down
  s.addText("HTTPS REST /api/v1, /api/v2", { x: 0.6, y: 1.85, w: 3.8, h: 0.3, fontSize: 9, fontFace: "Calibri", color: C.GOLD, align: "center", margin: 0 });
  s.addText("WebSocket (Socket.IO)", { x: 5.6, y: 1.85, w: 3.8, h: 0.3, fontSize: 9, fontFace: "Calibri", color: "7DD3FC", align: "center", margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 5.0, y: 1.82, w: 0, h: 0.5, line: { color: "334155", width: 1, dashType: "dash" } });

  // API Server
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.5, y: 2.2, w: 7, h: 1.0, fill: { color: "0F2A50" }, line: { color: "1D4ED8", width: 1 }, rectRadius: 0.1 });
  s.addText("🖧  Node.js + Express 4 API Server\n", { x: 1.5, y: 2.2, w: 7, h: 0.35, fontSize: 11, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
  s.addText("JWT Auth Middleware  ·  Role Guards  ·  Zod Validation  ·  Socket.IO 4 Server  ·  Sequelize 6 ORM  ·  16+ Controllers", {
    x: 1.5, y: 2.56, w: 7, h: 0.56, fontSize: 9, fontFace: "Calibri", color: "94A3B8", align: "center", margin: 0,
  });

  // Arrow to DB
  s.addShape(pres.shapes.LINE, { x: 5.0, y: 3.22, w: 0, h: 0.5, line: { color: "334155", width: 1, dashType: "dash" } });
  s.addText("Sequelize ORM queries", { x: 5.1, y: 3.25, w: 2.5, h: 0.25, fontSize: 8, fontFace: "Calibri", color: C.GOLD, margin: 0 });

  // DB
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.0, y: 3.72, w: 4, h: 0.72, fill: { color: "064E3B" }, line: { color: "059669", width: 1 }, rectRadius: 0.1 });
  s.addText("🗄  MySQL / TiDB Database\n35+ Sequelize models  ·  Migrations  ·  Foreign keys  ·  Transactions", {
    x: 3.0, y: 3.72, w: 4, h: 0.72, fontSize: 9.5, fontFace: "Calibri", color: C.WHITE, align: "center", valign: "middle", margin: 0,
  });

  // Side: Email
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.5, y: 2.85, w: 2.2, h: 0.65, fill: { color: "1C1C3E" }, line: { color: "7C3AED", width: 1 }, rectRadius: 0.1 });
  s.addText("📧 Email\nNodemailer / SMTP", { x: 7.5, y: 2.85, w: 2.2, h: 0.65, fontSize: 9, fontFace: "Calibri", color: "C4B5FD", align: "center", valign: "middle", margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 8.5, y: 3.22, w: 0, h: -0.0, line: { color: "334155", width: 1 } });

  // Deployment row
  addCard(s, 0.5, 4.85, 4.3, 0.6, "0A1628");
  s.addText("Frontend → Vercel (static CDN)", { x: 0.5, y: 4.85, w: 4.3, h: 0.6, fontSize: 10, fontFace: "Calibri", color: "60A5FA", align: "center", valign: "middle", margin: 0 });
  addCard(s, 5.1, 4.85, 4.4, 0.6, "0A1628");
  s.addText("Backend → Render (Node.js service)", { x: 5.1, y: 4.85, w: 4.4, h: 0.6, fontSize: 10, fontFace: "Calibri", color: "34D399", align: "center", valign: "middle", margin: 0 });

  s.addNotes("The architecture is a classic client-server SPA. The critical design choice is that Socket.IO runs on the same Node.js process as the REST API — this means auction state broadcasts happen in-process without a message broker. This works at current scale. A Redis adapter would be added for horizontal scaling.");
}

// ── SLIDE 12 — DATABASE ARCHITECTURE ─────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Database Architecture");
  addSlideTitle(s, "Data Model — Key Entity Groups");
  addDivider(s);

  const groups = [
    { title: "Auth & Users", color: C.NAVY, x: 0.5, y: 1.0, w: 2.2, h: 1.5, models: ["User", "Employee", "PasswordResetToken"] },
    { title: "Festival System", color: C.ROYAL, x: 2.9, y: 1.0, w: 2.2, h: 1.5, models: ["Festival", "FestivalTeam", "FestivalParticipant", "FestivalTeamOwner", "FestivalOperationAudit"] },
    { title: "Festival Auction", color: C.ORANGE, x: 5.3, y: 1.0, w: 2.2, h: 1.5, models: ["FestivalAuction", "FestivalAuctionBid", "FestivalAuctionPool", "FestivalAuctionResult"] },
    { title: "Legacy Auction", color: C.MUTED, x: 7.7, y: 1.0, w: 1.9, h: 1.5, models: ["Tournament", "Team", "Player", "Auction", "Bid"] },
    { title: "Sport System", color: C.TEAL, x: 0.5, y: 2.7, w: 2.2, h: 1.65, models: ["SportTournament", "SportTeam", "SportTeamCaptain", "SportTeamBudget", "SportOperationAudit"] },
    { title: "Sport Auction", color: C.PURPLE, x: 2.9, y: 2.7, w: 2.2, h: 1.65, models: ["SportAuction", "SportAuctionBid", "SportAuctionPool", "SportAuctionResult", "AuctionConfig"] },
    { title: "Festival Config", color: "D97706", x: 5.3, y: 2.7, w: 2.2, h: 1.65, models: ["FestivalSportSetting", "FestivalTeamSportSetting", "FestivalAuctionRetention", "FestivalSetup"] },
    { title: "Shared / Misc", color: C.MUTED, x: 7.7, y: 2.7, w: 1.9, h: 1.65, models: ["AuctionDirectory", "SportTournamentDirectory", "Notification"] },
  ];

  groups.forEach(({ title, color, x, y, w, h, models }) => {
    addCard(s, x, y, w, h);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, fill: { color }, line: { color, width: 0 }, rectRadius: 0.08 });
    s.addText(title, { x, y, w, h: 0.32, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    models.forEach((m, i) => {
      s.addText(m, { x: x + 0.1, y: y + 0.38 + i * 0.24, w: w - 0.2, h: 0.22, fontSize: 8.5, fontFace: "Calibri", color: C.DARK_TEXT, margin: 0 });
    });
  });

  // Summary bar
  addCard(s, 0.5, 4.58, 9, 0.72, C.DARK_BG);
  s.addText("35+ Sequelize Models  ·  Full FK Relationships  ·  Soft Deletes via Paranoid Mode  ·  Database Transactions for Bid Atomicity  ·  Migrations for All Schema Changes", {
    x: 0.5, y: 4.58, w: 9, h: 0.72, fontSize: 10, fontFace: "Calibri", color: C.GOLD, align: "center", valign: "middle", margin: 0,
  });

  s.addNotes("The database has two parallel auction hierarchies — Festival and Sport — that share the User and Employee tables but have fully separate auction, bid, pool, and result tables. This separation means each auction type can evolve independently. The Legacy (v1) tournament system remains operational alongside the newer v2 Festival and Sport systems.");
}

// ── SLIDE 13 — TECHNOLOGY STACK ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Technology Stack");
  addSlideTitle(s, "Technology Stack");
  addDivider(s);

  const columns = [
    {
      title: "Frontend", icon: "🖥", color: C.NAVY, items: [
        ["React", "19.0.0", "UI rendering & state"],
        ["React Router", "7.4.0", "Client-side routing"],
        ["Material UI", "6.4.8", "Component library"],
        ["Vite", "6.2.0", "Build tool & dev server"],
        ["Axios", "1.8.4", "HTTP client"],
        ["socket.io-client", "4.8.1", "WebSocket client"],
        ["Emotion", "11.14.0", "CSS-in-JS for MUI"],
      ],
    },
    {
      title: "Backend", icon: "🖧", color: C.TEAL, items: [
        ["Node.js", "ES Modules", "Runtime (no CommonJS)"],
        ["Express", "4.x", "HTTP framework"],
        ["Socket.IO", "4.x", "WebSocket server"],
        ["Sequelize", "6.x", "ORM"],
        ["jsonwebtoken", "9.x", "JWT auth"],
        ["Zod", "3.x", "Request validation"],
        ["Nodemailer", "6.x", "Email delivery"],
        ["bcrypt", "5.x", "Password hashing"],
      ],
    },
    {
      title: "Database", icon: "🗄", color: C.SUCCESS, items: [
        ["MySQL", "8.x", "Primary database"],
        ["TiDB", "Compatible", "Cloud-compatible option"],
        ["Migrations", "Sequelize", "Schema versioning"],
        ["Transactions", "Sequelize", "Atomic bid writes"],
        ["FK Constraints", "InnoDB", "Referential integrity"],
      ],
    },
    {
      title: "Deployment", icon: "🚀", color: C.PURPLE, items: [
        ["Vercel", "Frontend", "Static CDN deployment"],
        ["Render", "Backend", "Node.js service hosting"],
        ["dotenv", "Config", "Environment variables"],
        ["CORS", "Configured", "Origin whitelisting"],
        ["ESLint", "9.x", "Frontend code quality"],
      ],
    },
  ];

  columns.forEach(({ title, icon, color, items }, col) => {
    const x = 0.5 + col * 2.38;
    addCard(s, x, 1.0, 2.2, 4.35);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.0, w: 2.2, h: 0.44, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(`${icon}  ${title}`, { x, y: 1.0, w: 2.2, h: 0.44, fontSize: 12, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    items.forEach(([lib, ver, desc], i) => {
      s.addText(lib, { x: x + 0.1, y: 1.52 + i * 0.42, w: 1.1, h: 0.18, fontSize: 9, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });
      s.addText(ver, { x: x + 0.1, y: 1.7 + i * 0.42, w: 2.0, h: 0.16, fontSize: 8, fontFace: "Calibri", color: color, margin: 0 });
    });
  });

  s.addNotes("All version numbers are exact — sourced directly from package.json files in the repository. The choice of React 19 and React Router 7 represents the current major release stream. Node.js uses ES Module syntax throughout the backend — no require() calls exist in the backend source.");
}

// ── SLIDE 14 — PROJECT PLAN & MILESTONES ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Project Plan");
  addSlideTitle(s, "Development Phases & Milestones");
  addDivider(s);

  const phases = [
    { phase: "Phase 1", label: "Foundation", status: "✓", color: C.SUCCESS, items: "JWT Auth · Email verification · Role model · React scaffold" },
    { phase: "Phase 2", label: "Legacy Auction", status: "✓", color: C.SUCCESS, items: "Teams · Players · Tournaments · Bids · Basic Socket.IO" },
    { phase: "Phase 3", label: "Festival Module", status: "✓", color: C.SUCCESS, items: "Festival CRUD · Participants · Teams · Owner provisioning · Audit log" },
    { phase: "Phase 4A-B", label: "Festival Auction Engine", status: "✓", color: C.SUCCESS, items: "Auction lifecycle · Bidding · Retentions · Socket.IO rooms · Arena UI" },
    { phase: "Phase 4C-D", label: "Festival Polish", status: "✓", color: C.SUCCESS, items: "Command center · Setup wizard · Readiness check · Config lock · Bug fixes" },
    { phase: "Phase 4E", label: "Sport Module", status: "✓", color: C.SUCCESS, items: "Sport tournament · Teams · Captains · Budgets · Sport auction arena" },
    { phase: "Phase 4E+", label: "Product Polish", status: "✓", color: C.SUCCESS, items: "AuctionDirectory · AuctionHub · Product language audit · AppShell nav" },
    { phase: "Phase 5", label: "Sport Parity", status: "⟳", color: C.GOLD, items: "Readiness fetch · Socket reconnect · Revision guard · Results page · Stability" },
    { phase: "M11", label: "Production Hardening", status: "○", color: C.MUTED, items: "Socket auth · Rate limiting · HTTPS cookies · Structured logging · Auto tests" },
  ];

  phases.forEach(({ phase, label, status, color, items }, i) => {
    const y = 1.0 + i * 0.49;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 0.9, h: 0.4, fill: { color }, line: { color, width: 0 }, rectRadius: 0.08 });
    s.addText(status, { x: 0.5, y, w: 0.9, h: 0.4, fontSize: 12, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(phase, { x: 1.5, y: y + 0.02, w: 1.0, h: 0.2, fontSize: 9, fontFace: "Calibri", bold: true, color: color, margin: 0 });
    s.addText(label, { x: 1.5, y: y + 0.2, w: 1.5, h: 0.18, fontSize: 8.5, fontFace: "Calibri", color: C.MUTED, margin: 0 });
    s.addText(items, { x: 3.1, y: y + 0.06, w: 6.6, h: 0.3, fontSize: 9.5, fontFace: "Calibri", color: C.DARK_TEXT, valign: "middle", margin: 0 });
  });

  s.addNotes("Phases 1 through 4E+ are all complete. Phase 5 Sport Parity work is substantially complete — the demo-critical items (readiness fetch, socket reconnect, revision guard, results page rewrite, LoadingStateCard, Promise.allSettled) were all implemented. M11 Production Hardening items are planned post-submission.");
}

// ── SLIDE 15 — SOURCE CODE & ENGINEERING PRACTICES ───────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Engineering Practices");
  addSlideTitle(s, "Source Code & Repository Quality");
  addDivider(s);

  // Metrics grid
  const metrics = [
    { val: "235+", label: "Source Files" },
    { val: "20+", label: "React Pages" },
    { val: "50+", label: "React Components" },
    { val: "35+", label: "Sequelize Models" },
    { val: "90+", label: "REST Endpoints" },
    { val: "50+", label: "Documentation Files" },
  ];

  metrics.forEach(({ val, label }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05;
    const y = 1.0 + row * 1.15;
    addCard(s, x, y, 2.9, 1.0);
    s.addText(val, { x, y: y + 0.08, w: 2.9, h: 0.5, fontSize: 30, fontFace: "Cambria", bold: true, color: C.NAVY, align: "center", margin: 0 });
    s.addText(label, { x, y: y + 0.6, w: 2.9, h: 0.32, fontSize: 11, fontFace: "Calibri", color: C.MUTED, align: "center", margin: 0 });
  });

  // Practices
  const practices = [
    { title: "ES Modules", body: "Backend uses ES module syntax throughout — no require() calls in source." },
    { title: "Zod Validation", body: "All API request bodies validated with Zod schemas at the route layer." },
    { title: "Transaction Safety", body: "All bid writes and auction state changes wrapped in Sequelize transactions." },
    { title: "Audit Logging", body: "FestivalOperationAudit and SportOperationAudit track admin actions." },
    { title: "Revision Guards", body: "shouldApplyAuctionSnapshot() prevents stale socket payloads overwriting state." },
    { title: "Component Reuse", body: "Festival and Sport arenas share sub-component patterns; auctionStages.js is shared." },
  ];

  practices.forEach(({ title, body }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05;
    const y = 3.4 + row * 1.08;
    addCard(s, x, y, 2.9, 0.98);
    s.addText(title, { x: x + 0.15, y: y + 0.1, w: 2.6, h: 0.25, fontSize: 11, fontFace: "Calibri", bold: true, color: C.TEAL, margin: 0 });
    s.addText(body, { x: x + 0.15, y: y + 0.36, w: 2.6, h: 0.55, fontSize: 9.5, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("These are all verifiable facts from the codebase — not aspirational statements. The Zod validation, transaction safety, audit logging, and revision guards are present in the deployed code. ESLint is configured for the frontend. The backend has no linting configured — this is an acknowledged gap.");
}

// ── SLIDE 16 — AI USAGE & METRICS ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "AI-Assisted Development");
  addSlideTitle(s, "AI Usage & Development Metrics");
  addDivider(s);

  // AI tools row
  const tools = [
    { name: "Claude Code", org: "Anthropic", color: C.NAVY, bg: "EEF2FF", uses: ["Feature implementation", "Architecture design", "Code generation & review", "Product audits & UX review", "Documentation generation", "Security reviews"] },
    { name: "ChatGPT", org: "OpenAI", color: C.TEAL, bg: "F0FDFA", uses: ["System design consultation", "Technical troubleshooting", "Database design validation", "Deployment guidance", "Performance optimization", "UX recommendations"] },
    { name: "Codex", org: "OpenAI", color: C.PURPLE, bg: "FAF5FF", uses: ["Code generation", "Bug fixing", "Refactoring support", "Repository analysis", "Migration generation", "Audit findings"] },
  ];

  tools.forEach(({ name, org, color, bg, uses }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 1.0, 2.9, 2.65, bg);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.0, w: 2.9, h: 0.38, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(`${name}  ·  ${org}`, { x, y: 1.0, w: 2.9, h: 0.38, fontSize: 11, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    uses.forEach((u, j) => {
      s.addText(`›  ${u}`, { x: x + 0.15, y: 1.46 + j * 0.35, w: 2.6, h: 0.3, fontSize: 9.5, fontFace: "Calibri", color: C.DARK_TEXT, margin: 0 });
    });
  });

  // Productivity metrics table
  const metricsData = [
    ["Metric", "Without AI", "With AI", "Reduction"],
    ["Development Time", "6–9 months", "~3 months", "50–70%"],
    ["Documentation Effort", "High", "Automated alongside dev", "80–90%"],
    ["Boilerplate Code", "Manual", "AI-generated & reviewed", "70–80%"],
    ["Audit & Review Cycles", "Manual only", "AI-assisted audits", "60–70%"],
    ["LOC (Total)", "~35,000", "~22,600 in source", "35% tighter"],
  ];

  s.addTable(metricsData.map((row, ri) =>
    row.map((cell, ci) => ({
      text: cell,
      options: {
        bold: ri === 0,
        fontSize: ri === 0 ? 9 : 9,
        color: ri === 0 ? C.WHITE : (ci === 3 ? C.SUCCESS : C.DARK_TEXT),
        fill: { color: ri === 0 ? C.NAVY : (ri % 2 === 0 ? "F8FAFC" : C.WHITE) },
        align: ci === 0 ? "left" : "center",
      },
    }))
  ), {
    x: 0.5, y: 3.85, w: 9, h: 1.55,
    colW: [2.8, 2.0, 2.5, 1.7],
    border: { pt: 0.5, color: C.BORDER },
  });

  s.addNotes("Claude Code was the primary AI tool — it generated code, reviewed it, audited parity gaps, and produced documentation. ChatGPT provided advisory and architecture validation. All AI output was reviewed, tested, and approved by the developer before integration. AI never had direct access to production systems or credentials.");
}

// ── SLIDE 17 — TESTING & QUALITY ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Testing & Quality");
  addSlideTitle(s, "Testing Strategy & Quality Assurance");
  addDivider(s);

  // Left — honest status
  addCard(s, 0.5, 1.0, 4.4, 4.35);
  s.addText("Testing Status (Honest Assessment)", { x: 0.65, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });

  const testItems = [
    ["Automated Unit Tests", "○", "Not implemented (acknowledged technical debt)", C.RED],
    ["Integration Tests", "○", "Infrastructure ready (node --test) — no test files written yet", C.ORANGE],
    ["End-to-End Tests", "○", "Not implemented — planned for post-submission", C.ORANGE],
    ["ESLint (Frontend)", "✓", "Configured with react-hooks & react-refresh plugins", C.SUCCESS],
    ["Manual Testing", "✓", "Performed across all features throughout development", C.SUCCESS],
    ["Stabilisation Audits", "✓", "Multiple AI-assisted audit cycles reviewing parity & correctness", C.SUCCESS],
    ["Security Review", "✓", "Auth, authorisation, input validation, injection risk reviewed", C.SUCCESS],
  ];

  testItems.forEach(([area, status, desc, color], i) => {
    s.addText(status, { x: 0.65, y: 1.48 + i * 0.52, w: 0.3, h: 0.46, fontSize: 13, color, align: "center", margin: 0 });
    s.addText(area, { x: 1.0, y: 1.48 + i * 0.52, w: 1.5, h: 0.22, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });
    s.addText(desc, { x: 1.0, y: 1.68 + i * 0.52, w: 3.8, h: 0.22, fontSize: 8.5, fontFace: "Calibri", color: C.MUTED, margin: 0 });
  });

  // Right — manual coverage areas
  addCard(s, 5.1, 1.0, 4.4, 4.35, "F0FDF4");
  s.addText("Manual Testing Coverage", { x: 5.25, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.SUCCESS, margin: 0 });

  const coverage = [
    "Authentication (register, login, verify, reset, change password)",
    "JWT expiry and role-based route guards",
    "Festival creation, participant import, team setup",
    "Festival auction start, bid, sold, unsold, complete",
    "Sport tournament setup, readiness, captain assignment",
    "Sport auction live bidding and real-time updates",
    "Socket.IO room join/leave and state synchronisation",
    "Budget enforcement — bids rejected over budget cap",
    "Multi-role: admin controls, owner bids, spectator read-only",
    "Results pages, bid history, team roster views",
  ];

  coverage.forEach((item, i) => {
    s.addText(`✓  ${item}`, { x: 5.25, y: 1.48 + i * 0.4, w: 4.1, h: 0.35, fontSize: 9, fontFace: "Calibri", color: C.DARK_TEXT, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("Be transparent about the lack of automated tests. The testing infrastructure is in place (node --test runner is configured) but no test files were written. The honest framing is: the product was manually tested thoroughly across all workflows. Automated tests are the highest priority for the next development phase.");
}

// ── SLIDE 18 — PERFORMANCE OPTIMIZATION ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Performance & Stability");
  addSlideTitle(s, "Performance Optimization Journey");
  addDivider(s);

  const items = [
    {
      title: "Promise.all → Promise.allSettled",
      issue: "A single failing sub-request (e.g. auction not configured) blocked the entire page load via Promise.all rejection.",
      fix: "Converted all multi-endpoint page loaders to Promise.allSettled. Each endpoint succeeds or fails independently.",
      impact: "Pages now load partially when non-critical endpoints fail. No more white screens on 404 from unconfigured auctions.",
      color: C.NAVY,
    },
    {
      title: "Socket Reconnect Handler",
      issue: "After a network disconnect, SportAuctionHub silently stopped receiving real-time updates with no recovery.",
      fix: "Added socket.on('connect', rejoin) + if (socket.connected) rejoin() pattern on mount.",
      impact: "Auction clients automatically re-join their room after any network interruption — zero manual refresh needed.",
      color: C.TEAL,
    },
    {
      title: "Revision Guard (shouldApplyAuctionSnapshot)",
      issue: "Out-of-order or buffered socket payloads with older revisions could overwrite newer in-memory auction state.",
      fix: "Added revision comparison before applying any socket payload. lastRevision ref tracks highest seen revision.",
      impact: "Stale payloads silently discarded. Auction state remains consistent regardless of packet ordering.",
      color: C.PURPLE,
    },
    {
      title: "Sport Tournament Visibility Fix",
      issue: "Spectators only saw live/completed tournaments. Team owners only saw their own team's tournaments. Setup-stage hidden.",
      fix: "Changed listSportTournaments to use FestivalParticipant → festivalId → FestivalTeam join. All registered users see all tournaments in their festival.",
      impact: "All roles now see all tournaments within their festival from day one of setup, not just after launch.",
      color: C.SUCCESS,
    },
  ];

  items.forEach(({ title, issue, fix, impact, color }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.75;
    const y = 1.0 + row * 2.18;
    addCard(s, x, y, 4.45, 2.05);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.45, h: 0.32, fill: { color }, line: { color, width: 0 }, rectRadius: 0.08 });
    s.addText(title, { x, y, w: 4.45, h: 0.32, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText("Issue: ", { x: x + 0.12, y: y + 0.38, w: 0.5, h: 0.18, fontSize: 8.5, fontFace: "Calibri", bold: true, color: C.RED, margin: 0 });
    s.addText(issue, { x: x + 0.6, y: y + 0.36, w: 3.73, h: 0.38, fontSize: 8.5, fontFace: "Calibri", color: C.DARK_TEXT, margin: 0 });
    s.addText("Fix: ", { x: x + 0.12, y: y + 0.78, w: 0.4, h: 0.18, fontSize: 8.5, fontFace: "Calibri", bold: true, color: C.ROYAL, margin: 0 });
    s.addText(fix, { x: x + 0.5, y: y + 0.76, w: 3.83, h: 0.44, fontSize: 8.5, fontFace: "Calibri", color: C.DARK_TEXT, margin: 0 });
    s.addText("Impact: ", { x: x + 0.12, y: y + 1.24, w: 0.55, h: 0.18, fontSize: 8.5, fontFace: "Calibri", bold: true, color: C.SUCCESS, margin: 0 });
    s.addText(impact, { x: x + 0.65, y: y + 1.22, w: 3.68, h: 0.72, fontSize: 8.5, fontFace: "Calibri", color: C.MUTED, margin: 0 });
  });

  s.addNotes("These four optimisations were all implemented as part of the Sport Parity phase. Each one was discovered through an AI-assisted audit that compared the Sport Tournament implementation against the Festival reference implementation. The audit document (SPORT_PARITY_AUDIT.md) listed these as High priority items.");
}

// ── SLIDE 19 — DEMO WALKTHROUGH ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Demo");
  addSlideTitle(s, "Demo Walkthrough — Step by Step");
  addDivider(s);

  const steps = [
    { n: "01", label: "Login", desc: "Log in as admin. Show dashboard with festival and sport tournament cards.", role: "Admin" },
    { n: "02", label: "Festival Dashboard", desc: "Navigate to Festival list. Show active festival with sport selections.", role: "Admin" },
    { n: "03", label: "Festival Setup", desc: "Open Festival Command Center. Show readiness check with blockers and setup progress chips.", role: "Admin" },
    { n: "04", label: "Festival Live Auction", desc: "Enter Festival Auction Arena. Show participant stage, team panels, live bid stream and timer.", role: "Admin" },
    { n: "05", label: "Team Owner Bidding", desc: "Open second browser as team_owner. Show canBid controls, place a bid, watch real-time update.", role: "Owner" },
    { n: "06", label: "Sold Toast", desc: "Complete participant auction. Show Snackbar notification (sold/unsold) on all three role screens.", role: "All" },
    { n: "07", label: "Sport Tournament Setup", desc: "Navigate to Sport Tournament. Show Command Center with progress chips and readiness status.", role: "Admin" },
    { n: "08", label: "Sport Auction Arena", desc: "Enter Sport Auction Arena as captain. Show credit budgets, bid on athlete, socket update.", role: "Captain" },
    { n: "09", label: "Results", desc: "Navigate to Sport Auction Results page. Show sold/unsold table, summary chips, AuctionContextNavigation.", role: "All" },
  ];

  steps.forEach(({ n, label, desc, role }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05;
    const y = 1.0 + row * 1.5;
    const roleColor = role === "Admin" ? C.NAVY : role === "Owner" ? C.TEAL : role === "Captain" ? C.PURPLE : C.SUCCESS;
    addCard(s, x, y, 2.9, 1.38);
    s.addText(n, { x, y: y + 0.05, w: 0.55, h: 0.5, fontSize: 22, fontFace: "Cambria", bold: true, color: C.GOLD, align: "center", margin: 0 });
    s.addText(label, { x: x + 0.56, y: y + 0.1, w: 2.2, h: 0.28, fontSize: 12, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.56, y: y + 0.4, w: 0.75, h: 0.2, fill: { color: roleColor }, line: { color: roleColor, width: 0 }, rectRadius: 0.1 });
    s.addText(role, { x: x + 0.56, y: y + 0.4, w: 0.75, h: 0.2, fontSize: 7.5, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(desc, { x: x + 0.12, y: y + 0.67, w: 2.66, h: 0.65, fontSize: 9, fontFace: "Calibri", color: C.MUTED, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("Open two browser windows before the demo — one as admin, one as team_owner. This makes steps 5 and 6 (bidding + real-time sync) dramatically impactful when the audience sees both screens update simultaneously. Have a festival already in LIVE stage to save setup time during the demo.");
}

// ── SLIDE 20 — PROMPT LIBRARY ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "AI Development Approach");
  addSlideTitle(s, "Prompt Engineering — Categories & Examples");
  addDivider(s);

  const categories = [
    {
      title: "Architecture Prompts", color: C.NAVY, icon: "🏗",
      example: "\"Design the auction state synchronisation model. The server should push snapshots, not deltas. Clients must handle out-of-order delivery. Propose the revision guard mechanism.\"",
    },
    {
      title: "Audit Prompts", color: C.ORANGE, icon: "🔍",
      example: "\"Review Sport Tournament against Festival as reference. For each of these 12 areas, identify gaps, severity, and the specific fix needed: setup, status, command center, arena, hub, results...\"",
    },
    {
      title: "Implementation Prompts", color: C.TEAL, icon: "⚙",
      example: "\"Implement readiness fetch in SportAuctionHub. Follow the same pattern as FestivalAuctionHub. Use Promise.allSettled. Add lastRevision ref. Add socket reconnect handler. Do not touch Festival code.\"",
    },
    {
      title: "Refactoring Prompts", color: C.PURPLE, icon: "♻",
      example: "\"SportAuctionResultsPage is a 5-line stub. Rewrite it as a full standalone page following FestivalAuctionResultsPage. Route param is :id. Use the same stage guard pattern.\"",
    },
    {
      title: "Documentation Prompts", color: C.SUCCESS, icon: "📄",
      example: "\"Review the entire codebase including all phase reports, audit documents, and source files. Produce a complete PRD covering executive summary, user personas, all role capabilities, and success metrics.\"",
    },
  ];

  categories.forEach(({ title, color, icon, example }, i) => {
    const x = 0.5;
    const y = 1.05 + i * 0.9;
    addCard(s, x, y, 9, 0.83);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.0, h: 0.83, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(`${icon}  ${title}`, { x, y, w: 2.0, h: 0.83, fontSize: 10.5, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(example, { x: 2.2, y: y + 0.1, w: 7.1, h: 0.65, fontSize: 9.5, fontFace: "Calibri", color: C.DARK_TEXT, italic: true, align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("Structured, constraint-heavy prompts produced significantly better results than open-ended ones. Key patterns: always specify what NOT to touch (e.g. 'do not touch Festival code'), reference the existing working implementation as the pattern to follow, and specify the exact file and route parameters. This reduced hallucinated API paths to near zero.");
}

// ── SLIDE 21 — CHALLENGES & LEARNINGS ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Challenges & Learnings");
  addSlideTitle(s, "Challenges Faced & Lessons Learned");
  addDivider(s);

  // Left: Challenges
  addCard(s, 0.5, 1.0, 4.4, 4.35);
  s.addText("Key Challenges", { x: 0.65, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.RED, margin: 0 });

  const challenges = [
    ["Real-Time State Consistency", "Buffered socket payloads with stale revisions overwrote newer state. Solved with revision guard."],
    ["Dual Auction System Parity", "Sport Tournament shipped without readiness fetch, reconnect handler, and results page. Required dedicated parity audit."],
    ["Role Visibility Bugs", "Spectators couldn't see sport tournaments in SETUP stage. Root cause: over-restrictive backend filtering by role + status."],
    ["Promise.all Fragility", "One 404 (unconfigured auction) crashed the entire page load. Required systematic audit and Promise.allSettled migration."],
    ["Fragment Import Error", "Fragment imported from MUI instead of React caused a runtime crash. Clear from the error message but subtle to introduce."],
    ["Context Window Limits", "Long development sessions required careful context management to maintain AI accuracy across phases."],
  ];

  challenges.forEach(([title, body], i) => {
    s.addText(title, { x: 0.65, y: 1.48 + i * 0.64, w: 4.1, h: 0.22, fontSize: 10, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });
    s.addText(body, { x: 0.65, y: 1.7 + i * 0.64, w: 4.1, h: 0.36, fontSize: 9, fontFace: "Calibri", color: C.MUTED, margin: 0 });
  });

  // Right: Learnings
  addCard(s, 5.1, 1.0, 4.4, 4.35, "F0FDF4");
  s.addText("Lessons Learned", { x: 5.25, y: 1.08, w: 4.1, h: 0.3, fontSize: 12, fontFace: "Calibri", bold: true, color: C.SUCCESS, margin: 0 });

  const learnings = [
    ["Audit-Driven Development Works", "Running formal parity audits at phase boundaries caught more defects than ad-hoc reviews. Write the audit brief first."],
    ["Constraint Prompts > Open Prompts", "\"Don't touch Festival code, follow FestivalAuctionHub as the reference\" produced far better results than open-ended requests."],
    ["Human Review is Non-Negotiable", "AI never detected runtime-only bugs. Every integration required manual testing. AI accelerates, not replaces, engineering."],
    ["Document as You Build", "AI-assisted documentation written alongside code was far better than documentation written retrospectively from memory."],
    ["Iterative Stabilisation", "Rather than one big release, phased stabilisation (4A, 4B, 4C...) kept quality manageable and bugs isolated."],
    ["Architecture First", "Agreeing on the revision guard mechanism and Socket.IO room model before implementation prevented several redesigns."],
  ];

  learnings.forEach(([title, body], i) => {
    s.addText(title, { x: 5.25, y: 1.48 + i * 0.64, w: 4.1, h: 0.22, fontSize: 10, fontFace: "Calibri", bold: true, color: C.DARK_TEXT, margin: 0 });
    s.addText(body, { x: 5.25, y: 1.7 + i * 0.64, w: 4.1, h: 0.36, fontSize: 9, fontFace: "Calibri", color: C.MUTED, margin: 0 });
  });

  s.addNotes("The revision guard bug and the role visibility bug were both discovered through AI-assisted audits — not during initial development. This validates the audit-driven approach: building the feature is phase one, auditing the feature against a reference is phase two. Both phases are necessary.");
}

// ── SLIDE 22 — FUTURE ROADMAP ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.LIGHT_BG };

  addEyebrow(s, "Roadmap");
  addSlideTitle(s, "Future Roadmap — Realistic Next Steps");
  addDivider(s);

  const phases = [
    {
      phase: "Phase 1 — Production Hardening", color: C.NAVY,
      items: [
        "Socket.IO authentication middleware — validate JWT on WebSocket connection",
        "HTTP-only cookie storage for JWT — remove localStorage auth vulnerability",
        "Rate limiting on bid submission endpoints",
        "Structured logging (Winston / Pino) replacing console.log",
        "CORS origin whitelist enforcement in production",
        "Backend ESLint configuration",
      ],
    },
    {
      phase: "Phase 2 — Automated Testing", color: C.TEAL,
      items: [
        "Integration tests for authentication flows (register, verify, login, reset)",
        "API tests for auction lifecycle (start, bid, sold, unsold, complete)",
        "Socket.IO event tests for real-time state propagation",
        "Authorization boundary tests (admin-only routes, owner-only bid)",
        "Budget enforcement tests (bids rejected over cap)",
        "React Testing Library component tests for arena UI",
      ],
    },
    {
      phase: "Phase 3 — Product Enhancements", color: C.PURPLE,
      items: [
        "Email notifications to team owners when they win a player",
        "CSV export for final team rosters and bid histories",
        "Bid history participant name search (in progress — SportAuctionHub)",
        "Mobile-responsive layout improvements for arena pages",
        "Admin dashboard analytics (spend distribution, avg bid per team)",
        "Deep-link support — direct URL to specific auction tab sections",
      ],
    },
  ];

  phases.forEach(({ phase, color, items }, i) => {
    const x = 0.5 + i * 3.05;
    addCard(s, x, 1.0, 2.9, 4.35);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.0, w: 2.9, h: 0.4, fill: { color }, line: { color, width: 0 }, rectRadius: 0.1 });
    s.addText(phase, { x, y: 1.0, w: 2.9, h: 0.4, fontSize: 9.5, fontFace: "Calibri", bold: true, color: C.WHITE, align: "center", valign: "middle", margin: 0 });
    items.forEach((item, j) => {
      s.addText(`›  ${item}`, { x: x + 0.12, y: 1.48 + j * 0.56, w: 2.66, h: 0.5, fontSize: 9, fontFace: "Calibri", color: C.DARK_TEXT, align: "left", valign: "top", margin: 0 });
    });
  });

  s.addNotes("All three roadmap phases are grounded in actual TODO.md items and SPORT_PARITY_AUDIT.md medium/low priority findings from the repository. None of these are invented features. The Competition Engine module mentioned in some early planning documents has been removed from scope — it was never implemented.");
}

// ── SLIDE 23 — CONCLUSION ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.DARK_BG };

  s.addShape(pres.shapes.OVAL, { x: -1, y: -1, w: 5, h: 5, fill: { color: C.GOLD, transparency: 90 }, line: { color: C.GOLD, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 7, y: 2.5, w: 4, h: 4, fill: { color: C.ROYAL, transparency: 85 }, line: { color: C.ROYAL, width: 0 } });

  s.addText("What We Delivered", { x: 0.7, y: 0.25, w: 8.5, h: 0.5, fontSize: 22, fontFace: "Calibri", color: C.GOLD, bold: true, align: "left", margin: 0 });
  s.addText("AuctionArena", { x: 0.7, y: 0.75, w: 8.5, h: 0.9, fontSize: 46, fontFace: "Cambria", bold: true, color: C.WHITE, align: "left", margin: 0 });

  const achievements = [
    { icon: "🏟", label: "Festival Auction System", desc: "Full lifecycle: Draft → Setup → Ready → Live → Completed. Multi-team bidding with budget enforcement and retention picks." },
    { icon: "🏆", label: "Sport Tournament System", desc: "Parallel auction system within festivals. Credit budgets, gender eligibility, captain bidding, real-time updates." },
    { icon: "⚡", label: "Real-Time Auction Engine", desc: "Socket.IO rooms, revision-guarded state, reconnect handlers, role-based controls, toast notifications." },
    { icon: "🔐", label: "Multi-Role Platform", desc: "Admin, team_owner, spectator — enforced at every API endpoint with JWT middleware and domain-level checks." },
    { icon: "📄", label: "Comprehensive Documentation", desc: "8 deliverable documents: PRD, Architecture Blueprint, Project Plan, Audit, AI Metrics, Testing Report, README, Presentation." },
    { icon: "🤖", label: "AI-Assisted Development", desc: "3-month delivery vs 6–9 month estimate. Claude Code + ChatGPT + Codex as force multipliers with full human review." },
  ];

  achievements.forEach(({ icon, label, desc }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.15;
    const y = 2.0 + row * 1.48;
    addCard(s, x, y, 2.95, 1.35, "0D2247");
    s.addText(icon, { x, y: y + 0.06, w: 0.5, h: 0.5, fontSize: 18, align: "center", margin: 0 });
    s.addText(label, { x: x + 0.52, y: y + 0.1, w: 2.3, h: 0.28, fontSize: 10.5, fontFace: "Calibri", bold: true, color: C.GOLD, margin: 0 });
    s.addText(desc, { x: x + 0.12, y: y + 0.44, w: 2.71, h: 0.84, fontSize: 8.5, fontFace: "Calibri", color: "94A3B8", align: "left", valign: "top", margin: 0 });
  });

  s.addNotes("Summarise by returning to the original problem: employee sports day auctions on spreadsheets and whiteboards. AuctionArena replaces that with a production-grade, browser-based, real-time system delivered in three months with AI-assisted development. All six achievement areas are complete and in the codebase.");
}

// ── SLIDE 24 — Q&A ───────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.DARK_BG };

  s.addShape(pres.shapes.OVAL, { x: 3, y: 0.5, w: 4, h: 4, fill: { color: C.GOLD, transparency: 92 }, line: { color: C.GOLD, width: 0 } });

  s.addText("Thank You", { x: 0.7, y: 0.8, w: 8.5, h: 0.85, fontSize: 48, fontFace: "Cambria", bold: true, color: C.WHITE, align: "center", margin: 0 });
  s.addText("Questions & Answers", { x: 0.7, y: 1.7, w: 8.5, h: 0.45, fontSize: 20, fontFace: "Calibri", color: C.GOLD, align: "center", margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 2.3, w: 3, h: 0.02, fill: { color: "1E3A5E" }, line: { color: "1E3A5E", width: 0 } });

  s.addText([
    { text: "Developer: Vamsi Ayiluri", options: { breakLine: true } },
    { text: "Email: alluripranithavarma@gmail.com", options: { breakLine: true } },
    { text: "Repository: AuctionArena · Full-Stack Real-Time Auction Platform" },
  ], {
    x: 0.7, y: 2.65, w: 8.5, h: 0.95,
    fontSize: 13, fontFace: "Calibri", color: "ADBCE6", align: "center", margin: 0,
  });

  s.addText("Festival Auction  ·  Sport Tournament Auction  ·  Real-Time Engine  ·  Multi-Role  ·  AI-Assisted", {
    x: 0.7, y: 3.85, w: 8.5, h: 0.35, fontSize: 10, fontFace: "Calibri", color: "4B6FA0", align: "center", margin: 0,
  });

  s.addNotes("Common questions to prepare for: 1) Why no automated tests? — Honest answer: acknowledged tech debt, infrastructure is ready, implementation is phase 1 post-submission. 2) How does Socket.IO scale? — Current single-node setup works for company-scale events; Redis adapter is the scaling path. 3) What AI tool was used most? — Claude Code for implementation and audits; ChatGPT for architecture advisory.");
}

// ── WRITE FILE ────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "Deliverables/FINAL_PRESENTATION_DECK.pptx" })
  .then(() => console.log("✅  FINAL_PRESENTATION_DECK.pptx written successfully"))
  .catch((e) => { console.error("❌  Error writing pptx:", e); process.exit(1); });
