var http = require('http');
var express = require('express');

var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

app.use(express.static('static'));

// store in memory
var games = {};
var playerColors = ['rgba(200, 0, 0, 0.8)', 'rgba(0, 0, 200, 0.8)'];

function leaveGame(gameName, leavingPlayer) {
  var game = games[gameName];
  if (!game) return console.log('FAIL, no game with name', gameName);
  game.players = game.players.filter(function(player) { return player.player !== leavingPlayer; });

  game.hostSocket.emit('player left', leavingPlayer);
}

io.on('connection', function(socket) {
  var hostedGames = [];
  var joinedGames = [];

  console.log('user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
    console.log('destroying games', hostedGames);
    hostedGames.forEach(function(g) { delete games[g]; });
    console.log('leaving games', joinedGames);
    joinedGames.forEach(function(jg) { leaveGame(jg.gameName, jg.player); });
  });

  socket.on('orientation data', function(data) {
    console.log('orientation data', data);
    var game = games[data.gameName]
    if (!game) return console.log('FAIL, no game with name', data.gameName);

    game.hostSocket.emit('orientation data', data);
  });

  socket.on('host game', function(data) {
    console.log('host game', data);
    games[data.gameName] = {
      hostSocket: socket,
      players: [],
    }

    hostedGames.push(data.gameName);
  });

  socket.on('join game', function(data) {
    console.log('join game', data);
    var game = games[data.gameName]
    if (!game) return console.log('FAIL, no game with name', data.gameName);

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

    game.hostSocket.emit('new player joined', player);
    socket.emit('game joined', player);
  });
});

var port = process.env.PORT || 5000;
server.listen(port, function(err) {
  if (err) return console.log(err.stack);
  console.log('listening on port', port);
})
