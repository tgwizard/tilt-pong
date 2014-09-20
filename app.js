var http = require('http');
var express = require('express');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

app.use(express.static('static'));

// store in memory
var games = {};
var playerColors = ['rgba(200, 0, 0, 0.8)', 'rgba(0, 0, 200, 0.8)'];

function getOrCreateGame(gameName) {
  var game = games[gameName];
  if (game) return game;

  console.log('creating new game', gameName);
  return games[gameName] = {
    hostSocket: null,
    players: [],
  };
}

function leaveGame(gameName, leavingPlayer) {
  var game = games[gameName];
  if (!game) return console.log('no game with name', gameName, 'to leave');
  game.players = game.players.filter(function(player) { return player.player !== leavingPlayer; });

  if (game.hostSocket) game.hostSocket.emit('player left', leavingPlayer);
}

io.on('connection', function(socket) {
  var hostedGames = [];
  var joinedGames = [];

  console.log('user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
    console.log('unhosting games', hostedGames);
    hostedGames.forEach(function(g) { games[g].hostSocket = null });
    console.log('leaving games', joinedGames);
    joinedGames.forEach(function(jg) { leaveGame(jg.gameName, jg.player); });
  });

  socket.on('orientation data', function(data) {
    var game = getOrCreateGame(data.gameName);
    if (game.hostSocket) game.hostSocket.emit('orientation data', data);
  });

  socket.on('host game', function(data) {
    console.log('host game', data);
    var game = getOrCreateGame(data.gameName);
    game.hostSocket = socket;

    hostedGames.push(data.gameName);

    game.players.forEach(function(p) { socket.emit('new player joined', p.player); });
  });

  socket.on('join game', function(data) {
    console.log('join game', data);
    var game = getOrCreateGame(data.gameName);

    var player = {
      playerName: 'Player ' + (game.players.length + 1),
      playerColor: playerColors[game.players.length],
    };

    game.players.push({
      player: player,
      socket: socket
    });
    joinedGames.push({ gameName: data.gameName, player: player });

    console.log('new player joined', player);

    if (game.hostSocket) game.hostSocket.emit('new player joined', player);
    socket.emit('game joined', player);
  });
});

var port = process.env.PORT || 5000;
server.listen(port, function(err) {
  if (err) return console.log(err.stack);
  console.log('listening on port', port);
})
