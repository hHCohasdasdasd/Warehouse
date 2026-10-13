"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { getElementVerticalHeight, type WarehouseLayoutItem, type WarehouseSettings } from "./warehouse-layout";

export type WarehouseObject = {
  id: string;
  label: string;
  category: "Storage rack" | "Loading dock" | "Work zone" | "Forklift" | "Pallet" | "Truck";
  status: string;
  location: string;
  detail: string;
  inventoryNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  dimensions?: string;
};

type SceneProps = {
  layout: WarehouseLayoutItem[];
  warehouseSettings: WarehouseSettings;
  running: boolean;
  speed: number;
  layer: string;
  preset: string;
  selectedId: string | null;
  onSelect: (item: WarehouseObject) => void;
};

function selectionForLayout(item: WarehouseLayoutItem, warehouseSettings: WarehouseSettings): WarehouseObject {
  const categoryByKind: Record<WarehouseLayoutItem["kind"], WarehouseObject["category"]> = {
    Rack: "Storage rack",
    Dock: "Loading dock",
    Truck: "Truck",
    "Work zone": "Work zone",
    Aisle: "Work zone",
    Table: "Work zone",
    Box: "Pallet",
    Column: "Work zone",
    Forklift: "Forklift",
    Pallet: "Pallet",
  };
  return {
    id: item.id,
    label: item.name,
    category: categoryByKind[item.kind],
    status: `${item.kind} · saved layout`,
    location: `${(item.x / 1000 * warehouseSettings.width).toFixed(1)} m from west · ${(item.y / 620 * warehouseSettings.depth).toFixed(1)} m from entrance`,
    detail: item.notes || "Position and size from the editable saved layout.",
    inventoryNumber: item.inventoryNumber || "Not assigned",
    manufacturer: item.manufacturer || "Not specified",
    model: item.model || "Not specified",
    notes: item.notes || "No notes",
    dimensions: `${(item.width / 1000 * warehouseSettings.width * 28 / 30).toFixed(1)} × ${(item.height / 620 * warehouseSettings.depth * 19 / 21).toFixed(1)} × ${getElementVerticalHeight(item)} m`,
  };
}

function toWorldPosition(item: WarehouseLayoutItem) {
  return {
    x: (item.x / 1000) * 28 - 14,
    z: (item.y / 620) * 19 - 9.5,
  };
}

