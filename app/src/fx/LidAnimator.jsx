import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as garageStore from "../garage/garageStore";
import * as sceneObjects from "../garage/sceneObjects";
import { applyPartOverride, resetToBase } from "../garage/compose";

const LID_OPEN_S = 2.4;  // seconds to swing fully open
const LID_CLOSE_S = 1.6; // seconds to swing fully closed

// Smooth animated lid for the BBQ Bike. Replaces the instant binary open/close
// in applyOverrides: runs every frame via useFrame, lerps toward the target
// (open when a prop stands on the grate, closed otherwise), and writes the
// interpolated rotation delta directly onto the lid meshes.
//
// applyOverrides still resets each part to its base + static part-override
// pose. LidAnimator fires after (useFrame runs after subscription callbacks in
// the same RAF tick) and re-applies the smooth rotation, so the lid is correct
// before every rendered frame.
export default function LidAnimator({ modelScene, product, partIndex, partBasesRef, propSurfaceBox }) {
  const lidTRef = useRef(0);
  const hingeDataRef = useRef(null);

  // Invalidate the hinge-data cache whenever the model or part index is replaced.
  useEffect(() => {
    hingeDataRef.current = null;
  }, [modelScene, partIndex]);

  useFrame((_, dt) => {
    const spec = product?.propSurface?.lid;
    if (!spec || !partIndex?.ok || !modelScene) return;

    // Build hinge-data cache once per model load.
    if (!hingeDataRef.current) {
      const pin = modelScene.getObjectByName(spec.hinge);
      if (!pin) return;
      if (!pin.isMesh) {
        let meshPin = null;
        pin.traverse(o => { if (!meshPin && o.isMesh && o.geometry) meshPin = o; });
        if (!meshPin) return;
        if (!meshPin.geometry.boundingBox) meshPin.geometry.computeBoundingBox();
        modelScene.updateWorldMatrix(true, true);
        const inv = modelScene.matrixWorld.clone().invert();
        const c = new THREE.Vector3();
        meshPin.geometry.boundingBox.clone()
          .applyMatrix4(inv.clone().multiply(meshPin.matrixWorld))
          .getCenter(c);
        const lidNames = new Set(spec.nodes);
        const lidParts = partIndex.parts.filter((p) =>
          p.id.split("/").some((seg) => lidNames.has(seg.replace(/~\d+$/, "")))
        );
        if (lidParts.length === 0) return;
        hingeDataRef.current = { c, inv, lidParts };
        return;
      }
      if (!pin.geometry) return;
      modelScene.updateWorldMatrix(true, true);
      const inv = modelScene.matrixWorld.clone().invert();
      if (!pin.geometry.boundingBox) pin.geometry.computeBoundingBox();
      const c = new THREE.Vector3();
      pin.geometry.boundingBox.clone()
        .applyMatrix4(inv.clone().multiply(pin.matrixWorld))
        .getCenter(c);
      const lidNames = new Set(spec.nodes);
      const lidParts = partIndex.parts.filter((p) =>
        p.id.split("/").some((seg) => lidNames.has(seg.replace(/~\d+$/, "")))
      );
      if (lidParts.length === 0) return;
      hingeDataRef.current = { c, inv, lidParts };
    }

    const { c, inv, lidParts } = hingeDataRef.current;

    // Determine whether the lid should be open.
    const layout = garageStore.getLayout();
    const sb = propSurfaceBox();
    const target = sceneObjects.lidShouldOpen(layout?.items ?? [], sb) ? 1 : 0;

    // Lerp toward target.
    const speed = 1 / (target > lidTRef.current ? LID_OPEN_S : LID_CLOSE_S);
    const prev = lidTRef.current;
    lidTRef.current =
      target > prev
        ? Math.min(1, prev + speed * dt)
        : Math.max(0, prev - speed * dt);

    const lidT = lidTRef.current;
    // Skip only when fully closed AND target is closed — avoids re-applying 0°
    // every frame, but never skips when the lid is open (applyOverrides may have
    // just reset the mesh to base pose on a store change).
    if (lidT === 0 && target === 0) return;

    // Rotation matrix at current angle.
    const rot = new THREE.Matrix4()
      .makeTranslation(c.x, c.y, 0)
      .multiply(
        new THREE.Matrix4().makeRotationZ(
          THREE.MathUtils.degToRad(lidT * spec.angleDeg)
        )
      )
      .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, 0));

    const bases = partBasesRef?.current;
    if (!bases) return;
    const item = layout?.items.find((i) => i.itemId === "i0");
    const overrideMap = item?.parts ?? {};

    for (const part of lidParts) {
      const mesh = part.ref;
      const base = bases.get(mesh);
      if (!base) continue;

      // Reset mesh to base + any static part overrides.
      const ov = Object.prototype.hasOwnProperty.call(overrideMap, part.id)
        ? overrideMap[part.id]
        : undefined;
      const pose = ov ? applyPartOverride(base, ov) : resetToBase(base);
      if (!pose) continue;
      mesh.position.fromArray(pose.pos);
      mesh.quaternion.fromArray(pose.quat);
      mesh.scale.fromArray(pose.scale);

      // Apply the rotation delta in the mesh's parent frame.
      const a = inv.clone().multiply(mesh.parent.matrixWorld);
      const delta = a.clone().invert().multiply(rot).multiply(a);
      new THREE.Matrix4()
        .compose(mesh.position, mesh.quaternion, mesh.scale)
        .premultiply(delta)
        .decompose(mesh.position, mesh.quaternion, mesh.scale);
    }
  });

  return null;
}
