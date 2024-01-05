onmessage = function(fullData) {
    console.log("Message received from main script");
    let gridSegment = fullData[1];
    let data = fullData[0];

    // Iterate over each cell in the grid
    for (let key in gridSegment) {
        const particlesInCell = gridSegment[key];

        // Iterate over each particle in the cell
        for (let i = 0; i < particlesInCell.length; i++) {
            const particle = particlesInCell[i];
            // Execute the rule for each particle against nearby particles
            rule(particle, getNearbyParticles(particle, data), data);
        }
    }
}

// // Get particles in the nearby cells including the cell of the current particle
function getNearbyParticles(particle, data) {
    const gridSize = data.interactionDistance;
    const nearbyParticles = [];
    const x = Math.floor(particle.x / gridSize);
    const y = Math.floor(particle.y / gridSize);
    
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
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dSquared = dx * dx + dy * dy; // square of distance between particles
    if (dSquared >= 0 && dSquared < data.interactionDistanceSquared) {
        const F = g / Math.sqrt(dSquared); // calculate F only when needed
        return { fx: F * dx, fy: F * dy };
    }
    return { fx: 0, fy: 0 };
}

// Collision detection and resolution function
function resolveCollision(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
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
        a.x += displacementX;
        a.y += displacementY;
        b.x -= displacementX;
        b.y -= displacementY;
    }
}

// Logic for simulation, p1 is a single particle, nearbyParticles are the particles to check against
function rule(p1, nearbyParticles, data) {
    const friction = data.friction;
    const ruleSet = data.ruleSet;
    const vwidth = data.vwidth;
    const vheight = data.vheight;
    let fx = 0; // force in x direction
    let fy = 0; // force in y direction
    let a = p1; // particle a
    
    // Calculate force with nearby particles
    nearbyParticles.forEach((b) => {
        if (a === b) return; // Skip interaction with itself
        
        // Resolve collision if any
        resolveCollision(a, b);    
        
        // Retrieve the gravity constant from the ruleSet, assuming particles have a color property
        let gravityConstant = ruleSet[a.color][b.color];
        
        const force = calculateForce(a, b, gravityConstant, data);
        fx += force.fx;
        fy += force.fy;
    });
    
    // Update velocity and position
    a.vx = (a.vx + fx) * friction;
    a.vy = (a.vy + fy) * friction;
    a.x += a.vx;
    a.y += a.vy;
    
    // Bounce off walls by ensuring particles are within bounds and adjusting velocity
    if (a.x <= 0) {
        a.x = -a.x; // Reflect position from the boundary
        a.vx *= -1; // Reverse velocity
    } else if (a.x >= vwidth) {
        a.x = 2 * vwidth - a.x; // Reflect position from the boundary
        a.vx *= -1; // Reverse velocity
    }
    if (a.y <= 0) {
        a.y = -a.y; // Reflect position from the boundary
        a.vy *= -1; // Reverse velocity
    } else if (a.y >= vheight) {
        a.y = 2 * vheight - a.y; // Reflect position from the boundary
        a.vy *= -1; // Reverse velocity
    }
}