function Rack({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const frameColor = selected ? "#f28c45" : "#71808c";
  const beamColor = selected ? "#ffad69" : "#d66e32";
  const position = toWorldPosition(item);
  const width = Math.max(1.2, (item.width / 1000) * 28);
  const depth = Math.max(0.8, (item.height / 620) * 19);
  const verticalHeight = getElementVerticalHeight(item);

  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {[-width / 2, width / 2].flatMap((x) => [-depth / 2, depth / 2].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, verticalHeight / 2, z]}>
          <boxGeometry args={[0.12, verticalHeight, 0.12]} />
          <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.48} />
        </mesh>
      )))}
      {[-depth / 2, depth / 2].flatMap((z) => [0.2, 0.5, 0.8].map((fraction) => (
        <mesh key={`${z}-${fraction}`} position={[0, verticalHeight * fraction, z]}>
          <boxGeometry args={[width, 0.1, 0.14]} />
          <meshStandardMaterial color={beamColor} metalness={0.3} roughness={0.5} />
        </mesh>
      )))}
      {[0, 1, 2].map((slot) => (
        <mesh key={slot} position={[-width * 0.34 + slot * (width * 0.34), verticalHeight * (0.25 + (slot % 2) * 0.32), 0]}>
          <boxGeometry args={[width * 0.24, Math.min(0.52, verticalHeight * 0.18), depth * 0.72]} />
          <meshStandardMaterial color={slot % 2 ? "#bb6538" : "#ca8b5a"} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[0, verticalHeight / 2, 0]}>
        <boxGeometry args={[width + 0.3, verticalHeight + 0.2, depth + 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WorkZone({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const position = toWorldPosition(item);
  const width = Math.max(1, (item.width / 1000) * 28);
  const depth = Math.max(1, (item.height / 620) * 19);
  const isAisle = item.kind === "Aisle";
  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={selected ? "#f28c45" : isAisle ? "#647a7d" : "#6d9b8d"} transparent opacity={selected ? 0.32 : isAisle ? 0.3 : 0.19} />
      </mesh>
      {isAisle && <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[width * 0.88, 0.025, 0.04]} />
        <meshBasicMaterial color="#bbc6bd" />
      </mesh>}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FurnitureElement({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const position = toWorldPosition(item);
  const width = Math.max(0.7, (item.width / 1000) * 28);
  const depth = Math.max(0.7, (item.height / 620) * 19);
  const verticalHeight = getElementVerticalHeight(item);
  const color = selected ? "#ffb26e" : item.kind === "Table" ? "#947153" : "#c0a27c";
  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {item.kind === "Table" ? (
        <>
          <mesh position={[0, verticalHeight * 0.92, 0]}>
            <boxGeometry args={[width, 0.12, depth]} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
          {[-width * 0.42, width * 0.42].flatMap((x) => [-depth * 0.38, depth * 0.38].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, verticalHeight * 0.46, z]}>
              <boxGeometry args={[0.08, verticalHeight * 0.92, 0.08]} />
              <meshStandardMaterial color="#626e70" metalness={0.32} roughness={0.54} />
            </mesh>
          )))}
        </>
      ) : (
        <mesh position={[0, verticalHeight / 2, 0]}>
          <boxGeometry args={[width, verticalHeight, depth]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[width, 2, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Dock({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const position = toWorldPosition(item);
  const width = Math.max(1.4, (item.width / 1000) * 28);
  const depth = Math.max(1.2, (item.height / 620) * 19);
  const verticalHeight = getElementVerticalHeight(item);
  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={selected ? "#ffb26e" : "#f28c45"} transparent opacity={selected ? 0.38 : 0.2} />
      </mesh>
      {[[-width / 2, 0], [width / 2, 0], [0, -depth / 2], [0, depth / 2]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, verticalHeight / 2, z]}>
          <boxGeometry args={x === 0 ? [width, verticalHeight, 0.08] : [0.08, verticalHeight, depth]} />
          <meshStandardMaterial color={selected ? "#f28c45" : "#78858a"} metalness={0.3} roughness={0.58} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[width, 1.1, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Column({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const position = toWorldPosition(item);
  const verticalHeight = getElementVerticalHeight(item);
  return (
    <mesh
      position={[position.x, verticalHeight / 2, position.z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <cylinderGeometry args={[0.22, 0.28, verticalHeight, 12]} />
      <meshStandardMaterial color={selected ? "#f28c45" : "#8c999d"} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

function Forklift({ item, running, speed, onSelect, selected }: {
  item: WarehouseLayoutItem;
  running: boolean;
  speed: number;
  onSelect: (item: WarehouseLayoutItem) => void;
  selected: boolean;
}) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const position = toWorldPosition(item);
  const verticalHeight = getElementVerticalHeight(item);

  useFrame((_state, delta) => {
    if (!group.current || !running) return;
    elapsed.current += delta * speed;
    const phase = elapsed.current * 0.25;
    const progress = (Math.sin(phase) + 1) / 2;
    group.current.position.x = position.x - 2 + progress * 4;
    group.current.position.z = position.z + Math.sin(phase * 2) * 0.5;
    group.current.rotation.y = progress > 0.92 ? Math.PI : 0;
  });

  return (
    <group
      ref={group}
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <group scale={[1, verticalHeight / 2.4, 1]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.35, 0.62, 0.85]} />
        <meshStandardMaterial color={selected ? "#ffb26e" : "#f28c45"} metalness={0.24} roughness={0.48} />
      </mesh>
      <mesh position={[-0.12, 1.13, 0.05]}>
        <boxGeometry args={[0.75, 0.72, 0.72]} />
        <meshStandardMaterial color="#34414b" metalness={0.3} roughness={0.38} />
      </mesh>
      <mesh position={[0.55, 1.13, 0.05]}>
        <boxGeometry args={[0.08, 1.85, 0.08]} />
        <meshStandardMaterial color="#e58a42" metalness={0.45} roughness={0.4} />
      </mesh>
      <mesh position={[0.86, 0.28, 0.16]}>
        <boxGeometry args={[0.78, 0.09, 0.08]} />
        <meshStandardMaterial color="#f3a65f" metalness={0.35} roughness={0.4} />
      </mesh>
      {[-0.42, 0.42].map((z) => (
        <mesh key={z} position={[-0.35, 0.25, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.12, 16]} />
          <meshStandardMaterial color="#202931" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.8, 2, 1.35]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      </group>
    </group>
  );
}

function Truck({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem) => void;
}) {
  const position = toWorldPosition(item);
  const width = Math.max(1.6, (item.width / 1000) * 28);
  const depth = Math.max(0.8, (item.height / 620) * 19);
  const verticalHeight = getElementVerticalHeight(item);
  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[-width * 0.18, verticalHeight * 0.48, 0]}>
        <boxGeometry args={[width * 0.62, verticalHeight * 0.9, depth]} />
        <meshStandardMaterial color="#d9dedb" roughness={0.72} />
      </mesh>
      <mesh position={[width * 0.34, verticalHeight * 0.4, 0]}>
        <boxGeometry args={[width * 0.28, verticalHeight * 0.75, depth * 0.92]} />
        <meshStandardMaterial color={selected ? "#ffb26e" : "#7a8a96"} metalness={0.16} roughness={0.48} />
      </mesh>
      {[-width * 0.28, width * 0.28].flatMap((xPos) => [-depth * 0.38, depth * 0.38].map((zPos) => (
        <mesh key={`${xPos}-${zPos}`} position={[xPos, 0.28, zPos]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.16, 16]} />
          <meshStandardMaterial color="#202931" roughness={0.9} />
        </mesh>
      )))}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[width, Math.max(2, verticalHeight), depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Pallet({ item, selected, onSelect }: { item: WarehouseLayoutItem; selected: boolean; onSelect: (item: WarehouseLayoutItem) => void }) {
  const position = toWorldPosition(item);
  const width = Math.max(0.8, (item.width / 1000) * 28);
  const depth = Math.max(0.7, (item.height / 620) * 19);
  const verticalHeight = getElementVerticalHeight(item);
  return (
    <group
      position={[position.x, 0, position.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[width, 0.25, depth]} />
        <meshStandardMaterial color="#aa774b" roughness={0.9} />
      </mesh>
      {[-0.28, 0, 0.28].map((fraction) => (
        <mesh key={fraction} position={[fraction * width, 0.16 + verticalHeight * 0.42, 0]}>
          <boxGeometry args={[width * 0.28, verticalHeight * 0.82, depth * 0.78]} />
          <meshStandardMaterial color={selected ? "#ffb26e" : "#caa67e"} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ preset, controlsRef, settings }: {
  preset: string;
  settings: WarehouseSettings;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const widthScale = settings.width / 30;
  const depthScale = settings.depth / 21;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (preset === "inbound") {
      camera.position.set(10 * widthScale, 8, 15 * depthScale);
      controls.target.set(8 * widthScale, 0.5, 8 * depthScale);
    } else if (preset === "dispatch") {
      camera.position.set(12 * widthScale, 10, 11 * depthScale);
      controls.target.set(2 * widthScale, 0, 6 * depthScale);
    } else {
      camera.position.set(14 * widthScale, 13, 19 * depthScale);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  }, [camera, controlsRef, preset, widthScale, depthScale]);

  return null;
}

function Warehouse({ layout, warehouseSettings, running, speed, layer, preset, selectedId, onSelect }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectLayoutItem = (item: WarehouseLayoutItem) => onSelect(selectionForLayout(item, warehouseSettings));
  const widthScale = warehouseSettings.width / 30;
  const depthScale = warehouseSettings.depth / 21;
  const cameraScale = Math.max(widthScale, depthScale);
  const showStorage = layer === "all" || layer === "storage";
  const showEquipment = layer === "all" || layer === "equipment";
  const showDispatch = layer === "all" || layer === "dispatch";

  return (
    <>
      <color attach="background" args={["#101820"]} />
      <fog attach="fog" args={["#101820", 25, 48]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[8, 16, 10]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#dce7ed", "#303a3b", 0.8]} />

      <group scale={[widthScale, 1, depthScale]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[30, 21]} />
        <meshStandardMaterial color="#303a3d" roughness={0.92} />
      </mesh>
      <gridHelper args={[30, 30, "#697273", "#4b5657"]} position={[0, -0.045, 0]} />
      <mesh position={[0, warehouseSettings.clearHeight / 2, -10.25]}>
        <boxGeometry args={[30, warehouseSettings.clearHeight, 0.35]} />
        <meshStandardMaterial color="#28343a" roughness={0.85} />
      </mesh>
      <mesh position={[-14.8, warehouseSettings.clearHeight / 2, 0]}>
        <boxGeometry args={[0.35, warehouseSettings.clearHeight, 20.5]} />
        <meshStandardMaterial color="#354146" roughness={0.85} />
      </mesh>
      <mesh position={[14.8, warehouseSettings.clearHeight / 2, 0]}>
        <boxGeometry args={[0.35, warehouseSettings.clearHeight, 20.5]} />
        <meshStandardMaterial color="#354146" roughness={0.85} />
      </mesh>

      {[-0.43, -0.23, 0, 0.23, 0.43].map((fraction) => (
        <mesh key={fraction} position={[fraction * 30, warehouseSettings.clearHeight / 2, -9.8]}>
          <boxGeometry args={[0.28, warehouseSettings.clearHeight, 0.35]} />
          <meshStandardMaterial color="#627076" metalness={0.35} roughness={0.6} />
        </mesh>
      ))}
      {[-0.38, -0.12, 0.12, 0.38].map((fraction) => (
        <mesh key={fraction} position={[0, warehouseSettings.clearHeight - 0.25, fraction * 21]}>
          <boxGeometry args={[29.6, 0.22, 0.22]} />
          <meshStandardMaterial color="#657177" metalness={0.35} roughness={0.58} />
        </mesh>
      ))}

      {showStorage && layout.filter((item) => item.kind === "Rack").map((rack) => (
        <Rack
          key={rack.id}
          item={rack}
          selected={selectedId === rack.id}
          onSelect={selectLayoutItem}
        />
      ))}

      {layout.filter((item) => item.kind === "Work zone" || item.kind === "Aisle").map((item) => (
        <WorkZone key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {layout.filter((item) => item.kind === "Table" || item.kind === "Box").map((item) => (
        <FurnitureElement key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {showDispatch && layout.filter((item) => item.kind === "Dock").map((item) => (
        <Dock key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {showDispatch && layout.filter((item) => item.kind === "Truck").map((item) => (
        <Truck key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {layout.filter((item) => item.kind === "Pallet").map((item) => (
        <Pallet key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {showStorage && layout.filter((item) => item.kind === "Column").map((item) => (
        <Column key={item.id} item={item} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}

      {showEquipment && layout.filter((item) => item.kind === "Forklift").map((item) => (
        <Forklift key={item.id} item={item} running={running} speed={speed} selected={selectedId === item.id} onSelect={selectLayoutItem} />
      ))}
      </group>

      <CameraRig preset={preset} controlsRef={controlsRef} settings={warehouseSettings} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8 * cameraScale}
        maxDistance={36 * cameraScale}
        maxPolarAngle={Math.PI / 2.08}
        target={[0, 0, 0]}
      />
    </>
  );
}

type BoundaryState = { failed: boolean };
type BoundaryProps = { children: ReactNode; fallback: ReactNode };

class SceneBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function WarehouseScene(props: SceneProps) {
  return (
    <SceneBoundary
      fallback={
        <div className="warehouse-fallback" role="status">
          <span className="warehouse-fallback-mark">3D</span>
          <div>
            <strong>3D view unavailable</strong>
            <p>WebGL is unavailable in this browser. Use the operational panels below instead.</p>
          </div>
        </div>
      }
    >
      <Canvas
        shadows="basic"
        dpr={[1, 1.5]}
        camera={{ position: [14, 13, 19], fov: 38, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        fallback={
          <div className="warehouse-fallback" role="status">
            <span className="warehouse-fallback-mark">3D</span>
            <div>
              <strong>3D view unavailable</strong>
              <p>WebGL is unavailable in this browser. Use the operational panels below instead.</p>
            </div>
          </div>
        }
      >
        <Warehouse {...props} />
      </Canvas>
    </SceneBoundary>
  );
}
