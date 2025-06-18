import { lerp } from "../utils.js";

import { VORONOI_SEED_COUNT, VORONOI_BASE_ELEVATION, CHUNK_SIZE } from '/config.js'
import { generateSimplexNoise, rng } from "./simplexNoise.js";


const CONTINENT_FREQ = 0.0008



export class VoronoiRegions {
    constructor() {

        this.bucketSize = 64;
        this.regionSize = 64;

        this.seeds = [];            // all seed points
        this.buckets = new Map();   // spacial has buckets

        this.biomeCount = {};

        this.flowMap = [];

    }


    // btw, mapsize is CHUNK_PIECES * CHUNK_SIZE


    //#region Gen Seeds
    generateSeeds(mapSize) {

        const margin = this.bucketSize;        

        // fill a square area centered on (0.0)
        for (let i = 0; i < VORONOI_SEED_COUNT; i++) {
            const x = rng() * mapSize - mapSize/2; // center on 0,0
            const z = rng() * mapSize - mapSize/2;

            // Generate Simplex Noise. Probably change this later to ref a stored version
            let continentValue = (generateSimplexNoise(x * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;

            // debug -- disables continent map
            //continentValue = 1;
            // debug -- disables voronoi regions (replace elevation below)
            //elevation = continentValue * VORONOI_BASE_ELEVATION;

            let bias = 1.5; // >1 biases toward higher values, <1 biases toward lower values
            let elevation = Math.pow(rng(), 1 / bias) * VORONOI_BASE_ELEVATION * continentValue;
            //let elevation = ((generateSimplexNoise(x * 0.02, z * 0.02) + 1) / 2) * continentValue * VORONOI_BASE_ELEVATION;

            //#region Biome Values
            const slope = this.getSlope(x,z); // partial derivitive of continent. gets rain shadow
            const flow = this.getFlow(x,z, slope);
            const moisture = slope.x < 0 ? 0.2 : 1.0; // Wind blows from +X. Terrain drier if in rain shadow
            const zNormalized = (z / mapSize) + 0.5; // between 0 - 1
            const temperature = zNormalized.toFixed(2); // warmer north, colder south
            const biome = this.getBiome(elevation, moisture, temperature);
            const color = this.getBiomeColor(biome);

            //#region SEED
            const seed = { 
                x, z, 
                elevation, 
                slope, // includes xDir, yDir, and mag
                flow,   // reverse slope
                downstreamSeed: null, // gets set below AFTER this loop builds all seeds
                moisture,
                temperature,
                biome,
                color
            };

            this.biomeCount[seed.biome] = (this.biomeCount[seed.biome] || 0) + 1;



            // // update our count of biomes
            // if (this.biomeCount[seed.biome]) {
            //     this.biomeCount[seed.biome] + 1;
            // } else {
            //     this.biomeCount[seed.biome] = 1;
            // }
            

            // print out every 20th seed to console
            //if (i % 20 === 0) console.log(`continentValue ${continentValue.toFixed(2)}. seed # ${i}: `, seed);
      
            this.seeds.push(seed);

            // Place in spacial bucket
            const bx = Math.floor(x / this.bucketSize);
            const bz = Math.floor(z / this.bucketSize);
            const key = `${bx},${bz}`;
            //console.log(`Placed seed at (${x.toFixed(1)}, ${z.toFixed(1)}) in bucket ${key}`);
            if (!this.buckets.has(key)) this.buckets.set(key, []);
            this.buckets.get(key).push(seed);
        }

        for (let i = 0; i < 30; i++) this.setErosion();

     



        console.log(this.biomeCount);
    }

    setErosion() {
   //console.log("Total buckets:", this.buckets.size);

        // Follow flow map to link seeds together
        // find seed downstream
        for (const seed of this.seeds) {
            seed.downstreamSeed = this.getDownstreamSeed(seed);
            seed.water = 1; // init, used below to accumulate
        }        

        for (const seed of this.seeds) {
            let ds = seed.downstreamSeed;
            while (ds) {
                ds.water += 1;
                ds = ds.downstreamSeed;
            }
        }

        for (const seed of this.seeds) {
            const erosion = seed.water * seed.flow.magnitude * 100 // tune constant
            

            if (seed.downstreamSeed && erosion > 0) {
                seed.elevation -= erosion; 
                seed.downstreamSeed.elevation += erosion * 0.5; // deposit a portion
            }
        }
    }

    //#region Downstream Sd
    getDownstreamSeed(seed) {
        const candidates = this.findCandidates(seed.x, seed.z, this.bucketSize);

        // bugfix - if nothing nearby, serach farther
        if (candidates.length === 0) candidates = this.findCandidates(seed.x, seed.z, this.bucketSize*4);

        let best = null;
        let bestScore = -Infinity;

        for (const neighbor of candidates) {
            if (neighbor.elevation >= seed.elevation) continue; // ignore uphill seeds                   

            const dx = neighbor.x - seed.x;
            const dz = neighbor.z - seed.z;

            const dot = (dx * seed.flow.x + dz * seed.flow.z) / Math.sqrt(dx*dx + dz*dz);
            if (dot > bestScore) {
                bestScore = dot;
                best = neighbor;  
            }
        }

        return best; // may still be null if local min or basin
    }


    //#region Get Biome
    getBiome(elevation, moisture, temperature) {

        // normalize
        elevation = elevation / VORONOI_BASE_ELEVATION;

        if (elevation > 0.80) {
            if (moisture < 0.25) return "plateau"; // high and dry
            return 'mountain';
        }

        if (elevation > 0.60) {
            if (moisture > 0.5) return 'forest';
            if (temperature < 0.25) return 'tundra'; // cold and high
            return 'plateau'; // dry but not cold
        }

        if (elevation > 0.3) {
            if (moisture < 0.15) return `desert`;
            if (temperature < 0.2) return 'tundra'; // expands to lower elevation if cold
            return 'plains';
        }

        if (elevation > 0.1) {
            if (moisture > 0.75) return 'swamp';
            return 'plains';
        }

        return 'coastal' // fallback
    }

    //#region Biome Color
    getBiomeColor(biome) {

        switch (biome) {
            case `mountains`: return [0.4, 0.4, 0.4];
            case `plateau`: return [0.1, 0.5, 0.2];

            case 'forest': return [0.8, 0.6, 0.6];      

            case 'desert': return [1.0, 1.0, 0.4];
            case 'tundra': return [0.8, 0.8, 1.0];
            case 'plains': return [0.3, 0.3, 0.3];            

            case 'swamp': return [0.0, 0.6, 0.0];
            case 'coastal': return [0.0, 0.0, 0.6];

            default: return [1.0, 1.0, 1.0]; // white = unknown
        }
    }

    //#region Find Candidates
    // search each seed bucket to find closest seeds
    findCandidates(x, z, sizeOfBucket) {

        let newCandidates = [];

        const bx = Math.floor(x / sizeOfBucket);
        const bz = Math.floor(z / sizeOfBucket);

         // Search surrounding buckets
        for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
                const key = `${bx+dx},${bz+dz}`;

                if (this.buckets.has(key)) {
                    newCandidates.push(...this.buckets.get(key));
                }
            }
        }        

        return newCandidates;
    }
        
    
    //#region GetSeedInfo
    getSeedInfo(x,z) {

        let candidates = this.findCandidates(x, z, this.bucketSize);

        // bug fix. if you couldn't find any close seeds, look farther
        if (candidates.length === 0) {
            candidates = this.findCandidates(x, z, this.bucketSize * 2);
        }
        

        //console.log(`x,z (${x},${z}) : bx,bz (${bx},${bz}) -- bucketSize is ${this.bucketSize}`);

        

       
        // this shouldn't get triggered anymore
        if (candidates.length === 0) {  return 0; }

        // Find 2 closest seeds
        candidates.sort((a,b) => {
            const da = (a.x - x) **2 + (a.z - z) ** 2;
            const db = (b.x - x) **2 + (b.z - z) ** 2;
            return da - db;
        });

        const p1 = candidates[0];
        const p2 = candidates[1] || p1;

        // Get elevation
        const dist1 = Math.sqrt((p1.x - x) ** 2 + (p1.z - z) **2);
        const dist2 = Math.sqrt((p2.x - x) ** 2 + (p2.z - z) **2);

        const t = dist1 / (dist1 + dist2 + 0.0001); // avoid divide-by-zero
        const elevationBias = lerp(p1.elevation, p2.elevation, t);        

        // Get biome
        const closestSeed = dist1 < dist2 ? p1 : p2; // whichever seed it closest

        

        return { y: elevationBias, closestSeed: closestSeed};
    }

    //#region Get Slope
    getSlope(x,z) { // used to calculate rain shadow (ie, blocked by wind?)

        const delta = 10; // or chunk/grid scale
        const left = (generateSimplexNoise((x - delta) * CONTINENT_FREQ, z * CONTINENT_FREQ) +1) / 2;
        const right = (generateSimplexNoise((x + delta) * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;
        const down  = (generateSimplexNoise(x * CONTINENT_FREQ, (z - delta) * CONTINENT_FREQ) + 1) / 2;
        const up    = (generateSimplexNoise(x * CONTINENT_FREQ, (z + delta) * CONTINENT_FREQ) + 1) / 2;          

        const dx = right - left;
        const dz = up - down;

        // magnitude of slope
        const slopeMag = Math.sqrt(dx * dx + dz * dz);

        const slope = { 
            x: dx, z: dz,       // normalized direction vector
            magnitude: slopeMag 
        };        

        return slope;
    }

    //#region Get Flow
    getFlow(x,z, slope) {  // flow is opposite of slope

        if (!slope) slope = this.getSlope(x,z);

        const flow = {
            x: -slope.x, 
            z: -slope.z, 
            magnitude: slope.magnitude
        }

        return flow;

    }
}