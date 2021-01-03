/******************************************************
  Hero Object
*******************************************************/
function Hero(game, x, y) {
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');

    // Adjust the anchor, the point where we handle sprites/images.
    // Anchor: vector that accepts values in the 0 to 1 range.
    // Central point would be (0.5, 0.5).
    this.anchor.set(0.5, 0.5);

    this.game.physics.enable(this);
    // Prevent our character from going off the screen!
    this.body.collideWorldBounds = true;

    // Add in animations for Hero
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
}

// Inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
    const SPEED = 200;
    // this.x += direction * 2.5; // 2.5 pixels each frame
    // move the body of the sprite instead
    this.body.velocity.x = direction * SPEED;


    // Make the hero flip direction if moving left/right
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    } else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
}

Hero.prototype.jump = function () {
    const JUMP_SPEED = 600;
    let canJump = this.body.touching.down; // check if a body is touching another body

    if (canJump) {
        this.body.velocity.y = -JUMP_SPEED;
    }
    return canJump;
}

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
}

Hero.prototype._getAnimationName = function() {
    let name = 'stop'; // default animation

    // umping
    if (this.body.velocity.y < 0) {
        name = 'jump';
    }
    // falling - y velocity is positive; not touching platform
    else if ( this.body.velocity.y >= 0 && !this.body.touching.down) {
        name = 'fall';
    }
    else if (this.body.velocity.x !== 0 && this.body.touching.down) {
        name = 'run';
    }
    return name;
}

Hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName)
    }
}


/******************************************************
  Spider Object
*******************************************************/
function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl')

    // Physics Properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

// This gets called each frame
Spider.prototype.update = function () {
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    } else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
}

Spider.prototype.die = function () {
    // this removes the sprite from physics operations, so its not taken into account for collissions
    this.body.enable = false;
    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
}


/******************************************************
  PlayState Class
*******************************************************/
const LEVEL_COUNT = 2; // used to restart game when levels complete
PlayState = {};

PlayState.init = function (data) {
    this.game.renderer.renderSession.roundPixels = true; // round pixels for smoother movements
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    // Subscribe key to signal (event)
    this.keys.up.onDown.add(function () {
        let didJump = this.hero.jump();
        if (didJump) {
            this.sfx.jump.play();
        }
    }, this)

    this.coinPickupCount = 0;
    this.hasKey = false;

    this.level = (data.level || 0) % LEVEL_COUNT;

};

// Load game assets.
PlayState.preload = function () {
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');

    this.game.load.image('background', 'images/background.png');

    // platforms
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');

    // hero (replaced with spritesheet below)
    // this.game.load.image('hero', 'images/hero_stopped.png')

    // enemies
    this.game.load.image('invisible-wall', 'images/invisible_wall.png')

    // coin count
    this.game.load.image('icon:coin', 'images/coin_icon.png')
    this.game.load.image('font:numbers', 'images/numbers.png');

    // load key
    this.game.load.image('key', 'images/key.png');

    // load spritesheets (animated images)
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22)
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32)
    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42)
    this.game.load.spritesheet('door', 'images/door.png', 42, 66)
    this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30)

    // audio
    this.game.load.audio('sfx:jump', 'audio/jump.wav')
    this.game.load.audio('sfx:coin', 'audio/coin.wav')
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav')
    this.game.load.audio('sfx:key', 'audio/key.wav')
    this.game.load.audio('sfx:door', 'audio/door.wav')
}
/******************************************************
  PlayState Setup Methods
*******************************************************/

