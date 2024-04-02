const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost',
  },
  maxHttpBufferSize: 100000,
  pingInterval: 3000,
  pingTimeout: 20000,
  allowEIO3: true,
  perMessageDeflate: { threshold: 200024 },
  serveClient: false,
  transports: ['websocket', 'polling'],
});

var players = {};
var bullets = {};
var last_bullet = {};
var players_data = {}
var leaderboard = [];

app.use(express.static(path.join(__dirname, './client')));

io.on("connection", (socket) => {

  players[socket.id] = { id: socket.id, position: { x: 0, y: -100, z: 0 }, r: 0 };
  players_data[socket.id] = { id: socket.id, user: 'Guest ' + Math.floor(Math.random() * 10000) + 9000, rank: 'Beginner 1', alive: false, health: 100, in_match: false };

  io.to('ffa').emit('leaderboard', leaderboard)

  socket.emit('data', 'username', players_data[socket.id].user);
  socket.emit('data', 'rank', players_data[socket.id].rank);
  socket.emit('data', 'guest', true);

  io.to('ffa').emit('new_player', players[socket.id].position, socket.id);

  socket.on('play', (mode) => {
    players_data[socket.id].alive = true;
    players_data[socket.id].in_match = true
    players[socket.id].y = 10;
    let x = 0;
    let y = 10;
    let z = 0;
    let r = 0;
    io.to('ffa').emit('new_player_position', { x, y, z, r }, socket.id);
    leaderboard.push({ username: players_data[socket.id].user, kills: 0, kills_streak: 0, time_alive: 0, id: players_data[socket.id].id });
    if (mode === 'ffa') {
      socket.join('ffa');
    }

    for (const playerId in players) {
      if (playerId !== socket.id) {
        const existing_player = players[playerId];
        socket.emit('new_player', { x: existing_player.position.x, y: existing_player.position.y, z: existing_player.position.z }, playerId);
      }
    }

  })

  socket.on('respawn', () => {
    if (players_data[socket.id].alive == false) {
      players_data[socket.id].alive = true;
      players[socket.id] = { id: socket.id, position: { x: 0, y: 10, z: 0 }, r: 0 };
      leaderboard.push({ username: players_data[socket.id].user, kills: 0, kills_streak: 0, time_alive: 0, id: players_data[socket.id].id });
      players_data[socket.id].health = 100;
      io.to('ffa').emit('new_player', { x: 0, y: 10, z: 0 }, socket.id);
      socket.emit('respawn_succes', players[socket.id].position);
      socket.emit('health_update', players_data[socket.id].health);
    }
  })

  socket.on("disconnect", () => {
    if (players[socket.id]) {
      io.to('ffa').emit('delete_player', players[socket.id].id);
      if (players[socket.id]) delete players[socket.id];
      if (players_data[socket.id].in_match == true) {

      }
      if (players_data[socket.id]) delete players_data[socket.id];
      if (last_bullet[socket.id]) delete last_bullet[socket.id];
      leaderboard = leaderboard.filter(item => item.id !== socket.id);
    }
  });

  socket.on('move', (x, y, z, r) => {
    if (!players[socket.id]) return;
    const currentPlayer = players[socket.id];
    currentPlayer.position.x = parseFloat(x.toFixed(3));
    currentPlayer.position.y = parseFloat(y.toFixed(3));
    currentPlayer.position.z = parseFloat(z.toFixed(3));
    currentPlayer.r = parseFloat(r.toFixed(3));
    io.to('ffa').emit('new_player_position', { x, y, z, r }, currentPlayer.id);
  });

  socket.on('bullet', (rA) => {
    if (!players[socket.id]) return;
    if (players_data[socket.id].alive === false) return;
    const this_time = new Date().getTime();
    const last_bullet_time = last_bullet[socket.id] || 0;

    if (this_time - last_bullet_time > 200) {
      last_bullet[socket.id] = this_time;
      const bullet_id = Math.floor(Math.random() * 9999999);
      bullets[bullet_id] = {
        x: players[socket.id].position.x,
        y: players[socket.id].position.y,
        z: players[socket.id].position.z,
        up_and_down_look_direction: rA,
        rotation_y: players[socket.id].r + Math.PI / 1,
        shooter: socket.id,
        id: bullet_id,
        speed: 7
      };
      io.to('ffa').emit('new_bullet', 'YXZ', bullet_id, bullets[bullet_id].x, bullets[bullet_id].y, bullets[bullet_id].z, rA, bullets[bullet_id].rotation_y, bullets[bullet_id].distance);
      setTimeout(() => {
        io.to('ffa').emit('delete_bullet', bullet_id);
        delete bullets[bullet_id];
      }, 3000);
    }
  });

});

