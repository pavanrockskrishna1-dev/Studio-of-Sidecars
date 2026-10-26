"""Halloween BBQ Ride reel - Blender 3.6 (EEVEE), 1080x1920, 30 fps, 16 s.

Builds the night scene from the studio's own GLBs (app/public/models), animates
the grill fire, embers, falling leaves and the rigged pumpkin crab, renders
five camera shots to PNG frames, then assembles the MP4 with captions.

  blender -b -P scripts/halloween_reel_blender.py                 full render + MP4
  blender -b -P scripts/halloween_reel_blender.py -- --preview    5 half-size stills
  blender -b -P scripts/halloween_reel_blender.py -- --encode     MP4 from existing frames

Coordinates: glTF Y-up becomes Blender Z-up, so the bike's front (glTF +Z,
headlight + BBQ RIDE door) faces Blender -Y (the camera side) and the grill /
sidecar side is +X. Every prop GLB is normalised to ~1 unit, so each one is
given its real-world scale here.
"""

import math
import os
import random
import sys

import bpy
from mathutils import Euler, Matrix, Vector

try:
    APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
except NameError:  # run from pasted text (render service): no file path
    APP = os.getcwd()
MODELS = os.path.join(APP, "public", "models")
ASSETS_DIR = os.environ.get("JR_ASSETS_DIR", "")  # set by the JANCTION render service
OUT = os.path.join(APP, "exports", "halloween-reel")
FRAMES = os.path.join(OUT, "frames")
MP4 = os.path.join(APP, "exports", "halloween-bbq-ride-reel.mp4")

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PREVIEW = "--preview" in ARGS
ENCODE_ONLY = "--encode" in ARGS

FPS = 30
END = 480  # authored length (16 s); everything below is keyed on these frames
REEL_END = 240  # delivered length: 8 s. All keyframes are time-compressed by FACTOR after the build
FACTOR = (REEL_END - 1) / (END - 1)
random.seed(7)


def rf(frame):
    """Authored frame number -> delivered frame number."""
    return int(round(1 + (frame - 1) * FACTOR))


# ----------------------------------------------------------------- helpers

def nodes_on(idb):
    """Node tree of a material/world (Blender 5 is always node-based; older needs use_nodes)."""
    if idb.node_tree is None:
        idb.use_nodes = True
    return idb.node_tree


def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def pin(p, *names):
    """First Principled input that exists under any of these names (renamed in 4.0)."""
    for n in names:
        if n in p.inputs:
            return p.inputs[n]
    raise KeyError(names)


def try_set(obj, **kw):
    for k, v in kw.items():
        try:
            setattr(obj, k, v)
        except (AttributeError, TypeError, ValueError):
            pass


def mat(name, color, rough=0.6, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    nodes_on(m)
    p = principled(m)
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        pin(p, "Emission Color", "Emission").default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = strength
    return m


def _model_path(filename):
    local = os.path.join(MODELS, filename)
    if os.path.exists(local):
        return local
    base = os.path.basename(filename)
    for root, _, files in os.walk(ASSETS_DIR or "."):
        if base in files:
            return os.path.join(root, base)
    raise FileNotFoundError(filename)


_IMPORTED = {}  # filename -> the first copy's empty (later copies share its mesh data)


def _link_copy(src, parent):
    o = src.copy()  # shares mesh data and materials: no second set of textures in RAM
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    for c in src.children:
        _link_copy(c, o)
    return o


def import_glb(filename, loc=(0, 0, 0), rot_z=0.0, scale=1.0, name=None):
    """Imports a GLB under one empty and places that empty. Returns (empty, objects).
    A file already imported is linked-duplicated instead of loaded again."""
    root = bpy.data.objects.new(name or filename, None)
    bpy.context.scene.collection.objects.link(root)
    if filename in _IMPORTED:
        new = [_link_copy(c, root) for c in _IMPORTED[filename].children]
    else:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=_model_path(filename))
        new = [o for o in bpy.data.objects if o not in before]
        for o in new:
            if o.parent is None:
                o.parent = root
        _IMPORTED[filename] = root
    root.location = loc
    root.rotation_euler = Euler((0, 0, math.radians(rot_z)))
    root.scale = (scale, scale, scale)
    return root, new


def darken(root, color):
    bark = mat("Bark", color, 0.85)
    stack = [root]
    while stack:
        o = stack.pop()
        if o.type == "MESH":
            o.data.materials.clear()
            o.data.materials.append(bark)
        stack.extend(o.children)


def look_at_key(cam, target, frame, cam_loc, tgt_loc, lens):
    cam.location = cam_loc
    target.location = tgt_loc
    cam.data.lens = lens
    cam.keyframe_insert("location", frame=frame)
    target.keyframe_insert("location", frame=frame)
    cam.data.keyframe_insert("lens", frame=frame)


