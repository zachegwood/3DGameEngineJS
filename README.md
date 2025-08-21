# 3DGameEngineJS

A custom 3D browser game engine
by Zac Hegwood (HAWKWOOD)


## Table of Contents

[What Is This?](#what-is-this)

[How to Run](#how-to-run)

[Customize](#customize)

[Future Improvements](#future-improvements)

[Blender Export](#blender-export)


## What Is This?

A custom 3D game engine built by Zac Hegwood (HAWKWOOD), using vanilla JavaScript to run a 3D game in a browser.
Currently builds a random terrain map, with a focus on effeciency. 

Biomes are set based on elevation, temperature, and erosion. Ex, tundra is North, desert is South.
Engine uses Frustum Culling and terrain chunking to allow enormous randomized maps. Offloads work to webworkers for speed/async.
For randomness, includes custom variations of Poisson points, Simplex Noise, and Voronoi points to handle biomes.
Colliders are AABB, changing size when the object rotates, preserving the AABB alignment for quick collision tests.


## How to Run

Clone this repo, then open the folder in VSCode with the "Live Server" add-on. With that running, right-click index.html from inside VSCode and choose "Open with Live Server"

Once it opens in your browser, click inside the browser window to activate it (locking the cursor). 
You can unlock the cursor by pressing ESC.
WASD to move, mouse to adjust camera, mouse wheel to zoom
Game will pause when browser loses focus, then un-pause automatically when focus returns

The buttons at the top-right can enable/disable debug functions. Including:

> enable rays indicating poisson points and slope normal

> enable colliders around terrain chunks to illustrate how frustum culling is achieved.


## Customize 

ie, Changes you can make.

You can edit the config.js file to change camera type, and other world-gen variables.
ex, to change the camera from overhead (where you can see the frustum culling) to Third-person (where frustum culling is invislbe), change this: 

<code>
    CURRENT_CAMERA = 'PLAYER_THIRD_PERSON'; 
</code>


## Future Improvements

>   Change to a custom glTF to binary import format for Blender files. Preprocess glTF into Your Own Format.

>   Blender import is 2–10× faster depending on how much animation, mesh, and material data you strip/pack.

>   Continue biome work

>   LODs (difficult atm because of how terrain chunks are built)


## Blender Export

This project includes custom code for exporting a Blender model as a single JSON, for easy, quick, low-resource loading

Paste the following code in the "Scripting" tab inside Blender. Tested with version 4.4.3

This will export the model's vertecies into a JSON file in the same directory as the .blend file.

<code>

    import bpy
    import bmesh
    import json
    import os

    obj = bpy.context.active_object
    mesh = obj.data

    # Ensure mesh is triangulated
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])  # Triangulate in-place
    bm.verts.ensure_lookup_table()

    vertices = []
    for face in bm.faces:
        for loop in face.loops:
            vert = loop.vert
            
            #normal = loop.vert.normal      # auto-smooths
            normal = face.normal            # no smoothing
            
            uv_layer = bm.loops.layers.uv.active
            uv = loop[uv_layer].uv if mesh.uv_layers.active else (0.0, 0.0)

            # Transform Blender coords [x, y, z] → WebGL coords [x, z, -y]
            co = vert.co
            x, y, z = co.x, co.y, co.z
            nx, ny, nz = normal.x, normal.y, normal.z

            vertex = {
                "position": [x, z, -y],
                "normal":   [nx, nz, -ny],
                "uv":       [uv.x, 1 - uv.y],  # Flip V to match WebGL
            }
            vertices.append(vertex)

    bm.free()

    output_path = os.path.join(bpy.path.abspath("//"), "model_export.json")
    with open(output_path, "w") as f:
        json.dump(vertices, f, indent=2)

    print("Exported to", output_path)

</code>