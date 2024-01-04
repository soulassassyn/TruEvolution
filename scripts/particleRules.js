export class Rules {
    constructor(runtime) {
        this.runtime = runtime;
        this.layer = "interactive"
        this.isSimulating = false;
        this.particles = {};
        this.colorValues = {
            blue: 0.1,
            red: 0.5,
            yellow: 0.65,
            green: 0.8,
        }
        this.createdColors = {};
        this.ruleSet = {
            blue: {
                blue: 0,
                red: 0,
                yellow: 0,
                green: 0,
            },
            red: {
                red: 0,
                blue: 0,
                yellow: 0,
                green: 0,
            },
            yellow: {
                yellow: 0,
                blue: 0,
                red: 0,
                green: 0,
            },
            green: {
                green: 0,
                blue: 0,
                red: 0,
                yellow: 0,
            },
        }


        this.interactionDistance = 150,
        this.friction = 0.5,
        this.interactionDistanceSquared = this.interactionDistance * this.interactionDistance;
        this.vwidth = this.runtime.viewportWidth;
        this.vheight = this.runtime.viewportHeight;
    }

    update() {
        if (!this.isSimulating) return;
        const colors = Object.keys(this.createdColors);
        // Iterate over each color for the affected group of particles
        for (let affectedColor of colors) {
            // Iterate over each color for the affecting group of particles
            for (let affectingColor of colors) {
                // Retrieve the gravity constant from the ruleSet
                let gravityConstant = this.ruleSet[affectedColor][affectingColor];
    
                // Execute the rule for the affected and affecting color pair
                this.rule(this.particles[affectedColor], this.particles[affectingColor], gravityConstant);
            }
        }    
    }

    createAllColors() {
        // Iterate over each color stored in createdColors and get the color and number of particles
        for (let color in this.createdColors) {
            let number = this.createdColors[color];
            this.create(number, color);
        }
    }
    
    create(number, color) {
        const vwidth = this.runtime.viewportWidth;
        const vheight = this.runtime.viewportHeight;
        // let group = [];
        for (let i = 0; i < number; i++) {
            const particle = this.runtime.objects.particle.createInstance(this.layer, this.random(vwidth), this.random(vheight));
            particle.effects[0].isActive = true;
            particle.effects[0].setParameter(0, this.colorValues[color]);
            particle.vx = 0;
            particle.vy = 0;
            // group.push(particle);
            if (!this.particles[color]) this.particles[color] = [];
            this.particles[color].push(particle);
        }
        // return group;
    }

    random(number) {
        return Math.random() * number;
    }

    // logic for simulation, p1 and p2 are the groups of particles, g is the gravity constant
    rule(p1, p2, g) {    
        for (let i = 0; i < p1.length; i++) {
            let fx = 0; // force in x direction
            let fy = 0; // force in y direction
            let a = p1[i]; // particle a
    
            // calculate force
            for (let j = 0; j < p2.length; j++) {
                let b = p2[j]; // particle b
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let dSquared = dx * dx + dy * dy; // square of distance between particles
                if (dSquared > 0 && dSquared < this.interactionDistanceSquared) {
                    let F = g / Math.sqrt(dSquared); // calculate F only when needed
                    fx += F * dx;
                    fy += F * dy;
                }
            }
    
            // update velocity and position
            a.vx = (a.vx + fx) * this.friction;
            a.vy = (a.vy + fy) * this.friction;
            a.x += a.vx;
            a.y += a.vy;
    
            // bounce off walls by ensuring particles are within bounds
            if (a.x <= 0 || a.x >= this.vwidth) {
                a.x = Math.max(0, Math.min(a.x, this.vwidth)); // constrain between 0 and vwidth
                a.vx *= -1;
            }
            if (a.y <= 0 || a.y >= this.vheight) {
                a.y = Math.max(0, Math.min(a.y, this.vheight)); // constrain between 0 and vheight
                a.vy *= -1;
            }
        }
    }

    startSimulation() {
        this.createAllColors();
        this.isSimulating = true;
    }

    resetSimulation() {
        this.isSimulating = false;
        this.particles = {};
        this.createdColors = {};
    }
}