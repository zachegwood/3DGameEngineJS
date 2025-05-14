### Future Improvements

Change to a custom glTF to binary import format for Blender files. Preprocess glTF into Your Own Format.

: 2–10× faster depending on how much animation, mesh, and material data you strip/pack.








NEW CHANGE:

new way to create a shape. Create it as an Entity, which takes a new mesh as its constructor. Ex:

const triangle = new Entity(createTriangle(gl, 1), [0,0,0]);

When creating a new shape, you also have to put it in the draw() method of main or it won't appear






# Table of Contents

[Main](#mainjs)

[Controls](#controlsjs)

[Camera](#camerajs)

[Player](#playerjs)

[Mesh Shapes](#meshshapesjs)

[Shaders](#shadersjs)

[Debug](#debugjs)

[Blender](#blender)




# 3DGameEngineJS



## Main.js

Holds ref to gl. 

const myShaders -- a list of shaders from Shaders.js. Access like <code> myShaders.SolidColor </code>

Render loop.

Update loop.




## Controls.js

Keybindings.

Also exports the movement vector based on player input.



## Camera.js

Set vars for: follow distance, pitch, yaw, zoom, etc

Has a "follow target", which defaults to the player (set in main).





## Player.js

Sets its initial Y position to half-height so it's not centered in the floor.

Player Update() is vector math based on "Forward Vector" and "Right Vector" imported from camera.js

Player Draw() is 


## MeshShapes.js

Mesh class. Handles indentity matrix, and buffers for shapes. position, uv, normals, etc. 
Includes helper functions to scale, rotate, etc.
Includes <code>Mesh.draw(shader)</code>

Shape factory. Defines vertex matrices of shapes, which defines positions, uvs, and normals.

Includes LoadTexture function

Includes LoadModel function, which imports JSON that was exported from Blender



## Shaders.js

All actual shader code. Stored in <code>const: shaders<code> 

Has Shader Class. Includes building shader program, tracking shader vars, etc

CreateShaders(gl) -- Passes an object of shader programs to Main.js. 
Access in main with <code> myShaders.SolidColor </code>



## Debug.js

Runs Debug Gridlines and Origin Raycast



## Blender

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