def set_interp(obj, kind):
    ad = obj.animation_data
    if not (ad and ad.action):
        return
    act = ad.action
    if hasattr(act, "fcurves"):  # Blender < 5
        curves = list(act.fcurves)
    else:  # 5.0 layered actions
        curves = [fc for layer in act.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = kind


def retime():
    """Squeeze every keyframe of every action toward frame 1 by FACTOR (8 s reel from the 16 s authoring)."""
    for act in bpy.data.actions:
        if hasattr(act, "fcurves"):
            curves = list(act.fcurves)
        else:
            curves = [fc for layer in act.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
        for fc in curves:
            for kp in fc.keyframe_points:
                for pt in (kp.co, kp.handle_left, kp.handle_right):
                    pt.x = 1 + (pt.x - 1) * FACTOR
            fc.update()


def setup_bloom(sc):
    """EEVEE Next has no bloom setting: a compositor Glare (Bloom) does it. Older EEVEE has use_bloom."""
    if hasattr(sc.eevee, "use_bloom"):
        sc.eevee.use_bloom = True
        sc.eevee.bloom_intensity = 0.06
        sc.eevee.bloom_threshold = 0.9
        return
    if hasattr(sc, "compositing_node_group"):  # 5.0
        ng = bpy.data.node_groups.new("Reel Compositor", "CompositorNodeTree")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        sc.compositing_node_group = ng
        nodes, links = ng.nodes, ng.links
        out = nodes.new("NodeGroupOutput")
    else:  # 4.2 - 4.5
        sc.use_nodes = True
        nodes, links = sc.node_tree.nodes, sc.node_tree.links
        nodes.clear()
        out = nodes.new("CompositorNodeComposite")
    rl = nodes.new("CompositorNodeRLayers")
    gl = nodes.new("CompositorNodeGlare")
    if "Type" in gl.inputs:  # 5.0: the glare type is a menu socket
        for t in ("Bloom", "Fog Glow"):
            try:
                gl.inputs["Type"].default_value = t
                break
            except (TypeError, ValueError):
                pass
    else:
        for t in ("BLOOM", "FOG_GLOW"):
            try:
                gl.glare_type = t
                break
            except TypeError:
                pass
    if "Threshold" in gl.inputs:
        gl.inputs["Threshold"].default_value = 0.9
        if "Strength" in gl.inputs:
            gl.inputs["Strength"].default_value = BLOOM_STRENGTH
        if "Size" in gl.inputs:
            gl.inputs["Size"].default_value = 0.6
    else:
        try_set(gl, threshold=0.9, mix=-0.8, size=7)
    links.new(rl.outputs["Image"], gl.inputs["Image"])
    links.new(gl.outputs["Image"], out.inputs[0])


BLOOM_STRENGTH = 0.5


# ----------------------------------------------------------------- scene

def clear_scene():
    if bpy.app.background:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        return
    # a live Blender window: empty the scene in place (a factory reset could crash it)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.armatures, bpy.data.images, bpy.data.actions):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)
    _IMPORTED.clear()


def build():
    clear_scene()
    sc = bpy.context.scene
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):  # 4.2-4.5 call it NEXT, 5.0 is back to plain
        try:
            sc.render.engine = eng
            break
        except TypeError:
            pass
    sc.render.resolution_x = 1080
    sc.render.resolution_y = 1920
    sc.render.resolution_percentage = 50 if PREVIEW else 100
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = END
    ee = sc.eevee
    # each of these exists only in some Blender versions; the rest are skipped
    try_set(ee, taa_render_samples=16, use_gtao=True, use_soft_shadows=True, shadow_cube_size="1024",
            shadow_cascade_size="2048", volumetric_tile_size="4", volumetric_samples=32, volumetric_start=0.5,
            volumetric_end=40, use_volumetric_lights=True, use_volumetric_shadows=True, use_shadows=True,
            shadow_pool_size="1024")  # 5.0: the default 512 MB pool overflows with ~30 lights
    setup_bloom(sc)
    # Filmic was removed in 4.0: AgX is its replacement
    for vt in ("Filmic", "AgX"):
        try:
            sc.view_settings.view_transform = vt
            break
        except TypeError:
            pass
    looks = [i.identifier for i in sc.view_settings.bl_rna.properties["look"].enum_items]
    sc.view_settings.look = next((l for l in looks if l.endswith("Medium High Contrast")), "None")
    sc.view_settings.exposure = -0.2

    # night sky
    world = bpy.data.worlds.new("Night")
    sc.world = world
    wnt = nodes_on(world)
    wnt.nodes["Background"].inputs[0].default_value = (0.006, 0.01, 0.03, 1)
    wnt.nodes["Background"].inputs[1].default_value = 1.0

    # ----- the BBQ Bike, lid open over the fire
    bike, bike_objs = import_glb("bbq-bike.glb", name="BBQ Bike")
    bpy.context.view_layer.update()
    hinge = Vector((0.63, 0.0, 1.255))
    open_lid = Matrix.Translation(hinge) @ Matrix.Rotation(math.radians(-85), 4, "Y") @ Matrix.Translation(-hinge)
    for o in bike_objs:
        if o.name.split(".")[0] in ("Lid_Main", "Lid_Rear"):
            o.matrix_world = open_lid @ o.matrix_world

    # ----- props (real-world scale)
    tree, _ = import_glb("bbqsmith_bare_tree.glb", (-1.75, 1.55, 0), 20, 3.4, "Tree L")
    darken(tree, (0.025, 0.02, 0.018))
    import_glb("bbqsmith_bare_tree.glb", (2.55, 1.45, 0), -40, 3.0, "Tree R")
    import_glb("bbqsmith_bare_tree.glb", (-0.4, 4.2, 0), 75, 3.8, "Tree Back")
    # Placements from the Halloween Set Editor page (BBQ Letters and Firewood removed there).
    crab, crab_objs = import_glb("props/halloween-pumpkin-crab.glb", (-0.83, -0.91, 0), -41, 0.924, "Pumpkin Crab")
    import_glb("bbqsmith_whisky_barrel.glb", (1.95, -1.83, 0), 15, 0.85, "Whisky Barrel")
    import_glb("bbqsmith_whisky_barrel.glb", (-1.45, -0.55, 0), -25, 0.75, "Whisky Barrel 2")
    # the half barrel sits on top of Whisky Barrel 2 (top at z 0.75); small crabs climb out of it
    import_glb("bbqsmith_half_barrel.glb", HALF_BARREL[0], HALF_BARREL[1], HALF_BARREL[2], "Half Barrel")
    import_glb("bbq_chicken_burger_v2.glb", (0.98, -1.7, 0), -15, 0.16, "Burger")
    import_glb("bbq_chicken_drumsticks_pair.glb", (0.55, -2.0, 0), 30, 0.22, "Drumsticks")
    # utensils hanging on the grill's sidecar-side wall
    import_glb("bbqsmith_hanging_utensils.glb", (1.07, -0.15, 0.66), 90, 0.6, "Utensils")
    # food on the grate (grate top z = 1.21, x 0.65..0.98, y -0.77..0.48), sized to read clearly
    import_glb("bbq_chicken_drumsticks_pair.glb", (0.82, -0.378, 1.21), 10, 0.26, "Grill Drumsticks")
    import_glb("bbq_chicken_wing_single.glb", (0.8, 0.02, 1.21), 70, 0.19, "Grill Wing")
    import_glb("bbq_chicken_wing_single.glb", (0.84, 0.28, 1.21), -20, 0.18, "Grill Wing 2")
    import_glb("bbq_chicken_burger.glb", (0.81, -0.66, 1.21), 0, 0.14, "Grill Burger")
    small_crabs = barrel_crabs()

    open_front_door(bike_objs)
    bats(bike)

    ground()
    pumpkins()
    fire()
    # everything that sits on the bike rides in with it
    riders = FIRE_OBJS + [o for o in bpy.data.objects if o.parent is None and o.name.startswith(("Grill ", "Utensils"))]
    bike_drive_in(bike, riders)
    # the bike's own placement from the page (riders follow it: they hang from it)
    bike.location = (-0.08, -0.03, 0)
    bike.rotation_euler = Euler((0, 0, math.radians(-5)))
    leaves()
    fog_and_moon()
    lights()
    animate_crab(crab_objs)
    glow_crab(crab, 1.0)
    for i, (root, objs) in enumerate(small_crabs):
        animate_crab(objs, phase=1.7 * (i + 1), speed=1.35)
        glow_crab(root, 0.45)
    cameras()
    retime()
    sc.frame_end = REEL_END


HALF_BARREL = ((-1.53, -0.734, 0.75), -76, 0.7)  # location, turn, scale (rim radius 0.35, height 0.474)


def barrel_crabs():
    """Three small pumpkin crabs at the half barrel's rim, tipped over the edge as if climbing out.
    Linked copies of the big crab: each gets its own armature, so each can move on its own."""
    (cx, cy, cz), _, s = HALF_BARREL
    rim_z = cz + 0.677 * s
    out = []
    for i, ang in enumerate((-100, -150, -55)):
        a = math.radians(ang)
        r = 0.35 * s / 0.7 - 0.06
        loc = (cx + r * math.cos(a), cy + r * math.sin(a), rim_z - 0.11)
        root, objs = import_glb("props/halloween-pumpkin-crab.glb", loc, ang + 90, 0.24, f"Barrel Crab {i + 1}")
        root.rotation_euler = Euler((math.radians(38), 0, a + math.pi / 2))
        objs = list(root.children_recursive)
        arm = next((o for o in objs if o.type == "ARMATURE"), None)
        for o in objs:
            for m in getattr(o, "modifiers", []):
                if m.type == "ARMATURE" and arm:
                    m.object = arm
        if arm:
            arm.animation_data_clear()
        # heave forward and back, as if pulling itself over the rim
        base = Vector(loc)
        outward = Vector((math.cos(a), math.sin(a), 0.6)).normalized()
        for fr in range(1, END + 1, 4):
            t = fr / FPS
            root.location = base + outward * (0.035 * math.sin(t * 2.2 + i * 2.1) + 0.02)
            root.keyframe_insert("location", frame=fr)
        out.append((root, objs))
    return out


def glow_crab(root, power):
    """Brighter jack-o-lantern eyes and mouth, plus a warm light at the face."""
    stack = [root]
    seen = set()
    while stack:
        o = stack.pop()
        stack.extend(o.children)
        if o.type != "MESH":
            continue
        for m in o.data.materials:
            if not m or m.name in seen or m.node_tree is None:
                continue
            seen.add(m.name)
            p = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if p and pin(p, "Emission Color", "Emission").is_linked:
                p.inputs["Emission Strength"].default_value = 6.0
    for k, (x, y, z) in enumerate(((0, -0.36, 0.42), (0, -0.05, 0.4))):  # in front of and inside the face
        L = bpy.data.lights.new(f"{root.name} Face Light {k}", "POINT")
        L.color = (1.0, 0.45, 0.08)
        L.energy = (14 if k == 0 else 9) * power
        L.shadow_soft_size = 0.05
        lo = bpy.data.objects.new(L.name, L)
        bpy.context.scene.collection.objects.link(lo)
        lo.parent = root
        lo.location = (x, y, z)
        for fr in range(1, END + 1, 3):  # candle flicker
            L.energy = (14 if k == 0 else 9) * power * (0.8 + 0.35 * random.random())
            L.keyframe_insert("energy", frame=fr)


DRIVE_FRAMES = (1, 100)   # the bike rolls in from behind the trees during shot 1
DOOR_FRAMES = (398, 414)  # the cabinet door flips up in the hero shot (shot 5)
BAT_START = 404           # bats burst out of the cabinet from here


def _ease_out(k):
    return 1 - (1 - k) ** 3


def _ease_in_out(k):
    return k * k * (3 - 2 * k)


def _turn_key(obj, axis, angle, frame, rest):
    from mathutils import Quaternion
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = rest @ Quaternion(axis, angle)
    obj.keyframe_insert("rotation_quaternion", frame=frame)


def bike_drive_in(bike, riders=(), distance=5.5):
    """The bike rides forward (toward -Y, the camera side) and stops at its spot; wheels roll.
    `riders` (fire, grill food, utensils) are carried along. Called before the drive has any
    keys, while it sits at the origin, so parenting keeps everything where it is."""
    drive = bpy.data.objects.new("Bike Drive", None)
    bpy.context.scene.collection.objects.link(drive)
    bike.parent = drive  # the bike's own transform stays editable; the drive adds the motion
    for o in riders:
        o.parent = bike  # the bike sits at the origin here, so nothing moves
    wheels = []
    for name, radius in (("Front_Wheel_pivot", 0.29), ("Rear_Wheel_pivot", 0.345), ("Sidecar_wheel__axle_pivot", 0.285)):
        w = next((o for o in bike.children_recursive if o.name.split(".")[0] == name), None)
        if w:
            w.rotation_mode = "QUATERNION"
            wheels.append((w, radius, w.rotation_quaternion.copy()))
    f0, f1 = DRIVE_FRAMES
    for fr in range(f0, f1 + 1, 2):
        k = 1 - (1 - (fr - f0) / (f1 - f0)) ** 2  # rolls in, brakes gently to a stop
        left = distance * (1 - k)
        drive.location = (0, left, 0)
        drive.keyframe_insert("location", frame=fr)
        for w, r, rest in wheels:
            _turn_key(w, (1, 0, 0), (distance - left) / r, fr, rest)
    for o in [drive] + [w for w, _, _ in wheels]:
        set_interp(o, "LINEAR")


def open_front_door(bike_objs):
    """The BBQ RIDE cabinet door is hinged along its top edge: it flips up and out.
    Rotated about the hinge line in the bike's frame (the door's own axes are not aligned)."""
    door = next((o for o in bike_objs if o.name.split(".")[0] == "Front_Door"), None)
    if not door:
        return
    bpy.context.view_layer.update()
    hinge = Vector((0.713, -0.82, 0.892))  # top edge of the door, along X (bike frame)
    rest = door.matrix_basis.copy()
    door.rotation_mode = "QUATERNION"
    f0, f1 = DOOR_FRAMES
    root = door
    while root.parent and root.parent.name not in ("BBQ Bike",):
        root = root.parent
    bike_root = root.parent  # the "BBQ Bike" empty: hinge coordinates are in its frame
    for fr in [f0] + list(range(f0 + 2, f1 + 1, 2)):
        k = (fr - f0) / (f1 - f0)
        # outward is toward -Y: a negative turn about +X lifts the free (bottom) edge out
        swing = -math.radians(100) * _ease_out(k) - math.radians(7) * math.sin(k * math.pi)
        turn = Matrix.Translation(hinge) @ Matrix.Rotation(swing, 4, "X") @ Matrix.Translation(-hinge)
        # door basis in its parent's frame: parent^-1 * bike * turn * bike^-1 * parent * rest
        P = door.parent.matrix_world if door.parent else Matrix()
        B = bike_root.matrix_world if bike_root else Matrix()
        door.matrix_basis = P.inverted() @ B @ turn @ B.inverted() @ P @ rest
        door.keyframe_insert("location", frame=fr)
        door.keyframe_insert("rotation_quaternion", frame=fr)


def _bat_mesh():
    """One bat: a body and two scalloped wings (wings are separate so they can flap)."""
    body_mat = mat("Bat", (0.05, 0.015, 0.08), 0.6, emit=(0.32, 0.06, 0.55), strength=0.45)
    eye_mat = mat("Bat Eye", (1, 0.2, 0.05), 0.5, emit=(1.0, 0.25, 0.05), strength=25)
    wing_pts = [(0, 0.03, 0), (0.06, 0.05, 0), (0.12, 0.06, 0), (0.18, 0.03, 0), (0.17, -0.02, 0),
                (0.13, -0.005, 0), (0.1, -0.04, 0), (0.065, -0.015, 0), (0.035, -0.045, 0), (0, -0.02, 0)]
    wings = []
    for side in (1, -1):
        me = bpy.data.meshes.new("Bat Wing")
        pts = [(x * side, y, z) for x, y, z in wing_pts]
        me.from_pydata(pts, [], [list(range(len(pts)))] if side > 0 else [list(reversed(range(len(pts))))])
        me.materials.append(body_mat)
        wings.append(me)
    bm = bpy.data.meshes.new("Bat Body")
    import bmesh
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=10, v_segments=6, radius=0.03)
    for v in b.verts:
        v.co.y *= 1.6
    for ear in (1, -1):  # two ears
        e = bmesh.ops.create_cone(b, cap_ends=True, segments=4, radius1=0.01, radius2=0.0, depth=0.03)
        for v in e["verts"]:
            v.co += Vector((0.012 * ear, 0.035, 0.03))
    b.to_mesh(bm)
    b.free()
    bm.materials.append(body_mat)
    em = bpy.data.meshes.new("Bat Eye")
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=6, v_segments=4, radius=0.006)
    b.to_mesh(em)
    b.free()
    em.materials.append(eye_mat)
    return bm, wings, em


