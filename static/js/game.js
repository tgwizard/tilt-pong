(function() {
  var socket = io();

  var c = document.getElementById('container');
  var setHost = document.getElementById('set-host');
  var setPlayer = document.getElementById('set-player');

  setHost.addEventListener('click', setHostEventListener);
  setPlayer.addEventListener('click', setPlayerEventListener);

  function setHostEventListener(event) {
    event.stopPropagation();
    c.innerHTML = '<canvas id="game"></canvas>';
    setHost.removeEventListener('click', setHostEventListener);
    setPlayer.removeEventListener('click', setPlayerEventListener);
    //fullScreen();
    setupHost();
  }

  function setPlayerEventListener(event) {
    event.stopPropagation();
    c.innerHTML = '<canvas id="game-player"></canvas><div id="player-name"></div>';
    setHost.removeEventListener('click', setHostEventListener);
    setPlayer.removeEventListener('click', setPlayerEventListener);
    //fullScreen();
    setupPlayer();
  }

  function setupHost() {
    socket.emit('host game', { gameName: 'adam' });

    var players = [];
    playerPlacementOrder = ['left', 'right', 'bottom', 'top'];

    socket.on('new player joined', function(data) {
      console.log('new player joined', data);
      players.push(setupPlayer({
        name: data.playerName,
        color: data.playerColor,
        placement: playerPlacementOrder[players.length],
        leftKey: 37,
        rightKey: 39
      }));
    });

    socket.on('player left', function(data) {
      console.log('player left', data);
      players = players.filter(function(p) { return p.name !== data.playerName; });
    });

    socket.on('orientation data', function(data) {
      var player = players.filter(function(p) { return p.name === data.playerName; })[0];
      if (!player) return console.log('Player not found', data.playerName);

      var tilt = data.beta;
      if (tilt < -45) tilt = -45;
      if (tilt > 45) tilt = 45;
      tilt += 45;

      player.pos = tilt / 90;
    });

    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');

    function getViewPortSize() {
      // http://stackoverflow.com/questions/1248081/get-the-browser-viewport-dimensions-with-javascript
      var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      return { x: 0, y: 0, w: w, h: h };
    }

    function getGameBoardSize() {
      var vp = getViewPortSize();
      return { x: 4, y: 4, w: vp.w - 8, h: vp.h - 8, border: 4, vp: vp };
    }

    function setViewPort() {
      var vp = getViewPortSize();
      canvas.width = vp.w;
      canvas.height = vp.h;
    }

    setViewPort();
    window.onresize = setViewPort;

    var ball = {};

    function setupPlayer(options) {
      var player = {
        name: options.name,
        placement: options.placement,
        color: options.color,
        pos: 0.5,
        w: ['bottom', 'top'].indexOf(options.placement) !== -1 ? 80 : 10,
        h: ['bottom', 'top'].indexOf(options.placement) !== -1 ? 10 : 80,
        left: 0,
        right: 0,
        isHit: false,
      };

      player.getPos = function(gs) {
        var pos;
        if (player.placement === 'top')    pos = { x: gs.x + gs.w * player.pos, y: gs.y };
        if (player.placement === 'bottom') pos = { x: gs.x + gs.w * player.pos, y: gs.y + gs.h - player.h };
        if (player.placement === 'left')   pos = { x: gs.x, y: gs.y + gs.h * player.pos };
        if (player.placement === 'right')  pos = { x: gs.x + gs.w - player.w, y: gs.y + gs.h * player.pos };

        if (pos.x + player.w > gs.x + gs.w) pos.x = gs.w - player.w + gs.x;
        if (pos.y + player.h > gs.y + gs.h) pos.y = gs.h - player.h + gs.y;
        return pos;
      };

      window.addEventListener('keydown', function(event) {
        if (event.keyCode === options.leftKey) player.left = 1;
        if (event.keyCode === options.rightKey) player.right = 1;
      });

      window.addEventListener('keyup', function(event) {
        if (event.keyCode === options.leftKey) player.left = 0;
        if (event.keyCode === options.rightKey) player.right = 0;
      });

      return player;
    }

    var gs = getGameBoardSize();
    ball.size = 10;
    ball.pos = { x: gs.vp.w/2 - ball.size/2, y: gs.vp.h/2 - ball.size/2 };
    ball.dir = { x: -4, y: 4 };


    function updateScene(delta) {
      var PLAYER_SPEED = 0.0005;
      var gs = getGameBoardSize();

      // Update player
      players.forEach(function(player) {
        player.pos -= player.left * delta * PLAYER_SPEED;
        player.pos += player.right * delta * PLAYER_SPEED;

        if (player.pos > 1) player.pos = 1;
        if (player.pos < 0) player.pos = 0;
      });

      // Update ball
      ball.pos.x += ball.dir.x;
      if (ball.pos.x + ball.size > gs.x + gs.w) {
        ball.pos.x = gs.w - ball.size + gs.x;
        ball.dir.x = -ball.dir.x;
      } else if (ball.pos.x < gs.x) {
        ball.pos.x = gs.x;
        ball.dir.x = -ball.dir.x;
      }

      ball.pos.y += ball.dir.y;
      if (ball.pos.y + ball.size > gs.y + gs.h) {
        ball.pos.y = gs.h - ball.size + gs.y;
        ball.dir.y = -ball.dir.y;
      } else if (ball.pos.y < gs.y) {
        ball.pos.y = gs.y;
        ball.dir.y = -ball.dir.y;
      }

      // detect hits
      players.forEach(function(player) {
        var pos = player.getPos(gs);

        var hit = true;
        if (ball.pos.x + ball.size < pos.x) hit = false;
        if (ball.pos.x > pos.x + player.w) hit = false;
        if (ball.pos.y + ball.size < pos.y) hit = false;
        if (ball.pos.y > pos.y + player.h) hit = false;

        if (!player.isHit && hit) {
          console.log('hit player', player.name);
        }

        player.isHit = hit;
      });
    }

    function drawScene() {
      var gs = getGameBoardSize();

      ctx.clearRect(0, 0, gs.vp.w, gs.vp.h);

      drawBorder(gs.vp);
      players.forEach(function(player) {
        drawPlayer(gs, player);
      });
      drawBall(ball);
    }

    function drawBorder(vp) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, 4, vp.h);
      ctx.fillRect(0, 0, vp.w, 4);
      ctx.fillRect(vp.w-4, 0, 4, vp.h);
      ctx.fillRect(0, vp.h-4, vp.w, 4);
    }

    function drawPlayer(gs, player) {
      if (player.isHit) ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      else ctx.fillStyle = player.color;
      var pos = player.getPos(gs);
      ctx.fillRect(pos.x, pos.y, player.w, player.h);
    }

    function drawBall(ball) {
      ctx.fillStyle = 'rgba(200, 200, 0, 0.8)';
      ctx.fillRect(ball.pos.x, ball.pos.y, ball.size, ball.size);
    }

    var prevTime = new Date();
    var ih = setInterval(function() {
      var now = new Date();
      delta = now - prevTime;
      prevTime = now;

      updateScene(delta);
      drawScene();
    }, 15);
  }

  function setupPlayer() {
    var canvas = document.getElementById('game-player');
    var playerNameTag = document.getElementById('player-name');

    var playerName;

    socket.emit('join game', { gameName: 'adam' });

    socket.on('game joined', function(data) {
      console.log('game joined', data);
      canvas.style.backgroundColor = data.playerColor;
      playerNameTag.innerHTML = data.playerName;
      playerName = data.playerName;s
    })

    window.addEventListener('deviceorientation', function(event) {
      var alpha = event.alpha; // direction
      var beta = event.beta; // tilt front-back
      var gamma = event.gamma; // tilt left-right

      var data = { gameName: 'adam', playerName: playerName, alpha: alpha, beta: beta, gamma: gamma };
      socket.emit('orientation data', data);
    });
  }
})();