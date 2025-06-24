import { rngs } from "./simplexNoise.js";

const MAX_ATTEMPTS = 30;
const MIN_DIST = 100;

const rng = rngs.poisson;

export function generatePoissonPoints(mapSize) {
    const cellSize = MIN_DIST / Math.SQRT2;
    const gridWidth = Math.ceil(mapSize / cellSize);
    const grid = new Array(gridWidth * gridWidth).fill(null);

    const points = [];
    const activeList = [];

    // Convert 2D to a 1D index
    function gridIndex(x,z) {
        const gx = Math.floor((x + mapSize / 2) / cellSize);
        const gz = Math.floor((z + mapSize / 2) / cellSize); // centered at 0,0
        return gz * gridWidth + gx;
    }

    // Check if point is valid (not too close to existing points)
    function isValidPoint(x,z) {
        if (x < -mapSize/2 || x > mapSize/2 || z < -mapSize/2 || z > mapSize/2) return false;

        const gx = Math.floor((x + mapSize/2) / cellSize);
        const gz = Math.floor((z + mapSize/2) / cellSize);

        for (let dz = -2; dz <= 2; dz++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = gx + dx;
                const nz = gz + dz;
                if (nx < 0 || nz < 0 || nx >= gridWidth || nz >= gridWidth) continue;

                const idx = nz * gridWidth + nx;
                const neighbor = grid[idx];
                if (neighbor) {
                    const dx = neighbor.x - x;
                    const dz = neighbor.z - z;
                    if (dx*dx + dz*dz < MIN_DIST*MIN_DIST) return false;
                }
            }
        }
        return true;
    }

    // Add initial point
    const x0 = rng() * mapSize - mapSize / 2;
    const z0 = rng() * mapSize - mapSize / 2;
    const firstPoint = { x: x0, z: z0 };
    points.push(firstPoint);
    activeList.push(firstPoint);
    grid[gridIndex(x0, z0)] = firstPoint;

    while (activeList.length > 0) {
        const randIndex = Math.floor(rng() * activeList.length); // get random point
        const point = activeList[randIndex];
        let found = false;

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const angle = rng() * Math.PI * 2;
            const radius = MIN_DIST * (1 + rng());
            const x = point.x + Math.cos(angle) * radius;
            const z = point.z + Math.sin(angle) * radius;

            if (isValidPoint(x,z)) {
                const newPoint = { x, z};
                points.push(newPoint);
                activeList.push(newPoint);
                grid[gridIndex(x, z)] = newPoint;
                found = true;
                break;
            }
        }

        if (!found) {
            activeList.splice(randIndex, 1); // remove from active list
        }
    }

    return points;
}