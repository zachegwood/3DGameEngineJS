import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export const WORLD_SCALE = 2.0;
export const GRAVITY = 0;

export const CURRENT_CAMERA = 'OVERHEAD'; // PLAYER_THIRD_PERSON, OVERHEAD
export const PLAYER_START_POS = vec3.fromValues(0, 100, 0);
export const PLAYER_SPEED = 250;

export const VORONOI_SEED_COUNT = 600;
//export const VORONOI_BASE_ELEVATION = 100 + 50; // this gets multiplied. IE elevation * (100 + 20)
export const VORONOI_BASE_ELEVATION = 100+50; // this gets multiplied. IE elevation * (100 + 20)
export const VORONOI_RAYS_TOGGLE = true;

export const CHUNK_SIZE = 32; // 32x32 units
export const CHUNK_PIECES = 30;

export const WORLD_SEED = 120;

console.log(`WORLD_SEED: ${WORLD_SEED}`);