def bats(bike, count=16):
    """Bats burst out of the open cabinet, flapping, and scatter toward the camera and the sky."""
    import bmesh  # noqa: F401  (used by _bat_mesh)
    body_me, wing_me, eye_me = _bat_mesh()
    spawn = bpy.data.objects.new("Bat Spawn", None)  # in the bike's frame, at the cabinet
    bpy.context.scene.collection.objects.link(spawn)
    spawn.parent = bike
    spawn.location = (0.71, -0.62, 0.6)
    rng = random.Random(13)
    for i in range(count):
        body = bpy.data.objects.new(f"Bat {i + 1}", body_me)
        bpy.context.scene.collection.objects.link(body)
        body.parent = spawn
        for side, me in zip((1, -1), wing_me):
            w = bpy.data.objects.new(f"Bat {i + 1} Wing", me)
            bpy.context.scene.collection.objects.link(w)
            w.parent = body
            w.location = (0.02 * side, 0, 0.005)
            w["side"] = side
        for ex in (1, -1):
            e = bpy.data.objects.new(f"Bat {i + 1} Eye", eye_me)
            bpy.context.scene.collection.objects.link(e)
            e.parent = body
            e.location = (0.01 * ex, 0.045, 0.012)
        size = 0.85 + rng.random() * 0.6
        t0 = BAT_START + i * 2 + rng.randint(0, 3)
        start = Vector((rng.uniform(-0.18, 0.18), rng.uniform(-0.05, 0.25), rng.uniform(-0.2, 0.2)))
        mouth = Vector((rng.uniform(-0.2, 0.2), -0.45, rng.uniform(-0.15, 0.1)))  # just out of the door
        far = Vector((rng.uniform(-3.2, 3.4), -rng.uniform(2.0, 4.5), rng.uniform(0.9, 3.4)))
        if rng.random() < 0.3:  # a few peel off backwards over the grill into the trees
            far = Vector((rng.uniform(-2.5, 2.5), rng.uniform(1.5, 4.0), rng.uniform(1.8, 3.8)))
        life = 62 + rng.randint(0, 20)
        body.scale = (0, 0, 0)
        body.location = start
        body.keyframe_insert("scale", frame=t0 - 1)
        body.keyframe_insert("location", frame=t0 - 1)
        prev = start
        wings = [c for c in body.children if "side" in c]
        for fr in range(t0, min(END, t0 + life) + 1):
            k = (fr - t0) / life
            if k < 0.12:  # out through the door
                p = start.lerp(mouth, _ease_in_out(k / 0.12))
            else:  # curve away, climbing, with a wobble
                q = (k - 0.12) / 0.88
                ctrl = mouth + Vector((0, -0.6, 0.5))
                p = (1 - q) ** 2 * mouth + 2 * (1 - q) * q * ctrl + q * q * far
                p += Vector((math.sin(fr * 0.35 + i) * 0.08, 0, math.cos(fr * 0.29 + i) * 0.06))
            vel = p - prev if (p - prev).length > 1e-5 else Vector((0, -1, 0))
            prev = p.copy()
            body.location = p
            body.rotation_euler = (math.atan2(vel.z, max(1e-4, vel.xy.length)) * 0.6, math.sin(fr * 0.3 + i) * 0.25, math.atan2(-vel.x, vel.y))
            body.scale = (size,) * 3
            body.keyframe_insert("location", frame=fr)
            body.keyframe_insert("rotation_euler", frame=fr)
            body.keyframe_insert("scale", frame=fr)
            for w in wings:
                w.rotation_euler = (0, w["side"] * -math.sin(fr * 1.35 + i) * 1.0, 0)
                w.keyframe_insert("rotation_euler", frame=fr)
        set_interp(body, "LINEAR")


