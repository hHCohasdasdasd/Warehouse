export type WarehouseElementKind = "Rack" | "Dock" | "Truck" | "Work zone" | "Aisle" | "Table" | "Box" | "Column" | "Forklift" | "Pallet";

export type WarehouseLayoutItem = {
  id: string;
  name: string;
  kind: WarehouseElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  verticalHeight?: number;
  capacity?: number;
  inventoryNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

export const WAREHOUSE_LAYOUT_STORAGE_KEY = "northstar-layout-draft-v1";
export const WAREHOUSE_LAYOUT_SCHEMA_VERSION_KEY = "northstar-layout-schema-version";
export const WAREHOUSE_LAYOUT_SCHEMA_VERSION = 2;
export const WAREHOUSE_SETTINGS_STORAGE_KEY = "northstar-warehouse-settings-v1";

export type WarehouseSettings = {
  name: string;
  width: number;
  depth: number;
  clearHeight: number;
};

export const DEFAULT_WAREHOUSE_SETTINGS: WarehouseSettings = {
  name: "DC-01",
  width: 30,
  depth: 21,
  clearHeight: 10,
};

export const DEFAULT_WAREHOUSE_LAYOUT: WarehouseLayoutItem[] = [
  { id: "R-01", name: "Rack A-01", kind: "Rack", x: 250, y: 145, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 76, inventoryNumber: "RACK-0001" },
  { id: "R-02", name: "Rack A-02", kind: "Rack", x: 495, y: 145, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 62, inventoryNumber: "RACK-0002" },
  { id: "R-03", name: "Rack A-03", kind: "Rack", x: 740, y: 145, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 89, inventoryNumber: "RACK-0003" },
  { id: "R-04", name: "Rack B-01", kind: "Rack", x: 250, y: 270, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 54, inventoryNumber: "RACK-0004" },
  { id: "R-05", name: "Rack B-02", kind: "Rack", x: 495, y: 270, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 70, inventoryNumber: "RACK-0005" },
  { id: "R-06", name: "Rack B-03", kind: "Rack", x: 740, y: 270, width: 170, height: 52, rotation: 0, verticalHeight: 4.2, capacity: 43, inventoryNumber: "RACK-0006" },
  { id: "D-01", name: "Inbound dock", kind: "Dock", x: 130, y: 520, width: 118, height: 58, rotation: 0, verticalHeight: 0.9, inventoryNumber: "DOCK-0001" },
  { id: "D-02", name: "Outbound dock", kind: "Dock", x: 870, y: 520, width: 118, height: 58, rotation: 0, verticalHeight: 0.9, inventoryNumber: "DOCK-0002" },
  { id: "TR-09", name: "Truck TR-09", kind: "Truck", x: 130, y: 585, width: 180, height: 82, rotation: 0, verticalHeight: 3, inventoryNumber: "FLT-TR-0009", manufacturer: "Demo fleet", model: "Box truck" },
  { id: "TR-12", name: "Truck TR-12", kind: "Truck", x: 870, y: 585, width: 180, height: 82, rotation: 0, verticalHeight: 3, inventoryNumber: "FLT-TR-0012", manufacturer: "Demo fleet", model: "Box truck" },
  { id: "Z-01", name: "Inbound staging", kind: "Work zone", x: 165, y: 425, width: 190, height: 94, rotation: 0, verticalHeight: 0.05, inventoryNumber: "ZONE-0001" },
  { id: "Z-02", name: "Packing & stage", kind: "Work zone", x: 835, y: 425, width: 190, height: 94, rotation: 0, verticalHeight: 0.05, inventoryNumber: "ZONE-0002" },
  { id: "A-01", name: "Main aisle", kind: "Aisle", x: 495, y: 208, width: 800, height: 30, rotation: 0, verticalHeight: 0.03, inventoryNumber: "AISLE-0001" },
  { id: "FL-07", name: "Forklift FL-07", kind: "Forklift", x: 490, y: 465, width: 62, height: 38, rotation: 0, verticalHeight: 2.4, inventoryNumber: "FLT-0007" },
  { id: "PLT-1048", name: "Pallet PLT-1048", kind: "Pallet", x: 715, y: 430, width: 74, height: 50, rotation: 0, verticalHeight: 1.1, inventoryNumber: "PLT-1048" },
  { id: "C-01", name: "Column 01", kind: "Column", x: 80, y: 90, width: 24, height: 24, rotation: 0, verticalHeight: 8, inventoryNumber: "COL-0001" },
  { id: "C-02", name: "Column 02", kind: "Column", x: 920, y: 90, width: 24, height: 24, rotation: 0, verticalHeight: 8, inventoryNumber: "COL-0002" },
];

const defaultVerticalHeights: Record<WarehouseElementKind, number> = {
  Rack: 4.2,
  Dock: 0.9,
  Truck: 3,
  "Work zone": 0.05,
  Aisle: 0.03,
  Table: 0.8,
  Box: 0.8,
  Column: 8,
  Forklift: 2.4,
  Pallet: 1.1,
};

export function getElementVerticalHeight(item: WarehouseLayoutItem) {
  return item.verticalHeight ?? defaultVerticalHeights[item.kind];
}

export function migrateWarehouseLayout(layout: WarehouseLayoutItem[], version: number) {
  if (version >= WAREHOUSE_LAYOUT_SCHEMA_VERSION) return layout;
  const existingIds = new Set(layout.map((item) => item.id));
  const newlyAddedDefaults = DEFAULT_WAREHOUSE_LAYOUT.filter((item) => item.kind === "Truck" && !existingIds.has(item.id));
  return [...layout, ...newlyAddedDefaults];
}

export function isWarehouseLayout(value: unknown): value is WarehouseLayoutItem[] {
  const kinds: WarehouseElementKind[] = ["Rack", "Dock", "Truck", "Work zone", "Aisle", "Table", "Box", "Column", "Forklift", "Pallet"];
  return Array.isArray(value) && value.every((item) =>
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    kinds.includes(item.kind) &&
    [item.x, item.y, item.width, item.height, item.rotation].every((number) => typeof number === "number" && Number.isFinite(number)) &&
    [item.inventoryNumber, item.manufacturer, item.model, item.notes].every((field) => field === undefined || typeof field === "string") &&
    (item.verticalHeight === undefined || (typeof item.verticalHeight === "number" && Number.isFinite(item.verticalHeight)))
  );
}

export function isWarehouseSettings(value: unknown): value is WarehouseSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return typeof settings.name === "string" && settings.name.length > 0 &&
    [settings.width, settings.depth, settings.clearHeight].every((dimension) =>
      typeof dimension === "number" && Number.isFinite(dimension) && dimension > 0
    );
}
