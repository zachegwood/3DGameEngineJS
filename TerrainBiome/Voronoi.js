import { lerp } from "../utils.js";

import { VORONOI_SEED_COUNT, VORONOI_BASE_ELEVATION, CHUNK_SIZE } from '/config.js'
import { generateSimplexNoise } from "./simplexNoise.js";



export class VoronoiRegions {
    constructor() {

        this.bucketSize = 64;
        this.regionSize = 64;

        this.seeds = [];            // all seed points
        this.buckets = new Map();   // spacial has buckets
    }



    generateSeeds(mapSize) {

        // fill a square area centered on (0.0)
        for (let i = 0; i < VORONOI_SEED_COUNT; i++) {
            const x = Math.random() * mapSize - mapSize/2; // center on 0,0
            const z = Math.random() * mapSize - mapSize/2;


    // Generate Simplex Noise. Probably change this later to ref a stored version
    const CONTINENT_FREQ = 0.0008;
    let continentValue = (generateSimplexNoise(x * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;

    // debug -- disables continent map
    //continentValue = 1;

            //const elevation = Math.random() * VORONOI_BASE_ELEVATION; // base elevation bias

            let elevation = Math.random() * VORONOI_BASE_ELEVATION * continentValue;

    // debug -- disables voronoi regions
    //elevation = continentValue * VORONOI_BASE_ELEVATION;


            const seed = { x, z, elevation };
      
            this.seeds.push(seed);

            // Place in spacial bucket
            const bx = Math.floor(x / this.bucketSize);
            const bz = Math.floor(z / this.bucketSize);
            const key = `${bx},${bz}`;
            //console.log(`Placed seed at (${x.toFixed(1)}, ${z.toFixed(1)}) in bucket ${key}`);
            if (!this.buckets.has(key)) this.buckets.set(key, []);
            this.buckets.get(key).push(seed);
        }
    }



        
    

    getHeight(x,z) {

        const bx = Math.floor(x / this.bucketSize);
        const bz = Math.floor(z / this.bucketSize);

        //console.log(`x,z (${x},${z}) : bx,bz (${bx},${bz}) -- bucketSize is ${this.bucketSize}`);

        let candidates = [];

        // Search surrounding buckets
        for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
                const key = `${bx+dx},${bz+dz}`;

                if (this.buckets.has(key)) {
                    candidates.push(...this.buckets.get(key));
                }
            }
        }        

        if (candidates.length === 0) return 0;

        // Find 2 closest seeds
        candidates.sort((a,b) => {
            const da = (a.x - x) **2 + (a.z - z) ** 2;
            const db = (b.x - x) **2 + (b.z - z) ** 2;
            return da - db;
        });

        const p1 = candidates[0];
        const p2 = candidates[1] || p1;

        const dist1 = Math.sqrt((p1.x - x) ** 2 + (p1.z - z) **2);
        const dist2 = Math.sqrt((p2.x - x) ** 2 + (p2.z - z) **2);

        const t = dist1 / (dist1 + dist2 + 0.0001); // avoid divide-by-zero
        const elevationBias = lerp(p1.elevation, p2.elevation, t);        

        return elevationBias;
    }
}