const physicsKernel = gpu.createKernel(function(particleData, gridData, particleIndices, gridSize, interactionDistanceSquared, ruleSet) {
    const particleIndex = this.thread.x;
    let x = particleData[particleIndex * 7];
    let y = particleData[particleIndex * 7 + 1];
    let vx = particleData[particleIndex * 7 + 2];
    let vy = particleData[particleIndex * 7 + 3];
    let fx = particleData[particleIndex * 7 + 4];
    let fy = particleData[particleIndex * 7 + 5];
    const colorIndex = particleData[particleIndex * 7 + 6];

    // Determine grid cell of this particle
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    const gridWidth = Math.ceil(gridSize / 800); // 800 is the max viewport width

    const particlesPerCell = particleData.length / 7;

    // Iterate over surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            // Compute linear index of the neighboring cell
            const neighborCellIndex = (gridX + dx) + (gridY + dy) * gridWidth; // gridWidth will be the number of cells in a row
            const startIndex = gridData[neighborCellIndex]; // Starting index in particleIndices for this cell

            if (startIndex !== -1) {
                // Iterate over particles in the neighboring cell
                for (let offset = 0; offset < particlesPerCell; offset++) { // particlesPerCell is the max number of particles in a cell
                    const otherParticleIndex = particleIndices[startIndex + offset];

                    if (otherParticleIndex === -1) break; // No more particles in this cell
                    if (otherParticleIndex === particleIndex) continue; // Skip self

                    let ox = particleData[otherParticleIndex * 7]; // other particle's x
                    let oy = particleData[otherParticleIndex * 7 + 1]; // other particle's y

                    const dx = x - ox;
                    const dy = y - oy;
                    const dSquared = dx * dx + dy * dy;

                    if (dSquared < interactionDistanceSquared && dSquared > 0) {
                        const distance = Math.sqrt(dSquared);
                        const overlap = 0.5 * (minParticleDistance - distance);

                    }
                }
            }
        }
    }

    return [x, y, vx, vy, fx, fy, colorIndex];
}).setOutput([particleData.length / 7]);

const updatedParticleData = physicsKernel(
    particleDataForGPU,
    flattenedGridData,
    particleIndices,
    this.interactionDistance,
    this.interactionDistanceSquared,
    ruleSetForGPU
);

// Kernel to update particle positions
const updatePositionKernel = gpu.createKernel(function(particles) {

    return;
}).setOutput([particlesArray.length]);

// Kernel to calculate forces between particles
const calculateForcesKernel = gpu.createKernel(function(particles) {

    return;
}).setOutput([particlesArray.length]);

// Kernel to handle collisions between particles
const handleCollisionsKernel = gpu.createKernel(function(particles) {

    return;
}).setOutput([particlesArray.length]);

const particleSimulationKernel = gpu.combineKernels(
    updatePositionKernel,
    calculateForcesKernel,
    handleCollisionsKernel,
    function(particles) {
        // Combine the operations
        particles = updatePositionKernel(particles);
        particles = calculateForcesKernel(particles);
        particles = handleCollisionsKernel(particles);
        return particles;
    }
);

const finalParticles = particleSimulationKernel(initialParticles);


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