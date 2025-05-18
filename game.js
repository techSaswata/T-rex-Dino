const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverElement = document.getElementById('game-over');
const restartButton = document.getElementById('restart');

// Set canvas size
canvas.width = 800;
canvas.height = 300;

// Load images
const trexImg = new Image();
const cactusSmallImg = new Image();  
const cactusLargeImg = new Image();
const cloudImg = new Image();
const groundImg = new Image();
const restartImg = new Image();

trexImg.src = 'img/1x-trex.png';
cactusSmallImg.src = 'img/1x-obstacle-small.png';
cactusLargeImg.src = 'img/1x-obstacle-large.png';
cloudImg.src = 'img/1x-cloud.png';
groundImg.src = 'img/1x-horizon.png';
restartImg.src = 'img/1x-restart.png';

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -15;
const GROUND_HEIGHT = 20;
const DINO_WIDTH = 44;
const DINO_HEIGHT = 47;
const DINO_Y = canvas.height - GROUND_HEIGHT - DINO_HEIGHT;
const CACTUS_SMALL_WIDTH = 17;
const CACTUS_SMALL_HEIGHT = 35;
const CACTUS_LARGE_WIDTH = 25;
const CACTUS_LARGE_HEIGHT = 50;
const CLOUD_WIDTH = 46;
const CLOUD_HEIGHT = 14;
const RESTART_WIDTH = 36;
const RESTART_HEIGHT = 32;

// Game state
let gameSpeed = 4;
let score = 0;
let highScore = 0;
let gameOver = false;
let animationId;
let isNightMode = false;

// Cactus colors - cycle through these
const CACTUS_COLORS = [
    '#2a9d8f', // Teal
    '#e76f51', // Coral
    '#8338ec', // Purple
    '#fb8500', // Orange
    '#ffb703', // Yellow
    '#3a86ff'  // Blue
];
let colorIndex = 0; // Current color index

// Dino frame indexes
const STANDING = 0;
const RUN1 = 1;
const RUN2 = 2;

// Clouds
const clouds = [];
function spawnCloud() {
    clouds.push({
        x: canvas.width + Math.random() * 100,
        y: 30 + Math.random() * 40,
        speed: 1 + Math.random()
    });
}

