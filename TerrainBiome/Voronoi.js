import { lerp } from "../utils.js";

export class VoronoiRegions {
    constructor() {

        this.seedCount = 200;
        this.bucketSize = 64;
        this.regionSize = 64;

        this.seeds = [];            // all seed points
        this.buckets = new Map();   // spacial has buckets


    }

    generateSeeds(mapSize) {

        // fill a square area centered on (0.0)
        for (let i = 0; i < this.seedCount; i++) {
            const x = Math.random() * mapSize - mapSize/2; // center on 0,0
            const z = Math.random() * mapSize - mapSize/2;
            const elevation = Math.random() * 50 + 1; // base elevation bias
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