// Create game entities and set up world.
PlayState.create = function() {
    this.game.add.image(0, 0, 'background');
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`))

    // Create sound entities
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door')
    }

    // Create Scoreboard
    this._createHud();
}

PlayState._loadLevel = function (data) {
    // Create groups/layers
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;
    this.bgDecoration = this.game.add.group();

    // Spawn all platforms.
    data.platforms.forEach(this._spawnPlatform, this);

    // Spawn hero and enemies.
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // Spawn important objects
    data.coins.forEach(this._spawnCoin, this);

    // Spawn door
    this._spawnDoor(data.door.x, data.door.y)

    // Spawn key
    this._spawnKey(data.key.x, data.key.y);

    // Enable gravity.
    // set gravity in level instead of init for more flexibility per level!
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
}


// This gets called each frame
PlayState.update = function () {
    this._handleInput();
    this._handleCollisions();

    // Tell retro font which text string to render
    this.coinFont.text = `x${this.coinPickupCount}`

    // If key obtained, change frame of spritesheet so key image shows filled in key
    this.keyIcon.frame = this.hasKey ? 1 : 0
}

PlayState._createHud = function () {
    // Initiate Phase.RetroFont
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);
    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.position.set(10, 10);

    this.hud.add(this.keyIcon);
}


/******************************************************
  PlayState Spawning Group Methods
*******************************************************/

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    this.game.add.sprite(platform.x, platform.y, platform.image);

    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // create invisible walls for enemies
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
}

PlayState._spawnCharacters = function (data) {
    // Spawn hero.
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);

    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this)
}

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5)
    sprite.animations.add('rotate', [0,1,2,1], 6, true);
    sprite.animations.play('rotate')
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
}

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
}

PlayState._spawnDoor = function (x,y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);

    // We enable physics to check for collisions between the door/hero
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
}

PlayState._spawnKey = function (x,y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);
    this.game.physics.enable(this.key);
    this.key.body.allowGravity = false;

    // Add a small up-down animation via a tween
    // More about tweens here: http://phaser.io/docs/2.6.2/Phaser.Tween.html
    this.key.y -= 3
    this.game.add.tween(this.key)
        .to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
}
/******************************************************
  PlayState Handlers
*******************************************************/

PlayState._handleCollisions = function () {

    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this);
    this.game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey, null, this)
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // Ignore if no key or player is in air
        function (hero, door) {
            return this.hasKey && hero.body.touching.down;
        }, this)
}

PlayState._handleInput = function() {
    if (this.keys.left.isDown) {
        this.hero.move(-1); // move left
    } else if  (this.keys.right.isDown) {
        this.hero.move(1); // move right
    } else {
        this.hero.move(0); // stop
    }

}

/******************************************************
  PlayState Physics event listeners
*******************************************************/
PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
}

PlayState._onHeroVsEnemy = function (hero, enemy) {
    // kill enemies when hero is falling
    if (hero.body.velocity.y > 0) {
        hero.bounce();
        enemy.die();
        this.sfx.stomp.play();
    } else {
        // game over
        this.sfx.stomp.play();
        this.game.state.restart(true, false, { level: this.level});
    }
}

PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill(); // remove key spritesheet when obtained
    this.hasKey = true;
}

PlayState._onHeroVsDoor = function (hero, door) {
    this.sfx.door.play();
    console.log(this.level)
    console.log(LEVEL_COUNT)
    if (this.level + 1 == LEVEL_COUNT) {
        this.game.state.start('win', true, false, { coins: this.coinPickupCount})
    } else {
        this.game.state.restart(true, false, { level: this.level + 1 });
    }
}


/******************************************************
  Win State
*******************************************************/
WinState = {};

WinState.init = function (data) {
    console.log(data)
    if (data != undefined) {
        this.coinPickupCount = data.coins;
    } else {
        this.coinPickupCount = 0;
    }
};

WinState.preload = function () {
    this.game.load.image('background', 'images/background.png');
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
}

WinState.create = function () {
    this.game.add.image(0, 0, 'background');
    let animatedCoinIcon = this.game.add.sprite(80, 215, 'coin')
    animatedCoinIcon.anchor.set(0.5, 0.5)
    animatedCoinIcon.animations.add('rotate', [0,1,2,1], 6, true);
    animatedCoinIcon.animations.play('rotate')

    let winLabel = this.game.add.text(80, 80, 'Yay!',
        {font: '50px Arial', fill: "#760e99"});
    let coinLabel = this.game.add.text(100, 200, 'You collected ' + this.coinPickupCount + ' coins. Nice job!',
        {font: '30px Arial', fill: "#760e99"});

    let startLabel = this.game.add.text(80, this.game.world.height - 80,
        'Press the "W" key to restart',
        {font: '25px Arial', fill: '#107003'})

    let wKey = this.game.input.keyboard.addKey(Phaser.KeyCode.W);
    wKey.onDown.addOnce(this.restart, this);
}

WinState.restart = function () {
    this.game.state.start('menu');
}



/******************************************************
  Menu State
*******************************************************/
MenuState = {};

MenuState.preload = function () {
    this.game.load.image('background', 'images/background.png');
}

MenuState.create = function () {
    this.game.add.image(0, 0, 'background');

    let nameLabel = this.game.add.text(80, 80, 'Adventures of Leat',
        {font: '50px Arial', fill: '#107003'})

    let startLabel = this.game.add.text(80, this.game.world.height - 80,
        'Press the "W" key to start',
        {font: '25px Arial', fill: '#107003'})

    let wKey = this.game.input.keyboard.addKey(Phaser.KeyCode.W);
    wKey.onDown.addOnce(this.start, this);
}

MenuState.start = function () {
    this.game.state.start('play', true, false, {level: 0})
}

/******************************************************
  Window event listeners
*******************************************************/
window.onload = function () {
    // Using Phaser.AUTO will render a WEBGL canvas if it's not available, it will
    // fall back to the regular 2D Canvas
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game')
    // A game state represents one "screen" in the game
    // the screen consists of: loading screen, main menu, level, etc
    game.state.add('play', PlayState);
    game.state.add('menu', MenuState);
    game.state.add('win', WinState);

    game.state.start('menu');

    // true - keep cache
    // false - don't keey existing worl dobjects
    // game.state.start('play', true, false, {level: 0})
}
