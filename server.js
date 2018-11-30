// Dependencies
var express  = require("express");
 	http 	 = require("http"),
 	path 	 = require("path"),
 	socketIO = require("socket.io"),
 	app 	 = express(),
 	server   = http.Server(app),
 	io 		 = socketIO(server);

app.use(express.static('static'));

app.set("port", 5000);

// Routing
app.get("/", function(request, response) {
  response.sendFile(path.join(__dirname, "Princeska.html"));
});

// Starts the server.
server.listen(5000, function() {
  console.log("Starting server on port 5000");
});

// Add the WebSocket handlers
io.on("connection", function(socket) {
});

// PLAYER CONNECTS
io.on('connection', function(socket) {
  socket.on('new player', function() {
    setInterval(function() {
  	io.sockets.emit("message", socket.id);
	}, 1000);
  });
});

// Test
