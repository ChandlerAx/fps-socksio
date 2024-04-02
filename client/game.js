import * as THREE from '../build/three.module.js';

import { MTLLoader } from 'three/addons/loaders/SFaRWr0fgvCZAR8PHmQKVvx2DCBM9wDdb0.js';
import * as Cannon from 'https://cdn.skypack.dev/cannon-es';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


var socket = io();
var memory = {
    guest: false,
    playing: false,
}
socket.on('data', (type, data) => {
    if (type === 'username') {
        //
    }
    if (type === 'rank') {
        //
    }
    if (type === 'guest') {
        if (data === true) {
            memory.guest = true;
        } else {
            memory.guest = false;
        }
    }
})

var keys = [];

document.addEventListener("keydown", (event) => {
    if (!keys.includes(event.key)) {
        keys.push(event.key);
    }
});

document.addEventListener("keyup", (event) => {
    for (var i = 0; i < keys.length; i++) {
        if (keys[i] == event.key) {
            keys.splice(i, 1);
        }
    }
});

var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0x8cd3f5, 1);
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);
camera.position.z = 50;
camera.rotation.order = "YXZ";
scene.add(camera);

let floor;
let wall1;
let wall2;
let wall3;
let wall4;
let block;
let block2;

var lastPlayerPosition = new THREE.Vector3();
var textureLoader = new THREE.TextureLoader();
var stoneTexture = textureLoader.load('./assets/bricks8x8.png');
var grasTexture = textureLoader.load('./assets/gras.png');
var stone_wallsT = textureLoader.load('./assets/stone.png');

function load_map_ffa() {
    const objLoader = new OBJLoader();

    stoneTexture.colorSpace = THREE.SRGBColorSpace;
    grasTexture.colorSpace = THREE.SRGBColorSpace;

    grasTexture.wrapS = grasTexture.wrapT = THREE.RepeatWrapping;
    grasTexture.offset.set(0, 0);
    grasTexture.repeat.set(20, 20);

    stoneTexture.minFilter = THREE.LinearFilter;


    stone_wallsT.colorSpace = THREE.sRGBEncoding;

    stone_wallsT.wrapS = stone_wallsT.wrapT = THREE.RepeatWrapping;
    stone_wallsT.offset.set(0, 0);
    stone_wallsT.repeat.set(16, 4);


    /*
    var barrelTexture = textureLoader.load('./assets/barrel.png');
    barrelTexture.wrapS = barrelTexture.wrapT = THREE.RepeatWrapping;
    var barrelMaterial = new THREE.MeshLambertMaterial({ map: barrelTexture });
    let barrelSize = 0.4
    objLoader.load('./assets/barrel.obj', function (barrelObject) {
        var barrelMesh = new THREE.Mesh(barrelObject.children[0].geometry, barrelMaterial);
        barrelMesh.position.set(-30, -12, 114); 
        barrelMesh.scale.set(barrelSize,barrelSize,barrelSize)
        scene.add(barrelMesh);
    });
    */


    var grasMaterial = new THREE.MeshLambertMaterial({ map: grasTexture });

    floor = new THREE.Mesh(
        new THREE.BoxGeometry(500, 5, 500),
        grasMaterial
    );
    scene.add(floor);
    floor.position.y = -15;


    var stone_walls = new THREE.MeshLambertMaterial({ map: stone_wallsT });

    wall1 = new THREE.Mesh(
        new THREE.BoxGeometry(500, 100, 5),
        stone_walls
    );
    scene.add(wall1);
    wall1.position.y = 32;
    wall1.position.z = 250;

    wall2 = new THREE.Mesh(
        new THREE.BoxGeometry(500, 100, 5),
        stone_walls
    );
    scene.add(wall2);
    wall2.position.y = 32;
    wall2.position.z = -250;

    wall3 = new THREE.Mesh(
        new THREE.BoxGeometry(5, 100, 500),
        stone_walls
    );
    scene.add(wall3);
    wall3.position.y = 32;
    wall3.position.x = 250;

    wall4 = new THREE.Mesh(
        new THREE.BoxGeometry(5, 100, 500),
        stone_walls
    );
    scene.add(wall4);
    wall4.position.y = 32;
    wall4.position.x = -250;



    var stoneMaterial = new THREE.MeshLambertMaterial({ map: stoneTexture });

    block = new THREE.Mesh(
        new THREE.BoxGeometry(30, 60, 30),
        stoneMaterial
    );
    scene.add(block);
    block.position.y = 0;
    block.position.x = -30;
    block.position.z = 90;

    block2 = new THREE.Mesh(
        new THREE.BoxGeometry(30, 60, 30),
        stoneMaterial
    );
    scene.add(block2);
    block2.position.y = 0;
    block2.position.x = 30;
    block2.position.z = -90;

}

