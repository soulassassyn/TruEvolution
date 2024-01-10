export class Kernels {
    constructor(runtime, particleDataLength2D, simulationConstants) {
        this.runtime = runtime;
        this.simulationConstants = simulationConstants;
        this.interactionDistance = simulationConstants[0];
        this.friction = simulationConstants[1];
        this.interactionDistanceSquared = simulationConstants[2];
        this.vwidth = simulationConstants[3];
        this.vheight = simulationConstants[4];
        this.gridWidth = simulationConstants[5];
        this.gridHeight = simulationConstants[6];
        this.gridSize = simulationConstants[7];
        this.stride = simulationConstants[8];
        this.totalParticles = simulationConstants[9];
        this.initializeKernels(particleDataLength2D, this.stride);
    }
    
    runOutputTest() {
        const particleData = this.runtime.Rules.particleDataForGPU2D;
        const gridIndices = this.runtime.Rules.gridIndices2D;
        const ruleSetForGPU = this.runtime.Rules.ruleSetForGPU;
        console.log(particleData);
        console.log(gridIndices);
        console.log(ruleSetForGPU);
        return this.outputTest(particleData, gridIndices, this.simulationConstants, ruleSetForGPU);
    }
    
    initializeKernels(particleDataLength, stride) {
        // Kernel test environement for debugging
        this.outputTest = this.runtime.gpu.createKernel(function(particleData, gridIndices, simulationConstants, ruleSet) {
            const totalParticles = simulationConstants[9];
            const particleIndex = this.thread.x;
            const attributeIndex = this.thread.y;
            let x = particleData[particleIndex][0];
            let y = particleData[particleIndex][1];
            let vx = particleData[particleIndex][2];
            let vy = particleData[particleIndex][3];
            const color = particleData[particleIndex][4];

            const particleCell = Math.floor(x / simulationConstants[7]) + (Math.floor(y / simulationConstants[7])) * simulationConstants[6];

            for (let xAxis = -1; xAxis <= 1; xAxis++) {
                for (let yAxis = -1; yAxis <= 1; yAxis++) {
                    const cellToCheck = particleCell + xAxis + yAxis * simulationConstants[6];
                    if (cellToCheck <= 0 && cellToCheck > simulationConstants[7]) break; // Skip if out of bounds
                    const startIndex = gridIndices[cellToCheck * 2];
                    const endIndex = gridIndices[cellToCheck * 2 + 1];
                    const actualParticlesInCell = endIndex - startIndex;
                    for (let j = 0; j < totalParticles; j++) {
                        if (j > actualParticlesInCell) break; // Skip if beyond actual particle count
                        const bIndex = particleData[startIndex + j]; // Particle to check against
                        const bX = particleData[bIndex][0];
                        const bY = particleData[bIndex][1];
                        const bColor = particleData[bIndex][4];
                        // Calculate distance between particles
                        const dx = x - bX;
                        const dy = y - bY;
                        const dSquared = dx * dx + dy * dy;
                        const distance = Math.sqrt(dSquared);
                        if (distance >= simulationConstants[0]) break; // Skip if beyond interaction distance
                        // Calculate force between particles
                        const gravityConstant = ruleSet[color * 4 + bColor] / 10; // Retrieve the gravity constant from the ruleSet using color property
                        const F = gravityConstant / distance; // F (force) is inversely proportional to distance (Newton's law of universal gravitation)

                        // Calculate force components
                        const fx = F * dx;
                        const fy = F * dy;
                        // Update velocity
                        vx += fx;
                        vy += fy;
                    }
                }
            }

            x += vx;
            y += vy;

            if (attributeIndex === 0) return x;
            if (attributeIndex === 1) return y;
            if (attributeIndex === 2) return vx;
            if (attributeIndex === 3) return vy;
            // return particleData[this.thread.y * stride + this.thread.x];
            // return particleData[this.thread.y][this.thread.x];
        }).setOutput([stride, particleDataLength]);
    }
}





// const updatedParticleData = physicsKernel(
//     particleDataForGPU,
//     flattenedGridData,
//     particleIndices,
//     this.interactionDistance,
//     this.interactionDistanceSquared,
//     ruleSetForGPU
// );

// // Kernel to update particle positions
// const updatePositionKernel = gpu.createKernel(function(particles) {

//     return;
// }).setOutput([particlesArray.length]);

// // Kernel to calculate forces between particles
// const calculateForcesKernel = gpu.createKernel(function(particles) {

//     return;
// }).setOutput([particlesArray.length]);

// // Kernel to handle collisions between particles
// const handleCollisionsKernel = gpu.createKernel(function(particles) {