def ground():
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    g = bpy.context.object
    m = bpy.data.materials.new("Wet Soil")
    nt = nodes_on(m)
    p = principled(m)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.008, 0.007, 0.006, 1)
    ramp.color_ramp.elements[1].color = (0.035, 0.025, 0.018, 1)
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    # rough enough that the bright moonlight doesn't mirror off the ground as a white sheet
    p.inputs["Roughness"].default_value = 0.85
    pin(p, "Specular IOR Level", "Specular").default_value = 0.25
    g.data.materials.append(m)


def pumpkins():
    orange = mat("Pumpkin", (0.55, 0.13, 0.01), 0.45)
    stem = mat("Stem", (0.05, 0.07, 0.02), 0.8)
    spots = [(-1.6, -1.4, 0.13), (-1.95, -0.9, 0.1), (2.3, -1.85, 0.12), (1.55, -2.2, 0.09),
             (-0.9, -2.4, 0.08), (2.4, -0.2, 0.11), (-2.3, 0.4, 0.12)]
    for x, y, r in spots:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, r * 0.72), segments=24, ring_count=12)
        p = bpy.context.object
        p.scale = (1.0, 1.0, 0.75)
        p.data.materials.append(orange)
        bpy.ops.object.shade_smooth()
        bpy.ops.mesh.primitive_cylinder_add(radius=r * 0.12, depth=r * 0.5, location=(x, y, r * 1.45))
        bpy.context.object.data.materials.append(stem)