var playermesh = new THREE.BoxGeometry(8, 18, 8);
var playermat = new THREE.MeshLambertMaterial({ color: 0x7499ab });

var playerObj = new THREE.Mesh(playermesh, playermat);
scene.add(playerObj);
playerObj.position.y = 10

var light = new THREE.PointLight(0xffffff);
light.position.set(100, 200, 200);
scene.add(light);

const amb_light = new THREE.AmbientLight(0x404040);
scene.add(amb_light);

var players = [];
var bullets = [];
let jumping = false;
let jumpVelocity = 0;

function loop() {
    if (jumping) {
        playerObj.translateY(jumpVelocity);
        jumpVelocity -= 0.1;
        if (playerObj.position.y <= 10) {
            playerObj.position.y = 10;
            jumping = false;
            jumpVelocity = 0;
        }
    }

    for (let i = 0; i < bullets.length; i++) {
        bullets[i].translateZ(-10);
    }

    const playerBoundingBox = new THREE.Box3().setFromObject(playerObj);
    const blockBoundingBox = new THREE.Box3().setFromObject(block);
    const block2BoundingBox = new THREE.Box3().setFromObject(block2);
    const wall1BoundingBox = new THREE.Box3().setFromObject(wall1);
    const wall2BoundingBox = new THREE.Box3().setFromObject(wall2);
    const wall3BoundingBox = new THREE.Box3().setFromObject(wall3);
    const wall4BoundingBox = new THREE.Box3().setFromObject(wall4);


    if (
        playerBoundingBox.intersectsBox(wall1BoundingBox) ||
        playerBoundingBox.intersectsBox(wall2BoundingBox) ||
        playerBoundingBox.intersectsBox(wall3BoundingBox) ||
        playerBoundingBox.intersectsBox(wall4BoundingBox) ||
        playerBoundingBox.intersectsBox(blockBoundingBox) ||
        playerBoundingBox.intersectsBox(block2BoundingBox)
    ) {

        const direction = new THREE.Vector3().subVectors(lastPlayerPosition, playerObj.position).normalize();

        playerObj.position.addScaledVector(direction, 1);
    } else {
        lastPlayerPosition.copy(playerObj.position);
    }


    if (memory.playing == true) {
        var moveX = 0;
        var moveZ = 0;

        if (keys.includes("a")) {
            moveX -= 0.7;
            update_walk();
        }

        if (keys.includes("d")) {
            moveX += 0.7;
            update_walk();
        }

        if (keys.includes("w")) {
            moveZ -= 0.7;
            update_walk();
        }

        if (keys.includes("s")) {
            moveZ += 0.7;
            update_walk();
        }

        var length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length !== 0) {
            moveX /= length;
            moveZ /= length;
        }

        playerObj.translateX(moveX);
        playerObj.translateZ(moveZ);

        if (keys.includes(" ") && !jumping) {
            jumping = true;
            jumpVelocity = 2;
        }

        if (jumping == true) update_walk();
    }

    camera.position.x = playerObj.position.x;
    camera.position.y = playerObj.position.y + 5;
    camera.position.z = playerObj.position.z;

    camera.rotation.y = playerObj.rotation.y;

    renderer.render(scene, camera);

    requestAnimationFrame(loop);
}



let shooting = false;

renderer.domElement.addEventListener("mousedown", (event) => {
    if (memory.playing == true) {
        if (event.button === 0) {
            if (document.pointerLockElement !== renderer.domElement) {
                renderer.domElement.requestPointerLock();
            } else {
                shooting = true;
                shoot();
            }
        }
    }
});

renderer.domElement.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
        shooting = false;
    }
});

function shoot() {
    if (shooting && document.pointerLockElement === renderer.domElement) {
        update_walk();
        socket.emit('bullet', parseFloat(camera.rotation.x.toFixed(2)));
        setTimeout(shoot, 100);
    }
}


renderer.domElement.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement == renderer.domElement) {
        let v = slider.value
        let old_p = camera.rotation.x
        if (camera.rotation.x < -1.5) camera.rotation.x += 0.03;
        if (camera.rotation.x > 1.5) camera.rotation.x -= 0.03;
        camera.rotation.x += -event.movementY / 5000 * v
        playerObj.rotation.y += -event.movementX / 5000 * v
        update_walk()
    }
});

