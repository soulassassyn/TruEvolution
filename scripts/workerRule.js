onmessage = function(fullData) {
    let data = fullData.data[0];
    let particleSegment = fullData.data[1];
    
    // Iterate over each particle in the segment
    let updatedParticles = [];
    for (let i = 0; i < particleSegment.length; i++) {
        const particle = particleSegment[i];
        // Execute the rule for each particle against nearby particles
        const updatedParticle = rule(particle, getNearbyParticles(particle, data), data);
        updatedParticles.push(updatedParticle);
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

// Logic for simulation, p1 is a single particle, nearbyParticles are the particles to check against
function rule(p1, nearbyParticles, data) {
    const ruleSet = data.ruleSet;
    let a = p1; // particle a
    
    // Calculate force with nearby particles
    nearbyParticles.forEach((b) => { // particle b
        if (a === b) return; // Skip interaction with itself
        const dx = a.wx - b.wx;
        const dy = a.wy - b.wy;
        const dSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(dSquared);
        const dCalcs = { dx, dy, dSquared, distance };

        // Resolve collision if any
        [ a, b ] = resolveCollision(a, b, dCalcs);
        
        // Retrieve the gravity constant from the ruleSet using color property
        let gravityConstant = ruleSet[a.color][b.color];
        
        const force = calculateForce(gravityConstant, dCalcs, data);
        a.fx += force.fx;
        a.fy += force.fy;
    });
    // console.log(a);
    return a;
}

// Calculate the force between two particles
function calculateForce(gravityConstant, dCalcs, data) {
    const { dx, dy, dSquared, distance } = dCalcs;
    if (dSquared >= 0 && dSquared < data.interactionDistanceSquared) {
        const F = gravityConstant / distance; // F (force) is inversely proportional to distance (Newton's law of universal gravitation)
        return { fx: F * dx, fy: F * dy };
    }
    return { fx: 0, fy: 0 };
}

// Collision detection and resolution function
function resolveCollision(a, b, dCalcs) {
    const minDistance = 2; // Since each particle has a size of 2x2
    const { dx, dy, dSquared, distance } = dCalcs;
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