//     return;
// }).setOutput([particlesArray.length]);

// const particleSimulationKernel = gpu.combineKernels(
//     updatePositionKernel,
//     calculateForcesKernel,
//     handleCollisionsKernel,
//     function(particles) {
//         // Combine the operations
//         particles = updatePositionKernel(particles);
//         particles = calculateForcesKernel(particles);
//         particles = handleCollisionsKernel(particles);
//         return particles;
//     }
// );

// const finalParticles = particleSimulationKernel(initialParticles);








// Reference Functions to convert to GPU

// // Get particles in the nearby cells including the cell of the current particle
// getNearbyParticles(particle) {
//     const gridSize = this.interactionDistance;
//     const nearbyParticles = [];
//     const x = Math.floor(particle.x / gridSize);
//     const y = Math.floor(particle.y / gridSize);
    
//     // Check the surrounding cells including the particle's own cell
//     for (let dx = -1; dx <= 1; dx++) {
//         for (let dy = -1; dy <= 1; dy++) {
//             const key = `${x + dx}_${y + dy}`;
//             if (this.grid[key]) {
//                 nearbyParticles.push(...this.grid[key]);
//             }
//         }
//     }
//     return nearbyParticles;
// }

// // Logic for simulation, particle is the object we'll be updating, nearbyParticles are the particles to check against
// rule(particle, nearbyParticles) {
//     let a = particle; // particle a
    
//     // Calculate force with nearby particles
//     nearbyParticles.forEach((b) => { // particle b
//         if (a === b) return; // Skip interaction with itself
//         const dx = a.x - b.x;
//         const dy = a.y - b.y;
//         const dSquared = dx * dx + dy * dy;
//         const distance = Math.sqrt(dSquared);
//         const dCalcs = { dx, dy, dSquared, distance };

//         // Resolve collision if any
//         this.resolveCollision(a, b, dCalcs);
        
//         // Retrieve the gravity constant from the ruleSet using color property
//         let gravityConstant = this.ruleSet[a.color][b.color];
        
//         const force = this.calculateForce(gravityConstant, dCalcs);
//         a.fx += force.fx;
//         a.fy += force.fy;
//     });
//     // this.updateParticlePosition(a);
//     return a;
// }

// // Collision detection and resolution function
// resolveCollision(a, b, dCalcs) {
//     const minDistance = 2; // Since each particle has a size of 2x2
//     const { dx, dy, dSquared, distance } = dCalcs;
//     // Check for collision
//     if (distance < minDistance && distance > 0) {
//         // Calculate overlap
//         const overlap = 0.5 * (minDistance - distance);
        
//         // Calculate the displacement needed for each particle along the line of centers
//         const displacementX = overlap * (dx / distance);
//         const displacementY = overlap * (dy / distance);
        
//         // Adjust positions to resolve collision
//         a.x += displacementX;
//         a.y += displacementY;
//         b.x -= displacementX;
//         b.y -= displacementY;
//     }
// }

// // Calculate the force between two particles
// calculateForce(gravityConstant, dCalcs) {
//     const { dx, dy, dSquared, distance } = dCalcs;
//     if (dSquared >= 0 && dSquared < this.interactionDistanceSquared) {
//         const F = gravityConstant / distance; // F (force) is inversely proportional to distance (Newton's law of universal gravitation)
//         return { fx: F * dx, fy: F * dy };
//     }
//     return { fx: 0, fy: 0 };
// }

// updateParticlePosition(particle) {
//     const a = particle;
//     // Update velocity and position
//     a.vx = (a.vx + a.fx) * this.friction;
//     a.vy = (a.vy + a.fy) * this.friction;
//     a.x += a.vx;
//     a.y += a.vy;
    
//     // Bounce off walls by ensuring particles are within bounds and adjusting velocity
//     if (a.x <= 0) {
//         // a.x = -a.x; // Reflect position from the boundary
//         a.vx *= -1; // Reverse velocity
//         a.x += a.vx;
//     } else if (a.x >= this.vwidth) {
//         // a.x = 2 * this.vwidth - a.x; // Reflect position from the boundary
//         a.vx *= -1; // Reverse velocity
//         a.x += a.vx;
//     }
//     if (a.y <= 0) {
//         // a.y = -a.y; // Reflect position from the boundary
//         a.vy *= -1; // Reverse velocity
//         a.y += a.vy;
//     } else if (a.y >= this.vheight) {
//         // a.y = 2 * this.vheight - a.y; // Reflect position from the boundary
//         a.vy *= -1; // Reverse velocity
//         a.y += a.vy;
//     }
// }