# Table of Contents

[Main](#mainjs)

[Controls](#controlsjs)

[Camera](#camerajs)

[Player](#playerjs)

[Mesh Shapes](#meshshapesjs)

[Shaders](#shadersjs)

[Debug](#debugjs)




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



## Shaders.js

All actual shader code. Stored in <code>const: shaders<code> 

Has Shader Class. Includes building shader program, tracking shader vars, etc

CreateShaders(gl) -- Passes an object of shader programs to Main.js. 
Access in main with <code> myShaders.SolidColor </code>



## Debug.js

Runs Debug Gridlines and Origin Raycast



