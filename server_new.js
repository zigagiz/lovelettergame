// Dependencies
var express  = require("express"),
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// SETUP GAME MODEL ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////// GLOBAL SCOPE
var game = {
	players: [],
	currentPlayer: {},
	currentPlayerIndex: null,
	firstPlayer: null,
	firstPlayerIndex: null,
	smallerCardIndex: null,
	hiddenCard: null,
	roundStart: true
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE CARDS •••••••••••••••••••••••••••••••••••••••••••••••••••••••

////// DESIGN CARDS
game.cardFactory = {
	createGuard: function () {
		return {
			name: "Guard",
			number: 1,
			description: "Guess a player's card. If you are correct, the player is eliminated. (Can't guess 'guard')",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")} //game.play.guard
		}
	},
	createPriest: function () {
		return {
			name: "Priest",
			number: 2,
			description: "Secretly look at another player's card.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")} //game.play.priest
		}
	},
	createBaron: function () {
		return {
			name: "Baron",
			number: 3,
			description: "Guess a player's card. If you are correct, the player loses. (Can't guess 'guard')",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createHandmaid: function () {
		return {
			name: "Handmaid",
			number: 4,
			description: "You cannot be the target of any card's abilities.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createPrince: function () {
		return {
			name: "Prince",
			number: 5,
			description: "Choose a player - he discards his card, then draws another. If he discarded the princess, he loses.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createKing: function () {
		return {
			name: "King",
			number: 6,
			description: "Trade the card in your hand with the card held by another player of your choice.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createCountess: function () {
		return {
			name: "Countess",
			number: 7,
			description: "If you ever have the Countess and either the King or Prince in your hand, you must discard the Countess.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createPrincess: function () {
		return {
			name: "Princess",
			number: 8,
			description: "If you discard the princess for any reason, you lose!",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	}
};

////// PRINT CARDS
game.printCards = function () {
	// CREATE 5 GUARDS
	for (var i = 0; i < 5; i++) {
		game.deck.cards.push(game.cardFactory.createGuard());
	};
	// CREATE 2 OF EACH - PRIEST BARON HANDMAID PRINCE
	for (var i = 0; i < 2; i++) {
		game.deck.cards.push(game.cardFactory.createPriest());
		game.deck.cards.push(game.cardFactory.createBaron());
		game.deck.cards.push(game.cardFactory.createHandmaid());
		game.deck.cards.push(game.cardFactory.createPrince());
	};
	// CREATE 1 OF EACH - KING COUNTESS PRINCESS
	game.deck.cards.push(game.cardFactory.createKing());
	game.deck.cards.push(game.cardFactory.createCountess());
	game.deck.cards.push(game.cardFactory.createPrincess());
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE PLAYERS •••••••••••••••••••••••••••••••••••••••••••••••••••••

////// PLAYER CLASS
game.Player = function (name, playerId) {
	return {
		name: name,
		score: 0,
		firstPlayer: false,
		onTurn: false,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: playerId,
		socketId: ""
	};
};

////// CREATE PLAYERS ARRAY (Immediately invoked function expression)
(function () {
	for (var i = 0; i < 4; i++) {
	  	var name 	 = "Player " + (i + 1),
	  		playerId = i; 
	  	game.players.push(game.Player(name, i));
	}

  	// CREATE A LINKED LIST FROM GAME.PLAYERS (SET CIRCULAR PLAYER ORDER)
	for (i = 0; i < game.players.length; i++) {
		game.players[i].next = game.players[(i+1)%game.players.length];
	};
})();

////// SET RANDOM FIRST PLAYER (AT GAME START ONLY)
game.randomFirstPlayer = function() {
	// PICK FIRST PLAYER AT RANDOM 
	game.firstPlayerIndex = Math.floor(Math.random() * Math.floor(4));
	game.currentPlayerIndex = game.firstPlayerIndex;
	console.log("First player is: " + (game.players[game.firstPlayerIndex].name));
	// SET FIRST PLAYER AS CURRENT PLAYER
	game.currentPlayer = game.players[game.firstPlayerIndex];
	io.sockets.emit("render current player", game.currentPlayer.)
};