const loader = new FBXLoader();
var players = {};
var textures = {};

socket.on('new_player', (position, socket_id) => {
    let id = socket_id
    if (socket_id == socket.id) {
        return;
    }

    loader.load('./assets/default.fbx', (fbx) => {
        const textureLoader = new THREE.TextureLoader();
        const skinTexture = textureLoader.load('./assets/default.png');
        const material = new THREE.MeshLambertMaterial({ map: skinTexture });
        const myPlayer = new THREE.Mesh(fbx.children[0].geometry, material);

        myPlayer.position.x = 0;
        myPlayer.position.y = 0;
        myPlayer.position.z = 0;
        myPlayer.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        myPlayer.scale.set(10, 10, 10);

        const force_field = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.DodecahedronGeometry(20, 4, 4)), new THREE.LineBasicMaterial({
            color: 'blue',
            linewidth: 2,
            transparent: true,
            opacity: 0.1
        }));
        force_field.position.set(0, 18, 0);

        setInterval(() => {
            force_field.rotation.y += 0.005
        }, 25)

        const playerGroup = new THREE.Group();
        playerGroup.add(myPlayer);
        playerGroup.add(force_field);

        playerGroup.position.set(position.x, position.y, position.z);

        playerGroup.position.y -= 23
        scene.add(playerGroup);

        players[id] = playerGroup;

        const context2d = document.createElement('canvas').getContext('2d');
        var size = 8;
        context2d.canvas.width = 256 * size;
        context2d.canvas.height = 128 * size;
        context2d.fillStyle = 'blue';
        context2d.font = `${20 * size}pt Helvetica`;
        context2d.textAlign = 'center';
        context2d.fillText(`ID: ${socket_id}`, 128 * size, 64 * size);

        const map = new THREE.CanvasTexture(context2d.canvas);
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: map, color: 0xffffff, fog: false })
        );
        sprite.scale.set(10, 5, 1);
        sprite.position.set(position.x, position.y + 20, position.z);
        textures[id] = sprite;
        scene.add(sprite);
    });
});


socket.on('new_player_position', (position, id) => {
    if (players[id]) {
        players[id].position.x = position.x;
        players[id].position.y = position.y - 23;
        players[id].position.z = position.z;
        players[id].rotation.y = position.r + Math.PI / 1;

        const context2d = document.createElement('canvas').getContext('2d');
        var size = 8;
        context2d.canvas.width = 256 * size;
        context2d.canvas.height = 128 * size;
        context2d.fillStyle = 'blue';
        context2d.font = `${20 * size}pt Helvetica`;
        context2d.textAlign = 'center';
        context2d.fillText(`ID: ${id}`, 128 * size, 64 * size);

        const map = new THREE.CanvasTexture(context2d.canvas);
        textures[id].material.map = map;
        textures[id].material.needsUpdate = true;

        textures[id].position.x = position.x;
        textures[id].position.y = position.y + 20;
        textures[id].position.z = position.z;
    }
});


socket.on('delete_player', (id) => {
    const player = players[id];
    const texture = textures[id];
    if (player) {
        delete_object(player)
        scene.remove(player);
        delete players[id];
    }
    if (texture) {
        delete_object(texture)
        scene.remove(texture);
        delete textures[id];
    }
});

socket.on('delete_bullet', (id) => {
    const index = bullets.findIndex(bullet => bullet.sid === id);
    if (index !== -1) {
        delete_object(bullets[index]);
        scene.remove(bullets[index]);
        bullets.splice(index, 1);
    }
});

socket.on('new_bullet', (order, bullet_id, positionX, positionY, positionZ, rotationX, rotationY, rotationZ) => {
    const goldMaterial = new THREE.MeshPhysicalMaterial({
        color: 'black',
        // metalness: 1,
        // roughness: 0.2
    });

    bullets.push(
        new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 32),
            goldMaterial
        )
    );

    bullets[bullets.length - 1].rotation.order = order;

    bullets[bullets.length - 1].position.x = positionX;
    bullets[bullets.length - 1].position.y = positionY;
    bullets[bullets.length - 1].position.z = positionZ;

    bullets[bullets.length - 1].rotation.x = rotationX;
    bullets[bullets.length - 1].rotation.y = rotationY + Math.PI / 1;
    bullets[bullets.length - 1].rotation.z = rotationZ;

    bullets[bullets.length - 1].initialPosition = bullets[bullets.length - 1].position.clone();

    bullets[bullets.length - 1].sid = bullet_id;

    scene.add(bullets[bullets.length - 1]);
});