FIRE_OBJS = []  # coals, flames, embers and grill lights (they ride with the bike)


def fire():
    FIRE_OBJS.clear()
    before = set(bpy.data.objects)
    _fire()
    FIRE_OBJS.extend(o for o in bpy.data.objects if o not in before)


def _fire():
    coal = mat("Coals", (0.1, 0.02, 0.0), 0.9, emit=(1.0, 0.25, 0.03), strength=6)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.815, -0.145, 1.16))
    c = bpy.context.object
    c.scale = (0.32, 1.22, 1)
    c.data.materials.append(coal)

    flame = mat("Flame", (1, 0.35, 0.04), 1.0, emit=(1.0, 0.33, 0.04), strength=6)
    try_set(flame, blend_method="BLEND", surface_render_method="BLENDED")
    for i in range(14):
        # low flames licking up along the grate's edges, so the food in the middle stays clear
        x = (0.67 + random.random() * 0.04) if i % 2 else (0.93 + random.random() * 0.04)
        y = -0.72 + random.random() * 1.15
        h = 0.04 + random.random() * 0.07
        bpy.ops.mesh.primitive_cone_add(radius1=0.025 + random.random() * 0.02, depth=h, location=(x, y, 1.2 + h / 2))
        f = bpy.context.object
        f.data.materials.append(flame)
        for fr in range(1, END + 1, 3):
            k = 0.55 + 0.6 * random.random()
            f.scale = (1, 1, k)
            f.location.z = 1.2 + h * k / 2
            f.keyframe_insert("scale", frame=fr)
            f.keyframe_insert("location", frame=fr)

    ember = mat("Ember", (1, 0.5, 0.1), 1.0, emit=(1.0, 0.45, 0.08), strength=30)
    for i in range(36):
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.006, subdivisions=1)
        e = bpy.context.object
        e.data.materials.append(ember)
        x0 = 0.7 + random.random() * 0.25
        y0 = -0.7 + random.random() * 1.1
        life = 40 + random.randint(0, 50)
        off = random.randint(0, life)
        for fr in range(1, END + 1, 4):
            ph = ((fr + off) % life) / life
            e.location = (x0 + math.sin(fr * 0.05 + i) * 0.06, y0 + math.cos(fr * 0.04 + i) * 0.05, 1.22 + ph * 1.1)
            e.scale = (1 - ph,) * 3
            e.keyframe_insert("location", frame=fr)
            e.keyframe_insert("scale", frame=fr)
        set_interp(e, "LINEAR")

    for i, (y, base) in enumerate([(-0.45, 60), (0.15, 50)]):
        bpy.ops.object.light_add(type="POINT", location=(0.82, y, 1.45))
        L = bpy.context.object
        L.data.color = (1.0, 0.42, 0.1)
        L.data.shadow_soft_size = 0.15
        for fr in range(1, END + 1, 2):
            L.data.energy = base * (0.7 + 0.6 * random.random())
            L.data.keyframe_insert("energy", frame=fr)


