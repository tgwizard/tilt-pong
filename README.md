# Tilt Pong

Multiplayer pong over ([socket.io](http://socket.io)).
One device hosts the game, and multiple players join to control their "pads" using device orientation.

## Setup on heroku

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/tgwizard/tilt-pong)

It is free.

## To setup locally:

1. Install node.js
2. `npm install`
3. `node app.js`
4. Find the IP of the server (e.g. `ifconfig`)
5. Browse to `{IP}:5000` on **one device** and choose "Host game"
6. Browse to `{IP}:5000` on **one or more devices** supporting the `deviceorientation` event (e.g. a mobile phone or table device) and choose "Player"
7. ~~Profit!~~Play!
