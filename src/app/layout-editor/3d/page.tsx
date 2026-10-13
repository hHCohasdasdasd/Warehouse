"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { Group } from "three";
import {
  DEFAULT_WAREHOUSE_LAYOUT,
  DEFAULT_WAREHOUSE_SETTINGS,
  isWarehouseLayout,
  isWarehouseSettings,
  migrateWarehouseLayout,
  WAREHOUSE_LAYOUT_STORAGE_KEY,
  WAREHOUSE_LAYOUT_SCHEMA_VERSION,
  WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY,
  WAREHOUSE_SETTINGS_STORAGE_KEY,
  getElementVerticalHeight,
  type WarehouseElementKind,
  type WarehouseLayoutItem,
  type WarehouseSettings,
} from "../../components/warehouse-layout";
import WarehouseSettingsFields from "../../components/WarehouseSettingsFields";

const WarehouseLayout3D = dynamic(() => import("../../components/WarehouseLayout3D"), {
  ssr: false,
  loading: () => <div className="warehouse-loading" role="status">Loading 3D editor...</div>,
});

type TransformMode = ComponentProps<typeof WarehouseLayout3D>["mode"];

const addableKinds: WarehouseElementKind[] = ["Rack", "Dock", "Truck", "Work zone", "Aisle", "Table", "Box", "Pallet", "Column"];
const elementSizes: Record<WarehouseElementKind, { width: number; height: number; prefix: string }> = {
  Rack: { width: 170, height: 52, prefix: "R" },
  Dock: { width: 118, height: 58, prefix: "D" },
  Truck: { width: 180, height: 82, prefix: "TR" },
  "Work zone": { width: 190, height: 94, prefix: "Z" },
  Aisle: { width: 320, height: 32, prefix: "A" },
  Table: { width: 110, height: 70, prefix: "T" },
  Box: { width: 44, height: 44, prefix: "B" },
  Column: { width: 24, height: 24, prefix: "C" },
  Forklift: { width: 62, height: 38, prefix: "FL" },
  Pallet: { width: 74, height: 50, prefix: "P" },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function WarehouseLayout3DEditor() {
  const [layout, setLayout] = useState(DEFAULT_WAREHOUSE_LAYOUT);
  const [warehouseSettings, setWarehouseSettings] = useState(DEFAULT_WAREHOUSE_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>("R-01");
  const [mode, setMode] = useState<TransformMode>("translate");
  const [gridVisible, setGridVisible] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Browser-local draft");
  const nextIndex = useRef(DEFAULT_WAREHOUSE_LAYOUT.length + 1);
  const selectedGroupRef = useRef<Group | null>(null);
  const selectedObject = layout.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(WAREHOUSE_LAYOUT_STORAGE_KEY);
        if (!saved) return;
        const parsed: unknown = JSON.parse(saved);
        if (isWarehouseLayout(parsed)) {
          setLayout(migrateWarehouseLayout(parsed, Number(window.localStorage.getItem(WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY) ?? 0)));
          setSaveMessage("Loaded saved layout");
        }
        const savedSettings = window.localStorage.getItem(WAREHOUSE_SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          const parsedSettings: unknown = JSON.parse(savedSettings);
          if (isWarehouseSettings(parsedSettings)) setWarehouseSettings(parsedSettings);
        }
      } catch {
        setSaveMessage("Could not load saved layout");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function markEdited() {
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  function updateSelected(changes: Partial<WarehouseLayoutItem>) {
    if (!selectedId) return;
    setLayout((current) => current.map((item) => item.id === selectedId ? { ...item, ...changes } : item));
    markEdited();
  }

  function addElement(kind: WarehouseElementKind) {
    const config = elementSizes[kind];
    const prefix = config.prefix;
    let id = `${prefix}-${String(nextIndex.current++).padStart(2, "0")}`;
    while (layout.some((item) => item.id === id)) id = `${prefix}-${String(nextIndex.current++).padStart(2, "0")}`;
    const item: WarehouseLayoutItem = {
      id,
      name: `${kind} ${id.slice(prefix.length + 1)}`,
      kind,
      x: 450 + ((layout.length % 3) - 1) * 130,
      y: 525,
      width: config.width,
      height: config.height,
      rotation: 0,
      verticalHeight: kind === "Rack" ? 4.2 : kind === "Truck" ? 3 : kind === "Forklift" ? 2.4 : kind === "Column" ? 8 : kind === "Pallet" ? 1.1 : kind === "Dock" ? 0.9 : kind === "Aisle" || kind === "Work zone" ? 0.05 : 0.8,
      inventoryNumber: id,
      manufacturer: "",
      model: "",
      notes: "",
      capacity: kind === "Rack" ? 0 : undefined,
    };
    setLayout((current) => [...current, item]);
    setSelectedId(id);
    selectedGroupRef.current = null;
    markEdited();
  }

  function finishTransform() {
    const selectedGroup = selectedGroupRef.current;
    if (!selectedId || !selectedGroup) return;
    const target = layout.find((item) => item.id === selectedId);
    if (!target) return;

    const rotated = Math.abs(Math.sin(selectedGroup.rotation.y)) > 0.5;
    const horizontalExtent = (rotated ? target.height : target.width) / 2;
    const verticalExtent = (rotated ? target.width : target.height) / 2;
    const x = clamp(((selectedGroup.position.x + 14) / 28) * 1000, horizontalExtent, 1000 - horizontalExtent);
    const y = clamp(((selectedGroup.position.z + 9.5) / 19) * 620, verticalExtent, 620 - verticalExtent);
    const rotation = ((Math.round((selectedGroup.rotation.y * 180) / Math.PI) % 360) + 360) % 360;
    const width = clamp(target.width * Math.abs(selectedGroup.scale.x), 20, 800);
    const height = clamp(target.height * Math.abs(selectedGroup.scale.z), 20, 400);
    const verticalHeight = clamp(getElementVerticalHeight(target) * Math.abs(selectedGroup.scale.y), 0.05, warehouseSettings.clearHeight);

    selectedGroup.position.x = (x / 1000) * 28 - 14;
    selectedGroup.position.z = (y / 620) * 19 - 9.5;
    selectedGroup.scale.set(1, 1, 1);
    setLayout((current) => current.map((item) => item.id === selectedId ? { ...item, x, y, width, height, verticalHeight, rotation } : item));
    markEdited();
  }

  function saveLayout() {
    try {
      window.localStorage.setItem(WAREHOUSE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
      window.localStorage.setItem(WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY, String(WAREHOUSE_LAYOUT_SCHEMA_VERSION));
      window.localStorage.setItem(WAREHOUSE_SETTINGS_STORAGE_KEY, JSON.stringify(warehouseSettings));
      setDirty(false);
      setSaveMessage("Saved on this device");
    } catch {
      setSaveMessage("Save failed · browser storage unavailable");
    }
  }

  function resetLayout() {
    setLayout(DEFAULT_WAREHOUSE_LAYOUT.map((item) => ({ ...item })));
    setWarehouseSettings(DEFAULT_WAREHOUSE_SETTINGS);
    setSelectedId("R-01");
    selectedGroupRef.current = null;
    markEdited();
  }

  function deleteSelected() {
    if (!selectedId) return;
    setLayout((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    selectedGroupRef.current = null;
    markEdited();
  }

  return (
    <main className="layout-editor-page layout-editor-3d-page">
      <header className="layout-editor-header">
        <div className="layout-editor-brand">
          <Link href="/" className="editor-back-link" aria-label="Back to command centre">←</Link>
          <div>
            <p>Northstar <span>/</span> Warehouse design</p>
            <h1>3D layout editor</h1>
          </div>
        </div>
        <div className="layout-editor-actions">
          <div className="editor-mode-switch" aria-label="Layout editor mode">
            <Link href="/layout-editor">2D plan</Link>
            <Link href="/layout-editor/3d" aria-current="page">3D edit</Link>
          </div>
          <span className={dirty ? "draft-status draft-dirty" : "draft-status"}><i />{saveMessage}</span>
          <button type="button" className="editor-reset-button" onClick={resetLayout}>Reset</button>
          <button type="button" className="editor-save-button" onClick={saveLayout}>Save layout</button>
        </div>
      </header>

      <div className="layout-3d-toolbar">
        <div className="layout-add-group" aria-label="Add warehouse elements">
          <span>Add element</span>
          {addableKinds.map((kind) => <button key={kind} type="button" onClick={() => addElement(kind)}><b>+</b> {kind}</button>)}
        </div>
        <div className="layout-transform-tools" role="group" aria-label="Transform mode">
          {(["translate", "rotate", "scale"] as const).map((tool) => (
            <button key={tool} type="button" aria-pressed={mode === tool} onClick={() => setMode(tool)}>
              {tool === "translate" ? "Move" : tool === "rotate" ? "Rotate" : "Scale"}
            </button>
          ))}
          <button type="button" className={gridVisible ? "grid-toggle is-on" : "grid-toggle"} aria-pressed={gridVisible} onClick={() => setGridVisible((value) => !value)}>
            Grid {gridVisible ? "on" : "off"}
          </button>
        </div>
      </div>

      <WarehouseSettingsFields settings={warehouseSettings} onChange={(next: WarehouseSettings) => {
        setWarehouseSettings(next);
        setLayout((current) => current.map((item) => ({ ...item, verticalHeight: Math.min(getElementVerticalHeight(item), next.clearHeight) })));
        markEdited();
      }} />

      <div className="layout-3d-workspace">
        <section className="layout-3d-canvas-panel" aria-label="Interactive three-dimensional warehouse layout">
          <div className="layout-plan-caption">
            <div><span className="plan-live-dot" />DC-01 <span>/</span> 3D warehouse editor</div>
            <span>{layout.length} elements · unsynced local draft</span>
          </div>
          <div className="layout-3d-canvas">
            <WarehouseLayout3D
              layout={layout}
              warehouseSettings={warehouseSettings}
              selectedId={selectedId}
              mode={mode}
              gridVisible={gridVisible}
              onSelect={(item, group) => {
                setSelectedId(item.id);
                selectedGroupRef.current = group;
              }}
              onClearSelection={() => {
                setSelectedId(null);
                selectedGroupRef.current = null;
              }}
              onTransformEnd={finishTransform}
            />
          </div>
          <div className="layout-3d-caption">Select an object, then use the gizmo to move, rotate, or scale it. Orbit to inspect from any angle.</div>
        </section>

        <aside className="layout-inspector">
          <div className="inspector-heading">
            <div><p>Selected element</p><h2>{selectedObject?.name ?? "Nothing selected"}</h2></div>
            {selectedObject && <span className="inspector-id">{selectedObject.id}</span>}
          </div>
          {selectedObject ? (
            <div className="inspector-fields">
              <label className="inspector-field inspector-field-full"><span>Name</span><input value={selectedObject.name} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Floor X · m</span><input type="number" min="0" max={warehouseSettings.width} step="0.1" value={(selectedObject.x / 1000 * warehouseSettings.width).toFixed(1)} onChange={(event) => updateSelected({ x: clamp(Number(event.target.value) / warehouseSettings.width * 1000, 0, 1000) })} /></label>
                <label className="inspector-field"><span>Floor Y · m</span><input type="number" min="0" max={warehouseSettings.depth} step="0.1" value={(selectedObject.y / 620 * warehouseSettings.depth).toFixed(1)} onChange={(event) => updateSelected({ y: clamp(Number(event.target.value) / warehouseSettings.depth * 620, 0, 620) })} /></label>
              </div>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Length · m</span><input type="number" min="0.2" max={warehouseSettings.width} step="0.1" value={(selectedObject.width / 1000 * warehouseSettings.width * 28 / 30).toFixed(1)} onChange={(event) => updateSelected({ width: clamp(Number(event.target.value) / warehouseSettings.width * 1000 * 30 / 28, 20, 800) })} /></label>
                <label className="inspector-field"><span>Depth · m</span><input type="number" min="0.2" max={warehouseSettings.depth} step="0.1" value={(selectedObject.height / 620 * warehouseSettings.depth * 19 / 21).toFixed(1)} onChange={(event) => updateSelected({ height: clamp(Number(event.target.value) / warehouseSettings.depth * 620 * 21 / 19, 20, 400) })} /></label>
              </div>
              <label className="inspector-field inspector-field-full"><span>Equipment height <b>m</b></span><input type="number" min="0.05" max={warehouseSettings.clearHeight} step="0.05" value={getElementVerticalHeight(selectedObject)} onChange={(event) => updateSelected({ verticalHeight: clamp(Number(event.target.value), 0.05, warehouseSettings.clearHeight) })} /></label>
              <label className="inspector-field inspector-field-full"><span>Inventory number</span><input value={selectedObject.inventoryNumber ?? ""} onChange={(event) => updateSelected({ inventoryNumber: event.target.value })} /></label>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Manufacturer</span><input value={selectedObject.manufacturer ?? ""} onChange={(event) => updateSelected({ manufacturer: event.target.value })} /></label>
                <label className="inspector-field"><span>Model</span><input value={selectedObject.model ?? ""} onChange={(event) => updateSelected({ model: event.target.value })} /></label>
              </div>
              <label className="inspector-field inspector-field-full"><span>Notes</span><textarea value={selectedObject.notes ?? ""} rows={3} onChange={(event) => updateSelected({ notes: event.target.value })} /></label>
              <label className="inspector-field inspector-field-full"><span>Rotation <b>{Math.round(selectedObject.rotation)}°</b></span><input type="range" min="0" max="359" value={((Math.round(selectedObject.rotation) % 360) + 360) % 360} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /></label>
              {selectedObject.kind === "Rack" && (
                <label className="inspector-field inspector-field-full"><span>Capacity target <b>{selectedObject.capacity ?? 0}%</b></span><input className="capacity-slider" type="range" min="0" max="100" value={selectedObject.capacity ?? 0} onChange={(event) => updateSelected({ capacity: Number(event.target.value) })} /></label>
              )}
              <div className="inspector-type-line"><span>Element type</span><strong>{selectedObject.kind}</strong></div>
              <button type="button" className="delete-element-button" onClick={deleteSelected}>Remove element</button>
            </div>
          ) : <p className="inspector-empty">Select an object in the 3D warehouse to edit it.</p>}
          <div className="inspector-footnote"><span>LOCAL DRAFT</span>Changes save in this browser only; they are not synced to a live warehouse system.</div>
        </aside>
      </div>
    </main>
  );
}