def leaves():
    shades = [mat(f"Leaf {i}", c, 0.7) for i, c in enumerate([(0.45, 0.11, 0.01), (0.3, 0.06, 0.01), (0.55, 0.22, 0.02), (0.18, 0.05, 0.02)])]
    # a leaf outline: pointed tip, wide middle, short stem
    outline = [(0, 0.05, 0), (0.018, 0.028, 0), (0.026, 0.004, 0), (0.016, -0.022, 0), (0.003, -0.034, 0),
               (0.002, -0.048, 0), (-0.002, -0.048, 0), (-0.003, -0.034, 0), (-0.016, -0.022, 0), (-0.026, 0.004, 0), (-0.018, 0.028, 0)]
    me = bpy.data.meshes.new("Leaf")
    me.from_pydata(outline, [], [list(range(len(outline)))])
    base = bpy.data.objects.new("Leaf", me)
    bpy.context.scene.collection.objects.link(base)
    for i in range(260):
        r = 0.9 + random.random() * 4.5
        a = random.random() * math.tau
        x, y = 0.35 + math.cos(a) * r * 1.2, math.sin(a) * r
        o = base.copy()
        o.data = base.data.copy()
        o.data.materials.append(random.choice(shades))
        o.scale = (1.4,) * 3
        o.location = (x, y, 0.003 + random.random() * 0.004)
        o.rotation_euler = (random.random() * 0.3, random.random() * 0.3, random.random() * math.tau)
        bpy.context.scene.collection.objects.link(o)
    # falling leaves
    for i in range(50):
        o = base.copy()
        o.data = base.data.copy()
        o.data.materials.append(random.choice(shades))
        bpy.context.scene.collection.objects.link(o)
        x0 = -2.5 + random.random() * 5.5
        y0 = -2.6 + random.random() * 4.5
        speed = 0.35 + random.random() * 0.4
        off = random.random() * 10
        sway = 0.15 + random.random() * 0.3
        for fr in range(1, END + 1, 4):
            t = fr / FPS + off
            z = 3.6 - (t * speed) % 3.6
            o.location = (x0 + math.sin(t * 1.3 + i) * sway, y0 + math.cos(t * 0.9 + i) * sway * 0.5, z)
            o.rotation_euler = (t * 2.1 + i, t * 1.7, t * 0.9 + i)
            o.keyframe_insert("location", frame=fr)
            o.keyframe_insert("rotation_euler", frame=fr)
    bpy.data.objects.remove(base)


MOON = (5.0, 24.0, 11.0)


