import { vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

    const inputState = {
        keyboard: {},
        gamepad: {}, // can add player index later
    }

    const bindings = {
        moveForward: ["KeyW", "ArrowUp"], 
        moveBackward: ["KeyS", "ArrowDown"],
        moveLeft: ["KeyA", "ArrowLeft"],
        moveRight: ["KeyD", "ArrowRight"],
        jump: ["Space"],
    }

    // Register keyboard events
    window.addEventListener("keydown", e => inputState.keyboard[e.code] = true);
    window.addEventListener("keyup", e => inputState.keyboard[e.code] = false);

    function isPressed(codes) { 
        if (Array.isArray(codes)) {
            return codes.some(code => inputState.keyboard[code]);
        }
        return inputState.keyboard[codes];  
    }

    // Abstract input direction as a vector
    export function getMovementVector() {
        let x = 0;
        let z = 0;

        if (isPressed(bindings.moveForward)) z -= 1;
        if (isPressed(bindings.moveBackward)) z += 1;
        if (isPressed(bindings.moveLeft)) x -= 1;
        if (isPressed(bindings.moveRight)) x += 1;
        
        const moveVector = vec3.fromValues(x, 0, z);
        vec3.normalize(moveVector, moveVector); // normalize to prevent diagonal speedup

        //if (vec3.length(moveVector) > 0) console.log(moveVector); // just debug

        return moveVector;
    }