socket.on('leaderboard', (data) => {
    data.sort((a, b) => b.kills - a.kills);
    var leaderboardList = document.querySelector('.APP_home_leaderboard_list');
    leaderboardList.innerHTML = '';
    data.forEach(function (userData, index) {
        var leaderboardItem = document.createElement('li');
        leaderboardItem.className = 'APP_home_leaderboard_item';
        leaderboardItem.innerHTML = `
            <span class="APP_home_lItem_number">${index + 1}</span>
            <span class="APP_home_lItem_player">${userData.username}</span>
            <span class="APP_home_lItem_score">${userData.kills}</span>
        `;
        leaderboardList.appendChild(leaderboardItem);
    });
});


socket.on('defeat', (data) => {
    memory.playing = false;
    document.getElementsByClassName('death_screen')[0].style.display = 'block';
    document.getElementById('total_kills').innerHTML = data.kills;
    document.getElementById('killstreak').innerHTML = data.kills_streak;
    document.getElementById('time_alive').innerHTML = convert_time(data.time_alive);

})

socket.on('respawn_succes', (position) => {
    memory.playing = true;
    document.getElementsByClassName('death_screen')[0].style.display = 'none';
    playerObj.position.x = position.x
    playerObj.position.y = position.y
    playerObj.position.z = position.z
})

socket.on('health_update', (amount) => {
    document.getElementsByClassName('hp_lab')[0].innerHTML = `${amount}/100`;
    document.getElementsByClassName('hp_bar_in')[0].style.width = `${amount}%`;
})

socket.on('hit', () => {
    var this_div = document.getElementsByClassName('hit')[0];
    var new_element = document.createElement('div');
    new_element.className = 'hitX';
    this_div.appendChild(new_element);
    new_element.innerHTML = '<p>Hit! +25 DMG</p>';
    setTimeout(() => {
        new_element.style.opacity = '0';
        setTimeout(() => {
            this_div.removeChild(new_element);
        }, 1000);
    }, 2000);
});

let lock = false;

function update_walk() {
    if (lock == false) {
        lock = true;
        setTimeout(() => {
            lock = false
        }, 50)
        socket.emit('move',
            parseFloat(playerObj.position.x.toFixed(3)),
            parseFloat(playerObj.position.y.toFixed(3)),
            parseFloat(playerObj.position.z.toFixed(3)),
            parseFloat(playerObj.rotation.y.toFixed(3))
        )
    }
}

function delete_object(object) {
    if (object.geometry) {
        object.geometry.dispose();
    }
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
        } else {
            object.material.dispose();
        }
    }
}

function convert_time(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var seconds = seconds % 60;
    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    return hours + ":" + minutes + ":" + seconds;
}

function slide_open(element, duration) {
    const panel = element;
    const start = Date.now();
    const int_left = -100;
    const target_left = 0;
    function animate() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const new_p = int_left + (target_left - int_left) * progress;
        panel.style.left = `${new_p}%`;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            panel.style.left = '50%';
        }
    }
    requestAnimationFrame(animate);
}

function slide_close(element, duration) {
    const panel = element;
    const start = Date.now();
    const int_left = 0;
    const target_left = -100;
    function animate() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const new_p = int_left + (target_left - int_left) * progress;
        panel.style.left = `${new_p}%`;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            panel.style.display = 'none';
        }
    }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


const slider2 = document.getElementById('graphics');
const graphics = document.cookie.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith("revolution="))?.split('=')[1];

if (graphics !== undefined) {
    slider2.value = graphics;
    renderer.setPixelRatio(slider2.value / 50)
    document.getElementsByClassName('sens2')[0].textContent = 'Revolution: ' + graphics + '%';
} else {
    renderer.setPixelRatio(window.devicePixelRatio || 1)
}

slider2.addEventListener('input', () => {
    document.getElementsByClassName('sens2')[0].textContent = 'Revolution: ' + slider2.value + '%';
    document.cookie = `revolution=${slider2.value}; expires=` + new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toUTCString() + "; path=/";
    renderer.setPixelRatio(slider2.value / 50)
});




