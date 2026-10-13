"use client";

import { OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { getElementVerticalHeight, type WarehouseElementKind, type WarehouseLayoutItem, type WarehouseSettings } from "./warehouse-layout";

type Props = {
  layout: WarehouseLayoutItem[];
  warehouseSettings: WarehouseSettings;
  selectedId: string | null;
  mode: "translate" | "rotate" | "scale";
  gridVisible: boolean;
  onSelect: (item: WarehouseLayoutItem, group: Group) => void;
  onClearSelection: () => void;
  onTransformEnd: () => void;
};

const palettes: Record<WarehouseElementKind, { color: string; selected: string }> = {
  Rack: { color: "#75848a", selected: "#f28c45" },
  Dock: { color: "#d98249", selected: "#ffc18f" },
  Truck: { color: "#7a8a96", selected: "#ffc18f" },
  "Work zone": { color: "#628e82", selected: "#ffc18f" },
  Aisle: { color: "#647a7d", selected: "#ffc18f" },
  Table: { color: "#947153", selected: "#ffc18f" },
  Box: { color: "#c0a27c", selected: "#ffc18f" },
  Column: { color: "#9ba6a6", selected: "#f28c45" },
  Forklift: { color: "#e58a42", selected: "#ffc18f" },
  Pallet: { color: "#aa774b", selected: "#ffc18f" },
};

function toWorldPosition(item: WarehouseLayoutItem): [number, number, number] {
  return [(item.x / 1000) * 28 - 14, 0, (item.y / 620) * 19 - 9.5];
}

function LayoutElement({ item, selected, onSelect }: {
  item: WarehouseLayoutItem;
  selected: boolean;
  onSelect: (item: WarehouseLayoutItem, group: Group) => void;
}) {
  const groupRef = useRef<Group>(null);
  const color = selected ? palettes[item.kind].selected : palettes[item.kind].color;
  const width = Math.max(0.55, (item.width / 1000) * 28);
  const depth = Math.max(0.55, (item.height / 620) * 19);
  const rotation = (item.rotation * Math.PI) / 180;
  const verticalHeight = getElementVerticalHeight(item);

  useEffect(() => {
    if (selected && groupRef.current) onSelect(item, groupRef.current);
  }, [item, onSelect, selected]);

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (groupRef.current) onSelect(item, groupRef.current);
  }

  return (
    <group
      ref={groupRef}
      position={toWorldPosition(item)}
      rotation={[0, rotation, 0]}
      onClick={select}
      onPointerOver={() => (document.body.style.cursor = "grab")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {item.kind === "Rack" && (
        <>
          {[-depth / 2, depth / 2].flatMap((z) => [-width / 2, width / 2].map((x) => (
            <mesh key={`${x}-${z}`} position={[x, verticalHeight / 2, z]}>
              <boxGeometry args={[0.12, verticalHeight, 0.12]} />
              <meshStandardMaterial color={color} metalness={0.38} roughness={0.52} />
            </mesh>
          )))}
          {[-depth / 2, depth / 2].flatMap((z) => [0.2, 0.5, 0.8].map((level) => (
            <mesh key={`${z}-${level}`} position={[0, verticalHeight * level, z]}>
              <boxGeometry args={[width, 0.1, 0.14]} />
              <meshStandardMaterial color="#df884a" metalness={0.28} roughness={0.48} />
            </mesh>
          )))}
          {[-0.32, 0, 0.32].map((x) => (
            <mesh key={x} position={[x * width, 0.9, 0]}>
              <boxGeometry args={[width * 0.24, 0.52, depth * 0.72]} />
              <meshStandardMaterial color="#b88155" roughness={0.82} />
            </mesh>
          ))}
        </>
      )}

      {item.kind === "Dock" && (
        <>
          <mesh position={[0, verticalHeight * 0.08, 0]}>
            <boxGeometry args={[width, verticalHeight * 0.16, depth]} />
            <meshStandardMaterial color={color} roughness={0.76} />
          </mesh>
          {[[-width / 2, 0], [width / 2, 0], [0, -depth / 2], [0, depth / 2]].map(([x, z]) => (
            <mesh key={`${x}-${z}`} position={[x, verticalHeight * 0.5, z]}>
              <boxGeometry args={x === 0 ? [width, verticalHeight, 0.08] : [0.08, verticalHeight, depth]} />
              <meshStandardMaterial color="#89969a" metalness={0.25} roughness={0.56} />
            </mesh>
          ))}
        </>
      )}

      {item.kind === "Truck" && (
        <>
          <mesh position={[-width * 0.18, verticalHeight * 0.48, 0]}>
            <boxGeometry args={[width * 0.62, verticalHeight * 0.9, depth]} />
            <meshStandardMaterial color="#d9dedb" roughness={0.72} />
          </mesh>
          <mesh position={[width * 0.34, verticalHeight * 0.4, 0]}>
            <boxGeometry args={[width * 0.28, verticalHeight * 0.75, depth * 0.92]} />
            <meshStandardMaterial color={color} metalness={0.16} roughness={0.48} />
          </mesh>
          {[-width * 0.28, width * 0.28].map((x) => (
            <mesh key={x} position={[x, 0.25, 0]}>
              <cylinderGeometry args={[0.24, 0.24, depth * 0.9, 12]} />
              <meshStandardMaterial color="#202931" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}

      {item.kind === "Work zone" && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial color={color} transparent opacity={0.34} side={2} />
        </mesh>
      )}

      {item.kind === "Aisle" && (
        <>
          <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, depth]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} side={2} />
          </mesh>
          <mesh position={[0, 0.035, 0]}>
            <boxGeometry args={[width * 0.88, 0.025, 0.04]} />
            <meshBasicMaterial color="#bbc6bd" />
          </mesh>
        </>
      )}

      {item.kind === "Table" && (
        <>
          <mesh position={[0, verticalHeight * 0.92, 0]}>
            <boxGeometry args={[width, 0.12, depth]} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
          {[-width * 0.42, width * 0.42].flatMap((x) => [-depth * 0.38, depth * 0.38].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, verticalHeight * 0.46, z]}>
              <boxGeometry args={[0.09, verticalHeight * 0.92, 0.09]} />
              <meshStandardMaterial color="#626e70" metalness={0.32} roughness={0.54} />
            </mesh>
          )))}
        </>
      )}

      {item.kind === "Box" && (
        <mesh position={[0, verticalHeight / 2, 0]}>
          <boxGeometry args={[width, verticalHeight, depth]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}

      {item.kind === "Column" && (
        <mesh position={[0, verticalHeight / 2, 0]}>
          <cylinderGeometry args={[Math.max(0.16, width / 2), Math.max(0.2, width / 2), verticalHeight, 12]} />
          <meshStandardMaterial color={color} metalness={0.32} roughness={0.5} />
        </mesh>
      )}

      {item.kind === "Forklift" && (
        <group scale={[1, verticalHeight / 2.4, 1]}>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[width, 0.72, depth]} />
            <meshStandardMaterial color={color} metalness={0.2} roughness={0.48} />
          </mesh>
          <mesh position={[-width * 0.08, 1.05, 0]}>
            <boxGeometry args={[width * 0.55, 0.58, depth * 0.78]} />
            <meshStandardMaterial color="#364247" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[width * 0.46, 0.93, 0]}>
            <boxGeometry args={[0.08, 1.6, 0.08]} />
            <meshStandardMaterial color="#efaa67" metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[width * 0.62, 0.18, 0]}>
            <boxGeometry args={[width * 0.4, 0.08, 0.08]} />
            <meshStandardMaterial color="#efaa67" />
          </mesh>
        </group>
      )}

      {item.kind === "Pallet" && (
        <>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[width, 0.24, depth]} />
            <meshStandardMaterial color="#a3764f" roughness={0.9} />
          </mesh>
          {[-width * 0.3, 0, width * 0.3].map((x) => (
            <mesh key={x} position={[x, 0.15 + verticalHeight / 2, 0]}>
              <boxGeometry args={[width * 0.28, verticalHeight, depth * 0.78]} />
              <meshStandardMaterial color={color} roughness={0.82} />
            </mesh>
          ))}
        </>
      )}

      <mesh position={[0, 1.7, 0]} onClick={select}>
        <boxGeometry args={[Math.max(width, 0.8), 3.4, Math.max(depth, 0.8)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WarehouseFloor({ gridVisible, onClearSelection, warehouseSettings }: { gridVisible: boolean; onClearSelection: () => void; warehouseSettings: WarehouseSettings }) {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onClearSelection();
        }}
      >
        <planeGeometry args={[30, 21]} />
        <meshStandardMaterial color="#303a3d" roughness={0.92} />
      </mesh>
      {gridVisible && <gridHelper args={[30, 30, "#697273", "#4b5657"]} position={[0, -0.04, 0]} />}
      <mesh position={[0, warehouseSettings.clearHeight / 2, -10.3]}>
        <boxGeometry args={[30, warehouseSettings.clearHeight, 0.4]} />
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
    </>
  );
}

