"use client";

import type { ChangeEvent } from "react";
import type { WarehouseSettings } from "./warehouse-layout";

type Props = {
  settings: WarehouseSettings;
  onChange: (settings: WarehouseSettings) => void;
};

export default function WarehouseSettingsFields({ settings, onChange }: Props) {
  function updateField(field: keyof WarehouseSettings, event: ChangeEvent<HTMLInputElement>) {
    const value = field === "name"
      ? event.currentTarget.value
      : field === "clearHeight"
        ? Math.max(3, Math.min(40, Number(event.currentTarget.value)))
        : Math.max(8, Math.min(200, Number(event.currentTarget.value)));
    onChange({ ...settings, [field]: value });
  }

  return (
    <section className="warehouse-size-strip" aria-label="Warehouse dimensions">
      <div className="warehouse-size-heading">
        <span className="warehouse-size-mark">WH</span>
        <div>
          <p>Facility settings</p>
          <span>Dimensions in metres</span>
        </div>
      </div>
      <label>
        <span>Warehouse name</span>
        <input value={settings.name} maxLength={32} onChange={(event) => updateField("name", event)} />
      </label>
      <label>
        <span>Length</span>
        <div><input type="number" min="8" max="200" step="0.5" value={settings.width} onChange={(event) => updateField("width", event)} /><b>m</b></div>
      </label>
      <label>
        <span>Depth</span>
        <div><input type="number" min="8" max="200" step="0.5" value={settings.depth} onChange={(event) => updateField("depth", event)} /><b>m</b></div>
      </label>
      <label>
        <span>Clear height</span>
        <div><input type="number" min="3" max="40" step="0.5" value={settings.clearHeight} onChange={(event) => updateField("clearHeight", event)} /><b>m</b></div>
      </label>
    </section>
  );
}