// Dino object
const dino = {
    x: 50,
    y: DINO_Y,
    width: DINO_WIDTH,
    height: DINO_HEIGHT,
    jumping: false,
    velocity: 0,
    frame: RUN1,
    frameCount: 2,
    frameDelay: 5,
    frameCounter: 0,
    ducking: false,
    draw() {
        // Calculate frame position
        const frameX = this.frame * DINO_WIDTH;
        
        // Try to draw the dino image
        if (trexImg.complete && trexImg.naturalHeight !== 0) {
            try {
                ctx.drawImage(
                    trexImg,
                    frameX, 0,
                    DINO_WIDTH, DINO_HEIGHT,
                    this.x, this.y,
                    DINO_WIDTH, DINO_HEIGHT
                );
            } catch (e) {
                // Fallback to a rectangle if the image fails
                ctx.fillStyle = 'gray';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        } else {
            // Image not loaded, use a colored rectangle
            ctx.fillStyle = 'gray';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Debug outline (transparent by default)
        ctx.strokeStyle = 'transparent'; // Change to 'red' for debugging
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    },
    update() {
        // Animation
        if (!this.jumping) {
            this.frameCounter++;
            if (this.frameCounter >= this.frameDelay) {
                // Toggle between run frames (1 and 2)
                this.frame = this.frame === RUN1 ? RUN2 : RUN1;
                this.frameCounter = 0;
            }
        } else {
            this.frame = STANDING; // standing frame when jumping
        }
        // Jump physics
        if (this.jumping) {
            this.velocity += GRAVITY;
            this.y += this.velocity;
            if (this.y > DINO_Y) {
                this.y = DINO_Y;
                this.jumping = false;
                this.velocity = 0;
            }
        }
    },
    jump() {
        if (!this.jumping) {
            this.jumping = true;
            this.velocity = JUMP_FORCE;
        }
    },
    duck(state) {
        this.ducking = state;
    }
};

// Obstacles array
let obstacles = [];
class Obstacle {
    constructor() {
        this.type = Math.random() < 0.5 ? 'small' : 'large';
        
        if (this.type === 'small') {
            this.width = 17;
            this.height = 35;
        } else {
            this.width = 25; 
            this.height = 50;
        }
        
        this.x = canvas.width;
        this.y = canvas.height - GROUND_HEIGHT - this.height;
        
        // Get current color and increment color index
        this.color = CACTUS_COLORS[colorIndex];
        colorIndex = (colorIndex + 1) % CACTUS_COLORS.length; // Cycle through colors
    }
    
    draw() {
        // Draw a cactus-like shape using basic drawing operations
        const stemWidth = this.width * 0.4;
        const stemX = this.x + (this.width - stemWidth) / 2;
        
        // Main stem
        ctx.fillStyle = this.color;
        ctx.fillRect(stemX, this.y, stemWidth, this.height);
        
        // Add arms for larger cacti
        if (this.type === 'large') {
            // Left arm
            ctx.fillRect(stemX - stemWidth*0.8, this.y + this.height * 0.3, stemWidth * 1.2, stemWidth);
            // Right arm
            ctx.fillRect(stemX + stemWidth, this.y + this.height * 0.6, stemWidth * 1.2, stemWidth);
        } else {
            // Small cactus branch
            ctx.fillRect(stemX + stemWidth, this.y + this.height * 0.4, stemWidth * 0.8, stemWidth);
        }
        
        // Debug outline
        ctx.strokeStyle = 'transparent'; // Change to 'red' for debugging
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    update() {
        this.x -= gameSpeed;
    }
}

// Ground
const ground = {
    x: 0,
    y: canvas.height - GROUND_HEIGHT,
    draw() {
        if (groundImg.complete && groundImg.naturalHeight !== 0) {
            try {
                ctx.drawImage(groundImg, this.x, this.y, canvas.width, GROUND_HEIGHT);
            } catch (e) {
                ctx.fillStyle = '#535353';
                ctx.fillRect(this.x, this.y, canvas.width, GROUND_HEIGHT);
            }
        } else {
            ctx.fillStyle = '#535353';
            ctx.fillRect(this.x, this.y, canvas.width, GROUND_HEIGHT);
        }
    }
};

function checkCollision(dino, obstacle) {
    return !(
        dino.x + dino.width < obstacle.x ||
        dino.x > obstacle.x + obstacle.width ||
        dino.y + dino.height < obstacle.y ||
        dino.y > obstacle.y + obstacle.height
    );
}

function updateScore() {
    score++;
    const displayScore = Math.floor(score / 10);
    scoreElement.textContent = displayScore;
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = `HI: ${Math.floor(highScore / 10)}`;
    }
    
    // Day/night cycle based on displayed score (not raw score)
    // Switch every 50 HI points (displayed score)
    if (displayScore % 50 === 0 && score % 10 === 0) { // Only trigger on exact 50-point marks
        isNightMode = !isNightMode;
        
        // Change the canvas background
        if (isNightMode) {
            canvas.style.backgroundColor = '#003';
            canvas.style.transition = 'background-color 1s';
        } else {
            canvas.style.backgroundColor = 'white';
            canvas.style.transition = 'background-color 1s';
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clouds
    if (clouds.length === 0 || clouds[clouds.length - 1].x < canvas.width - 200) {
        spawnCloud();
    }
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].x -= clouds[i].speed;
        
        if (cloudImg.complete && cloudImg.naturalHeight !== 0) {
            try {
                ctx.drawImage(cloudImg, clouds[i].x, clouds[i].y, CLOUD_WIDTH, CLOUD_HEIGHT);
            } catch (e) {
                ctx.fillStyle = '#f1f1f1';
                ctx.fillRect(clouds[i].x, clouds[i].y, CLOUD_WIDTH, CLOUD_HEIGHT/2);
            }
        } else {
            ctx.fillStyle = '#f1f1f1';
            ctx.fillRect(clouds[i].x, clouds[i].y, CLOUD_WIDTH, CLOUD_HEIGHT/2);
        }
    }
    while (clouds.length && clouds[0].x < -CLOUD_WIDTH) clouds.shift();

    // Ground
    ground.draw();

    // Dino
    dino.update();
    dino.draw();

    // Obstacles
    if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvas.width - 500) {
        obstacles.push(new Obstacle());
    }
    obstacles = obstacles.filter(obstacle => {
        obstacle.update();
        obstacle.draw();
        if (checkCollision(dino, obstacle)) {
            gameOver = true;
            gameOverElement.classList.remove('hidden');
            // Draw restart button with image
            const restartRect = restartButton.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const buttonX = (restartRect.left - canvasRect.left) + (restartRect.width/2 - RESTART_WIDTH/2);
            const buttonY = (restartRect.top - canvasRect.top) + (restartRect.height/2 - RESTART_HEIGHT/2);
            cancelAnimationFrame(animationId);
            return false;
        }
        return obstacle.x > -obstacle.width;
    });

    // Score
    updateScore();
    if (score % 500 === 0) gameSpeed += 0.5;
    if (!gameOver) animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !gameOver) dino.jump();
    if (e.code === 'ArrowDown') dino.duck(true);
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') dino.duck(false);
});

restartButton.addEventListener('click', () => {
    // Reset game state
    gameOver = false;
    score = 0;
    gameSpeed = 4;
    isNightMode = false;
    
    // Reset canvas background to day mode
    canvas.style.backgroundColor = 'white';
    
    // Reset dino
    dino.y = DINO_Y;
    dino.jumping = false;
    dino.velocity = 0;
    dino.frame = RUN1;
    dino.frameCounter = 0;
    dino.ducking = false;
    
    // Clear obstacles and clouds
    obstacles = [];
    clouds.length = 0;
    
    // Hide game over message
    gameOverElement.classList.add('hidden');
    
    // Start the game loop
    gameLoop();
    
    // Focus on the game canvas for keypress events
    canvas.focus();
});

// Start game when all images are loaded
let imagesLoaded = 0;
const totalImages = 6;

function imageLoaded() {
    imagesLoaded++;
    console.log(`Image loaded: ${imagesLoaded}/${totalImages}`);
    if (imagesLoaded >= totalImages) {
        console.log("All images loaded, starting game");
        gameLoop();
    }
}

// Add error handling for image loading
function handleImageError(imageName) {
    return function() {
        console.error(`Failed to load image: ${imageName}`);
    };
}

trexImg.onload = imageLoaded;
cactusSmallImg.onload = imageLoaded;
cactusLargeImg.onload = imageLoaded;
cloudImg.onload = imageLoaded;
groundImg.onload = imageLoaded;
restartImg.onload = imageLoaded;

trexImg.onerror = handleImageError('trexImg');
cactusSmallImg.onerror = handleImageError('cactusSmallImg');
cactusLargeImg.onerror = handleImageError('cactusLargeImg');
cloudImg.onerror = handleImageError('cloudImg');
groundImg.onerror = handleImageError('groundImg');
restartImg.onerror = handleImageError('restartImg');

// Check if the image paths are correct
console.log("Image paths:");
console.log("Trex:", trexImg.src);
console.log("Cactus Small:", cactusSmallImg.src);
console.log("Cactus Large:", cactusLargeImg.src); 