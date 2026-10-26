# Ground surface textures

Each folder is one selectable ground surface for the Day and Night stages
(`fx/groundSurfaces.js`): `color.jpg` (base colour), `normal.jpg` (OpenGL-style
normal map, bumps the surface under the sun/moon light) and `roughness.jpg`
(how matte/shiny it is). All are CC0 (public domain) PBR photo scans from
ambientCG, downloaded as 1K-JPG sets and re-compressed to keep each surface's
three maps under ~400 KB together (resized where the full 1K wasn't needed,
JPEG quality tuned per map). No attribution is legally required for CC0, but
the source is listed below for anyone who wants the original full-resolution
set (2K/4K/8K, plus displacement and ambient occlusion maps not used here).

| Surface | ambientCG asset | Source URL | Licence |
|---|---|---|---|
| `grass/` | Grass005 | https://ambientcg.com/a/Grass005 | CC0 1.0 |
| `cobblestone/` | PavingStones151 | https://ambientcg.com/a/PavingStones151 | CC0 1.0 |
| `asphalt/` | Asphalt033 | https://ambientcg.com/a/Asphalt033 | CC0 1.0 |
| `sand/` | Ground080 | https://ambientcg.com/a/Ground080 | CC0 1.0 |
| `deck/` | WoodFloor062 | https://ambientcg.com/a/WoodFloor062 | CC0 1.0 |

`soil` (the night stage's original ground) has no texture files — it stays a
plain dark `MeshStandardMaterial`, as it was before this folder existed.
