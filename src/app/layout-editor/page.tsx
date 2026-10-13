"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DEFAULT_WAREHOUSE_LAYOUT, DEFAULT_WAREHOUSE_SETTINGS, getElementVerticalHeight, isWarehouseLayout, isWarehouseSettings, migrateWarehouseLayout, WAREHOUSE_LAYOUT_SCHEMA_VERSION, WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY, WAREHOUSE_LAYOUT_STORAGE_KEY, WAREHOUSE_SETTINGS_STORAGE_KEY, type WarehouseElementKind, type WarehouseLayoutItem } from "../components/warehouse-layout";
import WarehouseSettingsFields from "../components/WarehouseSettingsFields";

type LayoutKind = WarehouseElementKind;
type LayoutObject = WarehouseLayoutItem;
const startingLayout = DEFAULT_WAREHOUSE_LAYOUT;

const objectStyles: Record<LayoutKind, { fill: string; stroke: string }> = {
  Rack: { fill: "#26343b", stroke: "#89969a" },
  Dock: { fill: "#392d27", stroke: "#e18b50" },
  Truck: { fill: "#303e44", stroke: "#b0bec0" },
  "Work zone": { fill: "#233c39", stroke: "#6d9b8d" },
  Aisle: { fill: "#314144", stroke: "#80999a" },
  Table: { fill: "#614d3e", stroke: "#c29b78" },
  Box: { fill: "#b9a27f", stroke: "#e1c9a4" },
  Column: { fill: "#9ba4a4", stroke: "#d3d7d3" },
  Forklift: { fill: "#e18b50", stroke: "#ffc28d" },
  Pallet: { fill: "#7a583d", stroke: "#caa079" },
};

