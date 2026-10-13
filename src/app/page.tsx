"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { WarehouseObject } from "./components/WarehouseScene";
import { DEFAULT_WAREHOUSE_LAYOUT, DEFAULT_WAREHOUSE_SETTINGS, isWarehouseLayout, isWarehouseSettings, migrateWarehouseLayout, WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY, WAREHOUSE_LAYOUT_STORAGE_KEY, WAREHOUSE_SETTINGS_STORAGE_KEY, type WarehouseLayoutItem, type WarehouseSettings } from "./components/warehouse-layout";

const WarehouseScene = dynamic(() => import("./components/WarehouseScene"), {
  ssr: false,
  loading: () => <div className="warehouse-loading" role="status">Loading 3D warehouse...</div>,
});

const kpis = [
  { label: "Total orders", value: "1,284", delta: "+12.4%", detail: "vs last week", tone: "emerald" },
  { label: "Active orders", value: "286", delta: "+8.7%", detail: "26 awaiting allocation", tone: "sky" },
  { label: "Inventory health", value: "94.2%", delta: "+1.8%", detail: "2 low-stock SKUs", tone: "amber" },
  { label: "On-time delivery", value: "96.8%", delta: "+2.1%", detail: "17 delayed routes", tone: "violet" },
];

const warehouseZones = [
  { name: "Inbound", used: 82, capacity: 120, tone: "emerald" },
  { name: "Fast move", used: 68, capacity: 110, tone: "sky" },
  { name: "Cold chain", used: 54, capacity: 90, tone: "violet" },
  { name: "Returns", used: 39, capacity: 80, tone: "amber" },
];

const orderRows = [
  { id: "SO-18472", customer: "Apex Retail", items: 26, status: "Picking", eta: "Today, 14:10", value: "$8,420" },
  { id: "SO-18461", customer: "Northwind Foods", items: 14, status: "Packed", eta: "Today, 13:40", value: "$4,860" },
  { id: "SO-18448", customer: "Vanta Medical", items: 9, status: "Allocated", eta: "Today, 12:15", value: "$2,990" },
  { id: "SO-18437", customer: "BluePeak Home", items: 31, status: "Transit", eta: "Today, 16:30", value: "$10,740" },
];

const deliveryRows = [
  { route: "R-2047", city: "Denver", status: "In route", driver: "M. Kelly", eta: "18 min" },
  { route: "R-2041", city: "Phoenix", status: "Delayed", driver: "S. Ortiz", eta: "41 min" },
  { route: "R-2038", city: "Austin", status: "Loaded", driver: "L. Chen", eta: "Next window" },
  { route: "R-2029", city: "Dallas", status: "Complete", driver: "J. Park", eta: "Delivered" },
];

const workflowNodes = [
  { id: "A", label: "Order created", type: "event", active: true },
  { id: "B", label: "Inventory check", type: "condition", active: true },
  { id: "C", label: "Reserve stock", type: "action", active: true },
  { id: "D", label: "Assign pick", type: "notification", active: false },
  { id: "E", label: "Dispatch", type: "action", active: false },
];

