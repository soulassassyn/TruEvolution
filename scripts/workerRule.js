onmessage = function(fullData) {
    let data = fullData.data[0];
    let gridSegment = fullData.data[1];

    // Iterate over each cell in the grid
    let updatedParticles = [];
    for (let key in gridSegment) {
        const particlesInCell = gridSegment[key];

        // Iterate over each particle in the cell
        for (let i = 0; i < particlesInCell.length; i++) {
            const particle = particlesInCell[i];
            // Execute the rule for each particle against nearby particles
            const updatedParticle = rule(particle, getNearbyParticles(particle, data), data);
            updatedParticles.push(updatedParticle);
        }
    }

    postMessage(updatedParticles);
}

// // Get particles in the nearby cells including the cell of the current particle
function getNearbyParticles(particle, data) {
    const gridSize = data.interactionDistance;
    const nearbyParticles = [];
    const x = Math.floor(particle.wx / gridSize);
    const y = Math.floor(particle.wy / gridSize);
    
    // Check the surrounding cells including the particle's own cell
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${x + dx}_${y + dy}`;
            if (data.grid[key]) {
                nearbyParticles.push(...data.grid[key]);
            }
        }
    }
    return nearbyParticles;
}

// Calculate the force between two particles
function calculateForce(a, b, g, data) {
    const dx = a.wx - b.wx;
    const dy = a.wy - b.wy;
    const dSquared = dx * dx + dy * dy; // square of distance between particles
    if (dSquared >= 0 && dSquared < data.interactionDistanceSquared) {
        const F = g / Math.sqrt(dSquared); // calculate F only when needed
        return { fx: F * dx, fy: F * dy };
    }
    return { fx: 0, fy: 0 };
}

// Collision detection and resolution function
function resolveCollision(a, b) {
    const dx = a.wx - b.wx;
    const dy = a.wy - b.wy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = 2; // Since each particle has a size of 2x2
    
    // Check for collision
    if (distance < minDistance && distance > 0) {
        // Calculate overlap
        const overlap = 0.5 * (minDistance - distance);
        
        // Calculate the displacement needed for each particle along the line of centers
        const displacementX = overlap * (dx / distance);
        const displacementY = overlap * (dy / distance);
        
        // Adjust positions to resolve collision
        a.wx += displacementX;
        a.wy += displacementY;
        b.wx -= displacementX;
        b.wy -= displacementY;
    }
    return [ a, b ];
}

// Logic for simulation, p1 is a single particle, nearbyParticles are the particles to check against
function rule(p1, nearbyParticles, data) {
    const ruleSet = data.ruleSet;

    let fx = 0; // force in x direction
    let fy = 0; // force in y direction
    let a = p1; // particle a
    
    // Calculate force with nearby particles
    nearbyParticles.forEach((b) => {
        if (a === b) return; // Skip interaction with itself
        // Resolve collision if any
        [ a, b ] = resolveCollision(a, b);
        
        // Retrieve the gravity constant from the ruleSet using color property
        let gravityConstant = ruleSet[a.color][b.color];
        
        const force = calculateForce(a, b, gravityConstant, data);
        a.fx += force.fx;
        a.fy += force.fy;
    });
    
    // // Update velocity and position
    // a.vx = (a.vx + fx) * friction;
    // a.vy = (a.vy + fy) * friction;
    // a.wx += a.vx;
    // a.wy += a.vy;
    
    // // Bounce off walls by ensuring particles are within bounds and adjusting velocity
    // if (a.wx <= 0) {
    //     a.wx = -a.wx; // Reflect position from the boundary
    //     a.vx *= -1; // Reverse velocity
    // } else if (a.wx >= vwidth) {
    //     a.wx = 2 * vwidth - a.wx; // Reflect position from the boundary
    //     a.vx *= -1; // Reverse velocity
    // }
    // if (a.wy <= 0) {
    //     a.wy = -a.wy; // Reflect position from the boundary
    //     a.vy *= -1; // Reverse velocity
    // } else if (a.wy >= vheight) {
    //     a.wy = 2 * vheight - a.wy; // Reflect position from the boundary
    //     a.vy *= -1; // Reverse velocity
    // }
    return a;
}