setInterval(() => {
  for (const player in leaderboard) {
    leaderboard[player].time_alive += 1;
  }
  io.to('ffa').emit('leaderboard', leaderboard);

  for (const playerId in players) {
    if (players_data[playerId].health !== 100) {
      players_data[playerId].health += 1;
      io.to(playerId).emit('health_update', players_data[playerId].health);
    }
  }

}, 1000);

setInterval(() => {
  for (const bulletId in bullets) {
    const bullet = bullets[bulletId];

    const movementX = Math.sin(bullet.rotation_y) * bullet.speed;
    const movementZ = Math.cos(bullet.rotation_y) * bullet.speed;
    const movementY = Math.sin(bullet.up_and_down_look_direction) * bullet.speed;

    bullet.x += movementX;
    bullet.z += movementZ;
    bullet.y += movementY;

    const blocks = [
      // blocks
      { position: { x: -30, y: 0, z: 90 }, hitbox: { x: 31, y: 61, z: 31 } },
      { position: { x: 30, y: 0, z: -90 }, hitbox: { x: 31, y: 61, z: 31 } },

      // walls
      { position: { x: 0, y: 32, z: 250 }, hitbox: { x: 500, y: 100, z: 5 } },
      { position: { x: 0, y: 32, z: -250 }, hitbox: { x: 500, y: 100, z: 5 } },
      { position: { x: 250, y: 32, z: 0 }, hitbox: { x: 5, y: 100, z: 500 } },
      { position: { x: -250, y: 32, z: 0 }, hitbox: { x: 5, y: 100, z: 500 } },

      // floor
      { position: { x: 0, y: -18, z: 0 }, hitbox: { x: 500, y: 5, z: 500 } },
    ];

    for (const block of blocks) {
      if (
        Math.abs(bullet.x - block.position.x) < block.hitbox.x / 2 &&
        Math.abs(bullet.y - block.position.y) < block.hitbox.y / 2 &&
        Math.abs(bullet.z - block.position.z) < block.hitbox.z / 2
      ) {
        delete bullets[bullet.id];
        io.to('ffa').emit('delete_bullet', bullet.id);
        break;
      }
    }

    for (const playerId in players) {
      const player = players[playerId];

      const distanceX = Math.abs(player.position.x - bullet.x);
      const distanceY = Math.abs(player.position.y - bullet.y);
      const distanceZ = Math.abs(player.position.z - bullet.z);

      const hit_box = {
        x: 8,
        y: 4,
        z: 8
      };

      if (distanceX < hit_box.x && distanceY - 15 < hit_box.y && distanceZ < hit_box.z) {
        if (bullet.shooter === playerId) return;

        const defeatedPlayer = players[playerId]

        if (players_data[playerId].alive == true) {

          delete bullets[bullet.id];
          io.to(bullet.shooter).emit('hit');
          players_data[playerId].health -= 25;
          io.to(playerId).emit('health_update', players_data[playerId].health);

          if (players_data[playerId].health < 0 || players_data[playerId].health === 0) {

            delete defeatedPlayer;

            io.to('ffa').emit('delete_player', playerId);
            io.to('ffa').emit('delete_bullet', bullet.id);

            players_data[playerId].alive = false;

            const shooterStats = leaderboard.find(item => item.id === bullet.shooter);
            if (shooterStats) {
              shooterStats.kills += 1;
              shooterStats.kills_streak += 1;
            }

            const defeatedStats = leaderboard.find(item => item.id === playerId) || {
              kills: 0,
              kills_streak: 0,
              time_alive: 0
            };

            io.to(playerId).emit('defeat', defeatedStats);

            leaderboard = leaderboard.filter(item => item.id !== playerId);
          }
        }
      }

    }
  }
}, 60 / 1000);

http.listen(80);