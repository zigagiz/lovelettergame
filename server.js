// Dependencies
var express  = require("express");
 	http 	 = require("http"),
 	path 	 = require("path"),
 	socketIO = require("socket.io"),
 	app 	 = express(),
 	server   = http.Server(app),
 	io 		 = socketIO(server, {'pingInterval': 2000, 'pingTimeout': 60000});


app.use(express.static('static'));

app.set("port", 3000);

// Routing
app.get("/", function(request, response) {
  response.sendFile(path.join(__dirname, "Princeska.html"));
});

// Starts the server.
server.listen(3000, function() {
  console.log("Starting server on port 3000");
});

// Add the WebSocket handlers
io.on("connection", function(socket) {
});

// PLAYER CONNECTS
io.on("connection", function(socket) {
  // LISTEN FOR "NEW PLAYER" EMIT FROM CLIENT
  socket.on("new player", function() {
  	io.sockets.emit("message", "Player with id " + socket.id + " connected.");
  	socket.emit("player id", socket.id);
  	game.sitPlayer(socket);
  });
  // LISTEN FOR DISCONNECT EVENT
  socket.on("disconnect", function(reason) {
  	socket.broadcast.emit("message", "Player with id " + socket.id + " disconnected.");
  	console.log("Player with id " + socket.id + " disconnected. Reason: " + reason);
  	var leavingPlayer = game.players.find(player => player.SocketId == socket.id);
  	console.log(socket.id);
  	console.log(leavingPlayer);
  	if (leavingPlayer != undefined) {
  		leavingPlayer.chairTaken = false;
  	};
  });
});

// ===================SERVER LOGIC==============================================================================
// ===================================================SERVER LOGIC==============================================
// ===================================================================================SERVER LOGIC==============

game = {};
game.currentPlayer = {};
game.currentPlayerIndex = null;
game.firstPlayer = null;
game.firstPlayerIndex = null;
game.smallerCardIndex = null;

game.players = [
	{
		name: "Player 1",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 0,
		SocketId: ""
	},
	{
		name: "Player 2",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 1,
		SocketId: ""
	},
	{
		name: "Player 3",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 2,
		SocketId: ""
	},
	{
		name: "Player 4",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 3,
		SocketId: ""
	}
];

game.sitPlayer = function (socket) {
	var socketId = socket.id;
	var freeChair = game.players.find( player => player.chairTaken === false );
	// IS THERE A CHAIR THAT ISN'T ALREADY TAKEN BY A PLAYER?
	if (freeChair != undefined) {
		// ASSIGN SOCKETID TO SocketId
		freeChair.SocketId = socketId;
		freeChair.chairTaken = true;
		console.log("Player with ID '" + socketId + "' has been seated as " + freeChair.name);
	} else {
		socket.emit("alert user", "Sorry, the game is full! (all chairs are taken)");
	}
};