function getToneClass(tone: string) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25",
    sky: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25",
    amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25",
    violet: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25",
    slate: "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/25",
  };

  return tones[tone] ?? tones.slate;
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [sceneLayer, setSceneLayer] = useState("all");
  const [cameraPreset, setCameraPreset] = useState("overview");
  const [selectedObject, setSelectedObject] = useState<WarehouseObject | null>(null);
  const [warehouseLayout, setWarehouseLayout] = useState<WarehouseLayoutItem[]>(DEFAULT_WAREHOUSE_LAYOUT);
  const [warehouseSettings, setWarehouseSettings] = useState<WarehouseSettings>(DEFAULT_WAREHOUSE_SETTINGS);
  const navItems = [
    { label: "Dashboard", target: "command-center" },
    { label: "CRM", target: "orders" },
    { label: "Warehouse", target: "warehouse-view" },
    { label: "Fulfillment", target: "fulfillment" },
    { label: "Deliveries", target: "route-network" },
    { label: "Suppliers", target: "", disabled: true },
    { label: "Reports", target: "metrics" },
  ];
  const railWidth = collapsed ? 88 : 280;

  useEffect(() => {
    const syncNavigationWidth = () => setCollapsed(window.innerWidth < 760);
    syncNavigationWidth();
    window.addEventListener("resize", syncNavigationWidth);
    return () => window.removeEventListener("resize", syncNavigationWidth);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedLayout = window.localStorage.getItem(WAREHOUSE_LAYOUT_STORAGE_KEY);
        if (savedLayout) {
          const parsedLayout: unknown = JSON.parse(savedLayout);
          if (isWarehouseLayout(parsedLayout)) {
            setWarehouseLayout(migrateWarehouseLayout(parsedLayout, Number(window.localStorage.getItem(WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY) ?? 0)));
          }
        }
        const savedSettings = window.localStorage.getItem(WAREHOUSE_SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          const parsedSettings: unknown = JSON.parse(savedSettings);
          if (isWarehouseSettings(parsedSettings)) setWarehouseSettings(parsedSettings);
        }
      } catch {
        setWarehouseLayout(DEFAULT_WAREHOUSE_LAYOUT);
        setWarehouseSettings(DEFAULT_WAREHOUSE_SETTINGS);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="app-shell min-h-screen text-slate-100">
      <aside
        className="side-panel fixed left-0 top-0 z-20 h-screen overflow-y-auto border-r border-white/8 bg-slate-950/90 p-3 shadow-[20px_0_60px_rgba(2,6,23,0.7)] transition-colors duration-200"
        style={{ width: railWidth }}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-bold text-slate-950">
              N
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.28em] text-slate-400">Northstar</p>
                <h1 className="truncate text-sm font-semibold tracking-tight text-white">Operations</h1>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-300 transition hover:bg-slate-800"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="space-y-2 text-sm text-slate-300" aria-label="Main navigation">
          {navItems.map((item, index) => (
              <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              title={item.disabled ? "Supplier management is not available in this demo" : item.label}
              onClick={() => document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth" })}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                index === 0
                  ? "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/30"
                  : item.disabled
                    ? "cursor-not-allowed bg-slate-900/40 text-slate-600"
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">0{index + 1}</span>
              )}
              {collapsed && <span className="text-[10px] font-semibold text-slate-300">{item.label.slice(0, 1)}</span>}
            </button>
          ))}
          <Link
            href="/layout-editor"
            title="Edit warehouse layout"
            className={`layout-editor-nav-link ${collapsed ? "layout-editor-nav-collapsed" : ""}`}
          >
            <span>{collapsed ? "L" : "Layout editor"}</span>
            {!collapsed && <span className="layout-nav-arrow">↗</span>}
          </Link>
        </nav>

        {!collapsed && (
          <>
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.28em] text-amber-300">Demo environment</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <p className="mt-2 text-lg font-semibold text-white">Sample data</p>
            </div>

            <div className="mt-5">
              <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">Network</p>
              <div className="mt-3 space-y-3">
                {[
                  ["Warehouse A", "94%"],
                  ["Outbound", "7 lanes"],
                  ["Returns", "12"],
                  ["Cold chain", "3 alerts"],
                ].map(([label, detail], index) => (
                  <div key={label} className="rounded-2xl border border-white/6 bg-slate-900/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${index % 2 === 0 ? "bg-emerald-400" : "bg-cyan-400"}`} />
                    </div>
                    <p className="text-xs text-slate-400">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3">
              <p className="text-[9px] uppercase tracking-[0.28em] text-amber-300">Queue</p>
              <p className="mt-2 text-2xl font-semibold text-white">17</p>
              <p className="mt-1 text-[11px] text-slate-300">3 SLA breaches</p>
            </div>
          </>
        )}
      </aside>

      <main id="command-center" className="min-h-screen" style={{ marginLeft: railWidth, padding: "18px 18px 28px" }}>
        <header className="command-header">
          <div className="command-header-title">
            <p><span>Northstar</span><span className="command-breadcrumb-divider">/</span>Operations</p>
            <h1>Command centre</h1>
          </div>
          <div className="command-header-actions">
            <span className="workspace-status"><i />DEMO WORKSPACE</span>
            <button type="button" className="profile-button" aria-label="Account: Alex Green">AG</button>
          </div>
        </header>

        <section id="warehouse-view" className="warehouse-command mb-6">
          <div className="warehouse-command-heading">
            <div>
              <p className="eyebrow">Distribution centre · {warehouseSettings.name}</p>
              <h2>Warehouse floor</h2>
            </div>
            <div className="scene-heading-actions">
              <Link href="/layout-editor" className="edit-layout-link">Edit layout <span>↗</span></Link>
              <span className="simulation-notice"><i />Simulation · no live telemetry</span>
            </div>
          </div>

          <div className="warehouse-controls" aria-label="Warehouse scene controls">
            <label className="scene-control">
              <span>Layer</span>
              <select value={sceneLayer} onChange={(event) => setSceneLayer(event.target.value)}>
                <option value="all">All operations</option>
                <option value="storage">Storage</option>
                <option value="equipment">Equipment</option>
                <option value="dispatch">Dispatch</option>
              </select>
            </label>
            <label className="scene-control">
              <span>Camera</span>
              <select value={cameraPreset} onChange={(event) => setCameraPreset(event.target.value)}>
                <option value="overview">Overview</option>
                <option value="inbound">Inbound</option>
                <option value="dispatch">Dispatch</option>
              </select>
            </label>
            <div className="scene-control">
              <span>Demo speed</span>
              <div className="speed-control" role="group" aria-label="Demo speed">
                {[0.5, 1, 2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    aria-pressed={simulationSpeed === speed}
                    className={simulationSpeed === speed ? "speed-active" : ""}
                    onClick={() => setSimulationSpeed(speed)}
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="simulation-toggle"
              onClick={() => setSimulationRunning((value) => !value)}
              aria-pressed={simulationRunning}
            >
              {simulationRunning ? "Pause simulation" : "Resume simulation"}
            </button>
          </div>

          <div className="warehouse-scene-layout">
            <div className="warehouse-canvas-panel">
              <div className="warehouse-canvas-meta">
                <span>DC-01 · Open cutaway view</span>
                <span><i className="demo-indicator" /> Positions are simulated</span>
              </div>
              <div className="warehouse-canvas">
                <WarehouseScene
                  layout={warehouseLayout}
                  warehouseSettings={warehouseSettings}
                  running={simulationRunning}
                  speed={simulationSpeed}
                  layer={sceneLayer}
                  preset={cameraPreset}
                  selectedId={selectedObject?.id ?? null}
                  onSelect={setSelectedObject}
                />
              </div>
              <div className="warehouse-scene-footer">
                <span>Storage</span><span>Inbound</span><span>Pick & stage</span><span>Outbound</span>
              </div>
            </div>

            <aside className="warehouse-object-panel" aria-live="polite">
              <p className="eyebrow">Asset details</p>
              {selectedObject ? (
                <>
                  <div className="object-title-row">
                    <h3>{selectedObject.label}</h3>
                    <span className="object-category">{selectedObject.category}</span>
                  </div>
                  <div className="object-status">{selectedObject.status}</div>
                  <dl className="object-details">
                    <div><dt>Location</dt><dd>{selectedObject.location}</dd></div>
                    <div><dt>Record</dt><dd>{selectedObject.detail}</dd></div>
                    <div><dt>Inventory number</dt><dd>{selectedObject.inventoryNumber ?? "Not assigned"}</dd></div>
                    <div><dt>Manufacturer / model</dt><dd>{selectedObject.manufacturer ?? "Not specified"} · {selectedObject.model ?? "Not specified"}</dd></div>
                    <div><dt>Dimensions</dt><dd>{selectedObject.dimensions ?? "Not recorded"}</dd></div>
                    <div><dt>Notes</dt><dd>{selectedObject.notes ?? "No notes"}</dd></div>
                    <div><dt>Data source</dt><dd>Local demonstration scenario</dd></div>
                  </dl>
                </>
              ) : (
                <div className="object-empty-state">
                  <span className="object-empty-mark">+</span>
                  <p>Warehouse overview</p>
                  <span>DC-01 · 3 sample aisles · 2 sample docks</span>
                </div>
              )}
              <div className="object-panel-footnote">Not connected to production inventory, equipment, or GPS data.</div>
            </aside>
          </div>
        </section>

        <section id="metrics" className="panel p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Delivery performance</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Operational overview</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Demo scenario · 18 sample shipments dispatched in the last hour
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {kpis.map((item) => (
              <div key={item.label} className="metric-card rounded-[24px] border border-white/8 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getToneClass(item.tone)}`}>
                    {item.delta}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                <p className="mt-2 text-xs text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[1.4fr_0.95fr]">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300">Demo warehouse</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Facility utilization</h3>
              </div>
              <button type="button" className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                View floor plan
              </button>
            </div>

            <div className="warehouse-map grid gap-3 rounded-[24px] border border-white/8 bg-[#0b1220] p-4">
              {warehouseZones.map((zone) => (
                <div key={zone.name} className="rounded-2xl border border-white/8 bg-slate-900/80 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>{zone.name}</span>
                    <span>{zone.used}/{zone.capacity}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        zone.tone === "emerald"
                          ? "bg-emerald-400"
                          : zone.tone === "sky"
                            ? "bg-sky-400"
                            : zone.tone === "violet"
                              ? "bg-violet-400"
                              : "bg-amber-400"
                      }`}
                      style={{ width: `${(zone.used / zone.capacity) * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, bin) => (
                      <div
                        key={`${zone.name}-${bin}`}
                        className={`h-8 rounded-md border ${
                          bin % 2 === 0
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : bin % 3 === 0
                              ? "border-cyan-500/25 bg-cyan-500/10"
                              : "border-slate-700 bg-slate-800/80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">Alerts</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Exception center</h3>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-200">6 sample</span>
            </div>

            <div className="space-y-3">
              {[
                ["Low stock", "SKU-17-AP / DC2 / 14 units left"],
                ["Shipment delay", "Route R-2041 / Phoenix / 41 min behind"],
                ["Inventory variance", "Cycle count mismatch / Aisle 3-B"],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-slate-900/80 p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <p className="font-medium text-slate-100">{title}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fulfillment" className="grid gap-6 xl:grid-cols-2">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">Fulfillment</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Order pipeline</h3>
              </div>
              <button type="button" className="text-xs text-slate-300">Export</button>
            </div>

            <div className="space-y-4">
              {[
                ["Confirmed", "91%"],
                ["Allocated", "74%"],
                ["Picking", "52%"],
                ["Packed", "34%"],
                ["Dispatch", "21%"],
              ].map(([step, progress], index) => (
                <div key={step}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{step}</span>
                    <span>{progress}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        index === 0
                          ? "bg-emerald-400"
                          : index === 1
                            ? "bg-cyan-400"
                            : index === 2
                              ? "bg-sky-400"
                              : index === 3
                                ? "bg-violet-400"
                                : "bg-amber-400"
                      }`}
                      style={{ width: progress }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="route-network" className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Route network</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Vehicle dispatch</h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200">11 demo routes</span>
            </div>

            <div className="route-map relative overflow-hidden rounded-[24px] border border-white/8 bg-[#07131d] p-4">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
              <div className="relative h-48">
                <div className="absolute left-[14%] top-[40%] h-2 w-[58%] rounded-full bg-cyan-500/70" />
                <div className="absolute left-[54%] top-[28%] h-2 w-[32%] rounded-full bg-emerald-500/70" />
                <div className="absolute left-[30%] top-[62%] h-2 w-[44%] rounded-full bg-violet-500/70" />
                {["A", "B", "C", "D"].map((step, index) => (
                  <div
                    key={step}
                    className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-[10px] font-medium text-slate-100"
                    style={{
                      left: `${12 + index * 22}%`,
                      top: `${22 + (index % 2) * 24}%`,
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {deliveryRows.map((route) => (
                  <div key={route.route} className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-900/80 p-3 text-sm">
                    <div>
                      <p className="font-medium text-white">{route.route}</p>
                      <p className="text-xs text-slate-400">{route.city} • {route.driver}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${
                        route.status === "In route"
                          ? "bg-sky-500/15 text-sky-200"
                          : route.status === "Delayed"
                            ? "bg-amber-500/15 text-amber-200"
                            : route.status === "Loaded"
                              ? "bg-violet-500/15 text-violet-200"
                              : "bg-emerald-500/15 text-emerald-200"
                      }`}>
                        {route.status}
                      </span>
                      <p className="mt-1 text-xs text-slate-400">{route.eta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="orders" className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="panel min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">Orders</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Recent sample orders</h3>
              </div>
              <button type="button" className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                View all
              </button>
            </div>

            <div className="overflow-x-auto rounded-[20px] border border-white/8">
              <table className="min-w-[640px] text-left text-sm text-slate-200">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">ETA</th>
                    <th className="px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map((order) => (
                    <tr key={order.id} className="border-t border-white/6 bg-slate-950/40">
                      <td className="px-4 py-3 font-medium text-white">{order.id}</td>
                      <td className="px-4 py-3">{order.customer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${
                          order.status === "Picking"
                            ? "bg-cyan-500/15 text-cyan-200"
                            : order.status === "Packed"
                              ? "bg-violet-500/15 text-violet-200"
                              : order.status === "Allocated"
                                ? "bg-sky-500/15 text-sky-200"
                                : "bg-emerald-500/15 text-emerald-200"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{order.eta}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">{order.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300">Workflow</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Sample automation flow</h3>
              </div>
              <button type="button" className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                Edit flow
              </button>
            </div>

            <div className="workflow-panel rounded-[24px] border border-white/8 bg-slate-900/80 p-4">
              <div className="flex flex-col gap-3">
                {workflowNodes.map((node, index) => (
                  <div key={node.id} className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-semibold ${
                      node.active
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                        : "border-slate-600 bg-slate-800 text-slate-300"
                    }`}>
                      {node.id}
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{node.label}</span>
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          {node.type}
                        </span>
                      </div>
                    </div>
                    {index < workflowNodes.length - 1 && <div className="text-slate-500">→</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