const slider = document.getElementById('aim_sensitivity');
const aim_sens = document.cookie.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith("aim_sensitivity="))?.split('=')[1];

if (aim_sens !== undefined) {
    slider.value = aim_sens;
    document.getElementsByClassName('sens')[0].textContent = 'Aim Sensitivity: ' + aim_sens + '%';
}

slider.addEventListener('input', () => {
    document.getElementsByClassName('sens')[0].textContent = 'Aim Sensitivity: ' + slider.value + '%';
    document.cookie = `aim_sensitivity=${slider.value}; expires=` + new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toUTCString() + "; path=/";
});



document.getElementsByClassName('respawn_button')[0].onclick = () => {
    socket.emit('respawn')
}

document.getElementsByClassName('ffa')[0].onclick = () => {
    load_map_ffa()
    loop();
    socket.emit('play', 'ffa');
    memory.playing = true;
    document.getElementsByClassName('content')[0].style.display = 'none';
    document.getElementsByClassName('game')[0].style.display = 'block';
    renderer.domElement.requestPointerLock();
    audio.pause();
}

document.getElementsByClassName('home')[0].onclick = () => {

}

document.getElementsByClassName('pass')[0].onclick = () => {
    if (memory.guest === true) alert('You must be logged in to access this.')
}

document.getElementsByClassName('friends')[0].onclick = () => {
    if (memory.guest === true) alert('You must be logged in to access this.')
}

document.getElementsByClassName('shop')[0].onclick = () => {
    if (memory.guest === true) alert('You must be logged in to access this.')
}

document.getElementsByClassName('play')[0].onclick = () => {
    document.getElementsByClassName('game_modes')[0].style.display = 'block';
}

document.getElementsByClassName('client_settings')[0].onclick = () => {
    const settingsPanel = document.getElementsByClassName('settings_panel')[0];
    settingsPanel.style.display = 'block';
    slide_open(settingsPanel, 500);
    document.getElementsByClassName('crosshair')[0].style.display = 'none';
    document.getElementsByClassName('hp_bar')[0].style.display = 'none';
}

document.getElementsByClassName('settings_close')[0].onclick = () => {
    const settingsPanel = document.getElementsByClassName('settings_panel')[0];
    slide_close(settingsPanel, 500);
    document.getElementsByClassName('crosshair')[0].style.display = 'block';
    document.getElementsByClassName('hp_bar')[0].style.display = 'block';
    document.getElementsByClassName('graphics_m')[0].style.display = 'none';
}

document.getElementsByClassName('settings_button')[0].onclick = () => {
    document.getElementsByClassName('game_play')[0].style.display = 'block';
    document.getElementsByClassName('controls')[0].style.display = 'none';
    document.getElementsByClassName('graphics_m')[0].style.display = 'none';
}

document.getElementsByClassName('settings_button')[1].onclick = () => {
    document.getElementsByClassName('controls')[0].style.display = 'block';
    document.getElementsByClassName('game_play')[0].style.display = 'none';
    document.getElementsByClassName('graphics_m')[0].style.display = 'none';
}

document.getElementsByClassName('settings_button')[2].onclick = () => {
    document.getElementsByClassName('controls')[0].style.display = 'none';
    document.getElementsByClassName('game_play')[0].style.display = 'none';
    document.getElementsByClassName('graphics_m')[0].style.display = 'block';
}

document.getElementsByClassName('settings_button')[3].onclick = () => {
    document.getElementsByClassName('controls')[0].style.display = 'none';
    document.getElementsByClassName('game_play')[0].style.display = 'none';
    document.getElementsByClassName('graphics_m')[0].style.display = 'none';
}

document.getElementsByClassName('game_m_selection')[0].onclick = () => {
    document.getElementsByClassName('game_m_selection')[0].style.borderLeft = "2px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[1].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[2].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('featured_chard')[0].style.display = 'block';
}

document.getElementsByClassName('game_m_selection')[1].onclick = () => {
    document.getElementsByClassName('game_m_selection')[0].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[1].style.borderLeft = "2px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[2].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('featured_chard')[0].style.display = 'none';
}

document.getElementsByClassName('game_m_selection')[2].onclick = () => {
    document.getElementsByClassName('game_m_selection')[0].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[1].style.borderLeft = "0px solid rgb(61, 50, 50)";
    document.getElementsByClassName('game_m_selection')[2].style.borderLeft = "2px solid rgb(61, 50, 50)";
    document.getElementsByClassName('featured_chard')[0].style.display = 'none';
}