export default function WarehouseLayout3D({ layout, warehouseSettings, selectedId, mode, gridVisible, onSelect, onClearSelection, onTransformEnd }: Props) {
  const selectedElement = layout.find((item) => item.id === selectedId);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const warehouseScale = Math.max(warehouseSettings.width / 30, warehouseSettings.depth / 21);

  return (
    <Canvas
      shadows="basic"
      dpr={[1, 1.5]}
      camera={{ position: [15 * warehouseScale, 17 * warehouseScale, 22 * warehouseScale], fov: 42, near: 0.1, far: 180 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      fallback={<div className="warehouse-fallback" role="status">3D editing requires WebGL. Use the 2D plan editor instead.</div>}
      onPointerMissed={onClearSelection}
    >
      <color attach="background" args={["#101820"]} />
      <fog attach="fog" args={["#101820", 34, 58]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[8, 18, 12]} intensity={2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <hemisphereLight args={["#dce7ed", "#303a3b", 0.8]} />

      <group scale={[warehouseSettings.width / 30, 1, warehouseSettings.depth / 21]}>
        <WarehouseFloor gridVisible={gridVisible} onClearSelection={onClearSelection} warehouseSettings={warehouseSettings} />
        {layout.map((item) => (
          <LayoutElement
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={(nextItem, group) => {
              setSelectedGroup(group);
              onSelect(nextItem, group);
            }}
          />
        ))}
      </group>
      {selectedElement && selectedGroup && (
        <TransformControls
          object={selectedGroup}
          mode={mode}
          space="local"
          size={0.8}
          translationSnap={0.5}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.1}
          showX={mode !== "rotate"}
          showY={mode === "rotate"}
          showZ={mode !== "rotate"}
          onMouseUp={onTransformEnd}
        />
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={8 * warehouseScale} maxDistance={38 * warehouseScale} maxPolarAngle={Math.PI / 2.05} target={[0, 0, 0]} />
    </Canvas>
  );
}