function newObject(kind: LayoutKind, index: number): LayoutObject {
  const dimensions: Record<LayoutKind, { width: number; height: number; prefix: string }> = {
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
  const { width, height, prefix } = dimensions[kind];
  const id = `${prefix}-${String(index).padStart(2, "0")}`;

  return {
    id,
    name: kind === "Rack" ? `Rack ${String(index).padStart(2, "0")}` : `${kind} ${String(index).padStart(2, "0")}`,
    kind,
    x: 450 + ((index % 3) - 1) * 130,
    y: 525,
    width,
    height,
    rotation: 0,
    verticalHeight: kind === "Rack" ? 4.2 : kind === "Truck" ? 3 : kind === "Forklift" ? 2.4 : kind === "Column" ? 8 : kind === "Pallet" ? 1.1 : kind === "Dock" ? 0.9 : kind === "Aisle" || kind === "Work zone" ? 0.05 : 0.8,
    capacity: kind === "Rack" ? 0 : undefined,
    inventoryNumber: id,
    manufacturer: "",
    model: "",
    notes: "",
  };
}

export default function WarehouseLayoutEditor() {
  const [layout, setLayout] = useState(startingLayout);
  const [warehouseSettings, setWarehouseSettings] = useState(DEFAULT_WAREHOUSE_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>("R-01");
  const [dirty, setDirty] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [saveMessage, setSaveMessage] = useState("Browser-local draft");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragId = useRef<string | null>(null);
  const nextIndex = useRef(startingLayout.length + 1);
  const selectedObject = layout.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedLayout = window.localStorage.getItem(WAREHOUSE_LAYOUT_STORAGE_KEY);
        if (!savedLayout) return;
        const parsed: unknown = JSON.parse(savedLayout);
        if (isWarehouseLayout(parsed)) {
          setLayout(migrateWarehouseLayout(parsed, Number(window.localStorage.getItem(WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY) ?? 0)));
          setDirty(false);
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

  function updateSelected(changes: Partial<LayoutObject>) {
    if (!selectedId) return;
    setLayout((current) => current.map((item) => item.id === selectedId ? { ...item, ...changes } : item));
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  function addObject(kind: LayoutKind) {
    let created = newObject(kind, nextIndex.current++);
    while (layout.some((item) => item.id === created.id)) {
      created = newObject(kind, nextIndex.current++);
    }
    setLayout((current) => [...current, created]);
    setSelectedId(created.id);
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  function moveDraggedObject(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragId.current || !svgRef.current) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 1000;
    const y = ((event.clientY - bounds.top) / bounds.height) * 620;
    setLayout((current) => current.map((item) => {
      if (item.id !== dragId.current) return item;
      const horizontalExtent = item.rotation % 180 === 0 ? item.width / 2 : item.height / 2;
      const verticalExtent = item.rotation % 180 === 0 ? item.height / 2 : item.width / 2;
      return {
        ...item,
        x: Math.max(horizontalExtent, Math.min(1000 - horizontalExtent, x)),
        y: Math.max(verticalExtent, Math.min(620 - verticalExtent, y)),
      };
    }));
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  function startDragging(event: ReactPointerEvent<SVGGElement>, item: LayoutObject) {
    event.stopPropagation();
    event.preventDefault();
    setSelectedId(item.id);
    dragId.current = item.id;
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  function stopDragging(event: ReactPointerEvent<SVGSVGElement>) {
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    dragId.current = null;
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
    setLayout(startingLayout.map((item) => ({ ...item })));
    setWarehouseSettings(DEFAULT_WAREHOUSE_SETTINGS);
    setSelectedId("R-01");
    setDirty(true);
    setSaveMessage("Reset draft · save to keep it");
  }

  function deleteSelected() {
    if (!selectedId) return;
    setLayout((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setDirty(true);
    setSaveMessage("Unsaved changes");
  }

  return (
    <main className="layout-editor-page">
      <header className="layout-editor-header">
        <div className="layout-editor-brand">
          <Link href="/" className="editor-back-link" aria-label="Back to command centre">←</Link>
          <div>
            <p>Northstar <span>/</span> Warehouse design</p>
            <h1>Layout editor</h1>
          </div>
        </div>
        <div className="layout-editor-actions">
          <div className="editor-mode-switch" aria-label="Layout editor mode">
            <Link href="/layout-editor" aria-current="page">2D plan</Link>
            <Link href="/layout-editor/3d">3D edit</Link>
          </div>
          <span className={dirty ? "draft-status draft-dirty" : "draft-status"}>
            <i />{saveMessage}
          </span>
          <button type="button" className="editor-reset-button" onClick={resetLayout}>Reset</button>
          <button type="button" className="editor-save-button" onClick={saveLayout}>Save layout</button>
        </div>
      </header>

      <div className="layout-editor-toolbar">
        <div className="layout-add-group" aria-label="Add warehouse elements">
          <span>Add to floor</span>
          <button type="button" onClick={() => addObject("Rack")}><b>+</b> Rack</button>
          <button type="button" onClick={() => addObject("Dock")}><b>+</b> Dock</button>
          <button type="button" onClick={() => addObject("Truck")}><b>+</b> Truck</button>
          <button type="button" onClick={() => addObject("Work zone")}><b>+</b> Work zone</button>
          <button type="button" onClick={() => addObject("Aisle")}><b>+</b> Aisle</button>
          <button type="button" onClick={() => addObject("Table")}><b>+</b> Table</button>
          <button type="button" onClick={() => addObject("Box")}><b>+</b> Box</button>
          <button type="button" onClick={() => addObject("Pallet")}><b>+</b> Pallet</button>
          <button type="button" onClick={() => addObject("Column")}><b>+</b> Column</button>
        </div>
        <button
          type="button"
          className={gridVisible ? "grid-toggle is-on" : "grid-toggle"}
          aria-pressed={gridVisible}
          onClick={() => setGridVisible((visible) => !visible)}
        >
          Grid {gridVisible ? "on" : "off"}
        </button>
      </div>

      <WarehouseSettingsFields settings={warehouseSettings} onChange={(next) => {
        setWarehouseSettings(next);
        setLayout((current) => current.map((item) => ({ ...item, verticalHeight: Math.min(getElementVerticalHeight(item), next.clearHeight) })));
        setDirty(true);
        setSaveMessage("Unsaved changes");
      }} />

      <div className="layout-editor-workspace">
        <section className="layout-plan-panel" aria-label="Warehouse floor plan">
          <div className="layout-plan-caption">
            <div><span className="plan-live-dot" />{warehouseSettings.name} <span>/</span> Main warehouse</div>
            <span>{warehouseSettings.width} × {warehouseSettings.depth} × {warehouseSettings.clearHeight} m · {layout.length} elements</span>
          </div>
          <div className="layout-plan-canvas">
            <svg
              ref={svgRef}
              className="layout-floorplan"
              viewBox="0 0 1000 620"
              preserveAspectRatio="none"
              role="application"
              aria-label="Draggable warehouse floor plan"
              onPointerMove={moveDraggedObject}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onPointerDown={(event) => {
                if (event.target instanceof Element && event.target.closest(".plan-object")) return;
                setSelectedId(null);
              }}
            >
              <defs>
                <pattern id="editor-grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374247" strokeWidth="0.65" />
                </pattern>
                <pattern id="editor-grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#editor-grid-small)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#526064" strokeWidth="1.2" />
                </pattern>
              </defs>
              <rect width="1000" height="620" rx="4" fill="#171f23" />
              {gridVisible && <rect width="1000" height="620" fill="url(#editor-grid-large)" pointerEvents="none" />}
              <rect x="14" y="14" width="972" height="592" rx="3" fill="none" stroke="#758187" strokeWidth="5" />
              <path d="M 14 500 H 986" stroke="#677378" strokeWidth="2" strokeDasharray="12 9" />
              <text x="32" y="484" className="plan-zone-label">DOCK APRON</text>
              <text x="35" y="54" className="plan-zone-label">STORAGE & PICKING</text>
              <text x="38" y="588" className="plan-coordinate-label">0</text>
              <text x="945" y="588" className="plan-coordinate-label">1000</text>

              {layout.map((item) => {
                const selected = selectedId === item.id;
                const palette = objectStyles[item.kind];
                return (
                  <g
                    key={item.id}
                    transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
                    className={`plan-object plan-object-${item.kind.toLowerCase().replace(" ", "-")}${selected ? " is-selected" : ""}`}
                    onPointerDown={(event) => startDragging(event, item)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(item.id);
                    }}
                  >
                    <title>{`${item.name} · ${item.kind}`}</title>
                    {item.kind === "Rack" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="2" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2 + 8} -12 H ${item.width / 2 - 8} M ${-item.width / 2 + 8} 0 H ${item.width / 2 - 8} M ${-item.width / 2 + 8} 12 H ${item.width / 2 - 8}`} stroke="#e18b50" strokeWidth="3" />
                        <path d={`M ${-item.width / 2 + 12} ${-item.height / 2} V ${item.height / 2} M ${item.width / 2 - 12} ${-item.height / 2} V ${item.height / 2}`} stroke="#9aa4a4" strokeWidth="2" />
                      </>
                    )}
                    {item.kind === "Dock" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="3" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2 + 12} ${-item.height / 2 + 9} V ${item.height / 2 - 8} H ${item.width / 2 - 12} V ${-item.height / 2 + 9}`} fill="none" stroke="#f4b27d" strokeWidth="3" />
                      </>
                    )}
                    {item.kind === "Truck" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="5" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2} ${-item.height / 2 + 10} H ${item.width / 2 - 28} L ${item.width / 2} 0 V ${item.height / 2 - 10} H ${-item.width / 2} Z`} fill="none" stroke="#91a4a7" strokeWidth="2" />
                        <circle cx={-item.width * 0.28} cy={item.height / 2} r="7" fill="#20292d" />
                        <circle cx={item.width * 0.28} cy={item.height / 2} r="7" fill="#20292d" />
                      </>
                    )}
                    {item.kind === "Truck" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="5" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2} ${-item.height / 2 + 10} H ${item.width / 2 - 28} L ${item.width / 2} 0 V ${item.height / 2 - 10} H ${-item.width / 2} Z`} fill="none" stroke="#91a4a7" strokeWidth="2" />
                        <circle cx={-item.width * 0.28} cy={item.height / 2} r="7" fill="#20292d" />
                        <circle cx={item.width * 0.28} cy={item.height / 2} r="7" fill="#20292d" />
                      </>
                    )}
                    {item.kind === "Work zone" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="5" fill={palette.fill} fillOpacity="0.86" stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} strokeDasharray="8 5" />
                        <path d={`M ${-item.width / 2 + 12} 0 H ${item.width / 2 - 12}`} stroke="#6d9b8d" strokeWidth="2" strokeDasharray="6 5" />
                      </>
                    )}
                    {item.kind === "Aisle" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="3" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2 + 12} 0 H ${item.width / 2 - 12}`} stroke="#a5b6b3" strokeWidth="2" strokeDasharray="10 8" />
                      </>
                    )}
                    {item.kind === "Table" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="4" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2 + 10} ${-item.height / 2 + 10} H ${item.width / 2 - 10} V ${item.height / 2 - 10} H ${-item.width / 2 + 10} Z`} fill="none" stroke="#d0ae8e" strokeWidth="2" />
                      </>
                    )}
                    {item.kind === "Box" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="2" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2} 0 H ${item.width / 2} M 0 ${-item.height / 2} V ${item.height / 2}`} stroke="#806d53" strokeWidth="2" />
                      </>
                    )}
                    {item.kind === "Column" && (
                      <circle r={item.width / 2} fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                    )}
                    {item.kind === "Forklift" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="5" fill={palette.fill} stroke={selected ? "#fff0dd" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <rect x="-9" y="-9" width="20" height="18" rx="2" fill="#263138" />
                        <path d={`M ${item.width / 2 - 3} -16 V 16 M ${item.width / 2 - 3} 12 H ${item.width / 2 + 13}`} stroke="#f2c08f" strokeWidth="3" />
                      </>
                    )}
                    {item.kind === "Pallet" && (
                      <>
                        <rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="3" fill={palette.fill} stroke={selected ? "#f28c45" : palette.stroke} strokeWidth={selected ? 4 : 2} />
                        <path d={`M ${-item.width / 2 + 12} ${-item.height / 2 + 9} H ${item.width / 2 - 12} M ${-item.width / 2 + 12} 0 H ${item.width / 2 - 12} M ${-item.width / 2 + 12} ${item.height / 2 - 9} H ${item.width / 2 - 12}`} stroke="#d7b28d" strokeWidth="3" />
                      </>
                    )}
                    <text x="0" y={item.height / 2 + 17} textAnchor="middle" className="plan-object-label">{item.name}</text>
                    {selected && <circle cx={item.width / 2 - 5} cy={-item.height / 2 + 5} r="5" fill="#f28c45" stroke="#171f23" strokeWidth="2" />}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="layout-plan-footer">
            <span><i className="legend-rack" />Storage rack</span>
            <span><i className="legend-zone" />Work zone</span>
            <span><i className="legend-dock" />Loading dock</span>
            <span><i className="legend-aisle" />Aisle</span>
            <span><i className="legend-table" />Table</span>
            <span><i className="legend-box" />Box</span>
            <span className="layout-grid-note">Grid units · 1000 × 620</span>
          </div>
        </section>

        <aside className="layout-inspector">
          <div className="inspector-heading">
            <div><p>Selected element</p><h2>{selectedObject?.name ?? "Nothing selected"}</h2></div>
            {selectedObject && <span className="inspector-id">{selectedObject.id}</span>}
          </div>

          {selectedObject ? (
            <div className="inspector-fields">
              <label className="inspector-field inspector-field-full">
                <span>Name</span>
                <input value={selectedObject.name} onChange={(event) => updateSelected({ name: event.target.value })} />
              </label>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Floor X · m</span><input type="number" min="0" max={warehouseSettings.width} step="0.1" value={(selectedObject.x / 1000 * warehouseSettings.width).toFixed(1)} onChange={(event) => updateSelected({ x: Number(event.target.value) / warehouseSettings.width * 1000 })} /></label>
                <label className="inspector-field"><span>Floor Y · m</span><input type="number" min="0" max={warehouseSettings.depth} step="0.1" value={(selectedObject.y / 620 * warehouseSettings.depth).toFixed(1)} onChange={(event) => updateSelected({ y: Number(event.target.value) / warehouseSettings.depth * 620 })} /></label>
              </div>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Length · m</span><input type="number" min="0.2" max={warehouseSettings.width} step="0.1" value={(selectedObject.width / 1000 * warehouseSettings.width * 28 / 30).toFixed(1)} onChange={(event) => updateSelected({ width: Math.max(20, Number(event.target.value) / warehouseSettings.width * 1000 * 30 / 28) })} /></label>
                <label className="inspector-field"><span>Depth · m</span><input type="number" min="0.2" max={warehouseSettings.depth} step="0.1" value={(selectedObject.height / 620 * warehouseSettings.depth * 19 / 21).toFixed(1)} onChange={(event) => updateSelected({ height: Math.max(20, Number(event.target.value) / warehouseSettings.depth * 620 * 21 / 19) })} /></label>
              </div>
              <label className="inspector-field inspector-field-full"><span>Equipment height · m</span><input type="number" min="0.05" max={warehouseSettings.clearHeight} step="0.05" value={getElementVerticalHeight(selectedObject)} onChange={(event) => updateSelected({ verticalHeight: Math.max(0.05, Number(event.target.value)) })} /></label>
              <label className="inspector-field inspector-field-full"><span>Inventory number</span><input value={selectedObject.inventoryNumber ?? ""} onChange={(event) => updateSelected({ inventoryNumber: event.target.value })} /></label>
              <div className="inspector-field-pair">
                <label className="inspector-field"><span>Manufacturer</span><input value={selectedObject.manufacturer ?? ""} onChange={(event) => updateSelected({ manufacturer: event.target.value })} /></label>
                <label className="inspector-field"><span>Model</span><input value={selectedObject.model ?? ""} onChange={(event) => updateSelected({ model: event.target.value })} /></label>
              </div>
              <label className="inspector-field inspector-field-full"><span>Notes</span><textarea rows={3} value={selectedObject.notes ?? ""} onChange={(event) => updateSelected({ notes: event.target.value })} /></label>
              <div className="inspector-rotation">
                <span>Orientation</span>
                <div role="group" aria-label="Object orientation">
                  {[0, 90].map((rotation) => (
                    <button key={rotation} type="button" aria-pressed={selectedObject.rotation % 180 === rotation} onClick={() => updateSelected({ rotation })}>{rotation}°</button>
                  ))}
                </div>
              </div>
              {selectedObject.kind === "Rack" && (
                <label className="inspector-field inspector-field-full">
                  <span>Capacity target <b>{selectedObject.capacity ?? 0}%</b></span>
                  <input className="capacity-slider" type="range" min="0" max="100" value={selectedObject.capacity ?? 0} onChange={(event) => updateSelected({ capacity: Number(event.target.value) })} />
                </label>
              )}
              <div className="inspector-type-line"><span>Element type</span><strong>{selectedObject.kind}</strong></div>
              <button type="button" className="delete-element-button" onClick={deleteSelected}>Remove element</button>
            </div>
          ) : (
            <p className="inspector-empty">Select an item on the floor plan to edit its dimensions and position.</p>
          )}

          <div className="inspector-footnote">
            <span>LOCAL DRAFT</span>
            Changes are saved in this browser only. They are not synced to live warehouse systems.
          </div>
        </aside>
      </div>
    </main>
  );
}
