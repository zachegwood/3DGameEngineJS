import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export function extractFrustumPlanes(viewMatrix, projectionMatrix) {

    const vpMatrix = mat4.create();
    mat4.multiply(vpMatrix, projectionMatrix, viewMatrix); // P * V

    const planes = [];

    // Plane: [A, B, C, D] = ax + by + cz + d = 0

    // Left
    planes.push([
        vpMatrix[3] + vpMatrix[0],
        vpMatrix[7] + vpMatrix[4],
        vpMatrix[11] + vpMatrix[8],
        vpMatrix[15] + vpMatrix[12],
    ]);

    // Right
    planes.push([
        vpMatrix[3] - vpMatrix[0],
        vpMatrix[7] - vpMatrix[4],
        vpMatrix[11] - vpMatrix[8],
        vpMatrix[15] - vpMatrix[12],
    ]);

    // Bottom
    planes.push([
        vpMatrix[3] + vpMatrix[1],
        vpMatrix[7] + vpMatrix[5],
        vpMatrix[11] + vpMatrix[9],
        vpMatrix[15] + vpMatrix[13],
    ]);

    // Top
    planes.push([
        vpMatrix[3] - vpMatrix[1],
        vpMatrix[7] - vpMatrix[5],
        vpMatrix[11] - vpMatrix[9],
        vpMatrix[15] - vpMatrix[13],
    ]);

    // Near
    planes.push([
        vpMatrix[3] + vpMatrix[2],
        vpMatrix[7] + vpMatrix[6],
        vpMatrix[11] + vpMatrix[10],
        vpMatrix[15] + vpMatrix[14],
    ]);

    // Far
    planes.push([
        vpMatrix[3] - vpMatrix[2],
        vpMatrix[7] - vpMatrix[6],
        vpMatrix[11] - vpMatrix[10],
        vpMatrix[15] - vpMatrix[14],
    ]);

    // Normalize the planes
    for (let i = 0; i < 6; i++) {
        const [a, b, c, d] = planes[i];
        const len = Math.hypot(a, b, c);
        planes[i] = [a / len, b / len, c / len, d / len];
    }

    return planes;

}

//#region AABB Plane Test
function isAABBOutsidePlane(plane, aabb) {
    const [a, b, c, d] = plane;

    // Compute the "positive vertex" (farthest in direction of normal)
    const px = a >= 0 ? aabb.max[0] : aabb.min[0];
    const py = b >= 0 ? aabb.max[1] : aabb.min[1];
    const pz = c >= 0 ? aabb.max[2] : aabb.min[2];

    // If this point is outside the plane, AABB is outside
    return a * px + b * py + c * pz + d < 0;
}

//#region Frustum Cull
export function isAABBInFrustum(aabb, frustumPlanes) {
    for (const plane of frustumPlanes) {
        if (isAABBOutsidePlane(plane, aabb)) return false; // culled
    }
    return true;
}