def fog_and_moon():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.3, 2.0, 3.0))
    v = bpy.context.object
    v.scale = (24, 30, 6)
    m = bpy.data.materials.new("Mist")
    nt = nodes_on(m)
    nt.nodes.remove(principled(m))
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Color"].default_value = (0.22, 0.3, 0.6, 1)
    vol.inputs["Density"].default_value = 0.05
    vol.inputs["Anisotropy"].default_value = 0.35
    nt.links.new(vol.outputs["Volume"], nt.nodes["Material Output"].inputs["Volume"])
    v.data.materials.append(m)

    # A real-looking full moon: dark maria and bright highlands from layered noise, cratered
    # with Voronoi pits, glowing (bloom gives the halo through the mist).
    m = bpy.data.materials.new("Moon")
    nt = nodes_on(m)
    nt.nodes.remove(principled(m))
    out_node = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    maria = nt.nodes.new("ShaderNodeTexNoise")
    maria.inputs["Scale"].default_value = 1.6
    maria.inputs["Detail"].default_value = 6
    maria.inputs["Roughness"].default_value = 0.62
    craters = nt.nodes.new("ShaderNodeTexVoronoi")
    craters.inputs["Scale"].default_value = 9
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.42
    ramp.color_ramp.elements[0].color = (0.42, 0.43, 0.47, 1)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (1.0, 0.98, 0.93, 1)
    pit_ramp = nt.nodes.new("ShaderNodeMapRange")
    pit_ramp.inputs["From Min"].default_value = 0.0
    pit_ramp.inputs["From Max"].default_value = 0.18
    pit_ramp.inputs["To Min"].default_value = 0.78
    pit_ramp.inputs["To Max"].default_value = 1.0
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 1.0  # Factor
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 9.0
    nt.links.new(coord.outputs["Object"], maria.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], craters.inputs["Vector"])
    nt.links.new(maria.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(craters.outputs["Distance"], pit_ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Color"], mix.inputs[6])  # A (color)
    nt.links.new(pit_ramp.outputs["Result"], mix.inputs[7])  # B (color)
    nt.links.new(mix.outputs[2], emit.inputs["Color"])  # Result (color)
    nt.links.new(emit.outputs["Emission"], out_node.inputs["Surface"])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.9, location=MOON, segments=64, ring_count=32)
    bpy.ops.object.shade_smooth()
    bpy.context.object.name = "Moon"
    bpy.context.object.data.materials.append(m)


def lights():
    def area(loc, rot, energy, color, size):
        bpy.ops.object.light_add(type="AREA", location=loc, rotation=[math.radians(r) for r in rot])
        L = bpy.context.object
        L.data.energy = energy
        L.data.color = color
        L.data.size = size
        return L

    # bright moonlight, coming from where the moon actually is (rim + god rays through the mist)
    to_moon = (Vector(MOON) - Vector((0.3, 0, 0.8))).normalized()
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    sun = bpy.context.object
    sun.rotation_euler = to_moon.to_track_quat("Z", "Y").to_euler()  # the sun shines along its -Z
    sun.data.energy = 3.6
    sun.data.color = (0.62, 0.72, 1.0)
    sun.data.angle = math.radians(1.2)
    area((-2.8, -2.2, 2.6), (60, 0, -50), 170, (0.45, 0.58, 1.0), 3.0)  # cold fill
    area((2.6, 2.8, 2.4), (-55, 0, 140), 300, (0.75, 0.85, 1.0), 2.0)   # moon rim
    area((0.3, -2.4, 0.5), (85, 0, 0), 35, (1.0, 0.45, 0.15), 1.5)      # warm bounce on the crab

    def aim(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

    # moonlit key on the bike: its entrance and final spot read clearly
    key = area((2.2, -3.4, 2.6), (0, 0, 0), 260, (0.82, 0.88, 1.0), 1.8)
    aim(key, (0.3, -0.1, 0.8))
    # warm light straight down on the grate so the food reads clearly
    bpy.ops.object.light_add(type="SPOT", location=(0.82, -0.2, 2.15))
    grill = bpy.context.object
    grill.data.energy = 50
    grill.data.color = (1.0, 0.72, 0.45)
    grill.data.spot_size = math.radians(55)
    grill.data.spot_blend = 0.6
    grill.data.shadow_soft_size = 0.25
    aim(grill, (0.82, -0.2, 1.2))
    bike = bpy.data.objects.get("BBQ Bike")
    for L in (key, grill):  # they follow the bike as it rides in; positions above are in its frame
        if bike:
            L.parent = bike
            L.matrix_parent_inverse.identity()
    # Only the moon lights the mist (god rays). Close-up lights lighting the fog read as a
    # bright flat haze across the frame.
    for L in bpy.data.lights:
        if L.type != "SUN":
            L.volume_factor = 0.0 if L.type in ("SPOT", "POINT") or L is key.data else 0.25


def animate_crab(objs, phase=0.0, speed=1.0):
    arm = next((o for o in objs if o.type == "ARMATURE"), None)
    if not arm:
        return

    def turn(name, t):
        side = 1 if name.startswith("Left") else -1
        if name in ("LeftArm", "RightArm"):
            return "Z", side * (0.25 + 0.3 * math.sin(t * 2.1 + side))
        if name.endswith("ForeArm"):
            return "X", 0.45 * math.sin(t * 3.7 + side * 1.3)
        if name[:-1].endswith(("HandIndex", "HandMiddle", "HandThumb")):
            return "Z", side * 0.35 * max(0.0, math.sin(t * 7.5 + side))
        if name.endswith("UpLeg"):
            return "X", 0.28 * math.sin(t * 6.2 + (0 if side > 0 else math.pi))
        if name in ("LeftLeg", "RightLeg"):
            return "X", 0.22 * max(0.0, math.sin(t * 6.2 + 1.2 + (0 if side > 0 else math.pi)))
        if name == "Spine":
            return "Y", 0.14 * math.sin(t * 1.4)
        if name == "Head":
            return "Z", 0.1 * math.sin(t * 2.3)
        return None

    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    for fr in range(1, END + 1, 2):
        t = fr / FPS * speed + phase
        for pb in arm.pose.bones:
            short = pb.name.split(":")[-1]
            r = turn(short, t)
            if not r:
                continue
            axis = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[r[0]]
            from mathutils import Quaternion
            pb.rotation_quaternion = Quaternion(axis, r[1])
            pb.keyframe_insert("rotation_quaternion", frame=fr)


SHOTS = [
    # frames, camera start/end, target start/end, lens start/end
    ((1, 120), (1.4, -5.2, 1.25), (0.0, -5.6, 1.45), (0.35, 3.0, 0.85), (0.35, 0.0, 0.95), 26, 27),   # front-right: follows the bike riding in
    ((121, 210), (-1.3, -3.7, 0.75), (-1.05, -2.75, 0.62), (-0.83, -0.91, 0.42), (-0.85, -0.91, 0.45), 40, 46),  # crab push-in (barrel crabs behind)
    ((211, 300), (2.15, -1.95, 2.55), (1.7, -1.05, 2.25), (0.82, -0.3, 1.22), (0.82, 0.05, 1.22), 32, 36),  # over the grill
    ((301, 390), (3.1, -2.0, 0.95), (3.0, 0.7, 1.05), (1.05, -0.7, 0.75), (1.05, 0.25, 0.8), 34, 34),  # slide along the side
    ((391, 480), (0.4, -3.1, 0.55), (0.3, -6.2, 1.45), (0.35, 0.0, 0.8), (0.35, 0.0, 0.95), 30, 28),  # hero pull-back
]


def cameras():
    bpy.ops.object.empty_add(location=(0, 0, 0.8))
    target = bpy.context.object
    target.name = "Camera Target"
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 24
    cam.data.clip_end = 120
    cam.data.dof.use_dof = True
    cam.data.dof.focus_object = target
    cam.data.dof.aperture_fstop = 2.8
    c = cam.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam
    for (f0, f1), c0, c1, t0, t1, l0, l1 in SHOTS:
        look_at_key(cam, target, f0, c0, t0, l0)
        look_at_key(cam, target, f1, c1, t1, l1)
    # shot 1: the camera keeps its eye on the bike as it rides in (same curve as bike_drive_in)
    d0, d1 = DRIVE_FRAMES
    for fr in range(d0, d1 + 1, 4):
        u = (fr - d0) / (d1 - d0)
        target.location = (0.35, 5.5 * (1 - u) ** 2, 0.85 + 0.1 * u)
        target.keyframe_insert("location", frame=fr)


# ----------------------------------------------------------------- render

def render_frames():
    sc = bpy.context.scene
    os.makedirs(FRAMES, exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    if PREVIEW:
        for f in (60, 165, 255, 345, 470):
            sc.frame_set(f)
            sc.render.filepath = os.path.join(OUT, f"preview_{f:04d}.png")
            bpy.ops.render.render(write_still=True)
        return
    # Frame by frame, skipping finished frames: a crashed run resumes where it stopped.
    import time
    for f in range(1, REEL_END + 1):
        path = os.path.join(FRAMES, f"f_{f:04d}.png")
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        t0 = time.time()
        sc.frame_set(f)
        tmp = os.path.join(FRAMES, f"tmp_{f:04d}.png")
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        os.replace(tmp, path)
        print(f"FRAME {f}/{REEL_END} {time.time() - t0:.1f}s", flush=True)


def encode():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.resolution_x = 1080
    sc.render.resolution_y = 1920
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.frame_start = 1
    sc.frame_end = REEL_END
    sc.view_settings.view_transform = "Standard"
    seq = sc.sequence_editor_create()
    files = sorted(f for f in os.listdir(FRAMES) if f.startswith("f_") and f.endswith(".png"))
    strips = seq.strips if hasattr(seq, "strips") else seq.sequences  # renamed in 4.4
    strip = strips.new_image("Frames", os.path.join(FRAMES, files[0]), channel=1, frame_start=1)
    for f in files[1:]:
        strip.elements.append(f)

    def text(label, body, ch, f0, f1, y, size, color, bold=True):
        s = strips.new_effect(label, "TEXT", channel=ch, frame_start=f0, frame_end=f1)
        s.text = body
        s.font_size = size
        s.color = (*color, 1)
        s.use_shadow = True
        s.shadow_color = (0, 0, 0, 0.85)
        s.location = (0.5, y)
        s.align_x = "CENTER"
        s.align_y = "CENTER"
        s.use_bold = bold
        s.blend_type = "ALPHA_OVER"
        return s

    def fade(s, f0, f1, frames=10):
        s.blend_alpha = 0
        s.keyframe_insert("blend_alpha", frame=f0)
        s.blend_alpha = 1
        s.keyframe_insert("blend_alpha", frame=f0 + frames)
        s.keyframe_insert("blend_alpha", frame=f1 - frames)
        s.blend_alpha = 0
        s.keyframe_insert("blend_alpha", frame=f1)

    a = text("Title", "HALLOWEEN NIGHT", 2, rf(12), rf(112), 0.765, 96, (1.0, 0.62, 0.18))
    b = text("Title sub", "on the BBQ RIDE", 3, rf(20), rf(112), 0.72, 54, (0.86, 0.88, 1.0), bold=False)

    # the BBQ RIDE badge at the top of the frame for the whole reel
    logo_path = os.path.join(APP, "scripts", "assets", "bbq-ride-logo.png")
    if os.path.exists(logo_path):
        logo = strips.new_image("BBQ RIDE logo", logo_path, channel=6, frame_start=1)
        logo.frame_final_duration = REEL_END
        logo.fit_method = "ORIGINAL"
        logo.transform.scale_x = logo.transform.scale_y = 0.3  # 1024 px -> about 307 px wide
        logo.transform.offset_y = 1920 / 2 - 215  # centre 215 px below the top edge
        logo.blend_type = "ALPHA_OVER"
        logo.blend_alpha = 0
        logo.keyframe_insert("blend_alpha", frame=1)
        logo.blend_alpha = 0.92
        logo.keyframe_insert("blend_alpha", frame=rf(18))
    c = text("Caption", "TRICK OR TREAT?", 4, rf(400), REEL_END, 0.2, 104, (1.0, 0.6, 0.15))
    d = text("Caption sub", "Blackwagon BBQ  •  Tonight Only", 5, rf(408), REEL_END, 0.15, 52, (0.9, 0.9, 1.0), bold=False)
    for s, f0, f1 in ((a, rf(12), rf(112)), (b, rf(20), rf(112)), (c, rf(400), REEL_END + 1), (d, rf(408), REEL_END + 1)):
        fade(s, f0, f1, frames=5)

    r = sc.render
    r.image_settings.file_format = "FFMPEG"
    r.ffmpeg.format = "MPEG4"
    r.ffmpeg.codec = "H264"
    r.ffmpeg.constant_rate_factor = "HIGH"
    try_set(r.ffmpeg, ffmpeg_preset="GOOD")
    r.ffmpeg.audio_codec = "NONE"
    r.filepath = MP4
    bpy.ops.render.render(animation=True)
    print("MP4 written:", MP4)


if ENCODE_ONLY:
    encode()
elif ASSETS_DIR or "--build-only" in ARGS or not bpy.app.background:
    build()  # render service / Scripting tab: build the scene only, the caller renders it
else:
    build()
    render_frames()
    if not PREVIEW:
        encode()
