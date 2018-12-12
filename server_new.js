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
//////////////////////////////////////////////// SETUP COMMUNICATIONS //////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

io.on("connection", function(socket) {


////// PLAYER JOINS
	socket.on("new player", function(playerName) {
		game.sitPlayer(socket);
	  	game.setPlayerName(playerName, socket);
	  	io.sockets.emit("message", "Player " + playerName + " with id '" + socket.id + "'' connected.");
	});


////// HANDLE PLAYER'S CLICK ON DECK
	socket.on("deck click", function() {

		console.log(game.currentPlayer.hand);

		// IF IT IS THE PLAYER'S TURN
		if (socket.id == game.currentPlayer.socketId) {
			var handSize = game.currentPlayer.hand.length,
				deckSize = game.deck.cards.length;
			// IF IT IS THE START OF THE ROUND
			if (game.roundStart && deckSize == 16) {

				// TAKE A CARD FROM THE DECK AND HIDE IT
				game.deck.pickHiddenCard();
				// RENDER THE HIDDEN CARD
				io.sockets.emit("render hidden card");
				// DEAL 1 CARD TO EACH PLAYER
				game.deck.dealCards();
				// DRAW 2nd CARD
				game.deck.drawCard(socket);
				// RENDER HANDS OF ALL PLAYERS
				game.renderHand(socket);
				// SEND DECK SIZE TO ALL CLIENTS
				io.sockets.emit("render deck", deckSize);

				game.roundStart = false;

			} else {
				// IF PLAYER HAS LESS THAN 2 CARDS IN HAND
				if (handSize == 1 || handSize == 0) {
					game.deck.drawCard(socket);
				};

				if (handSize == 2) {
					// IF PLAYER HAS 2 CARDS IN HAND
					socket.emit("alert", "Play a card!");
				};
					// THROW ERROR IF HANDSIZE IS WEIRD
				if (handSize > 2 || handSize < 0 || handSize == undefined) {
					socket.emit("alert", "ERROR: game.currentPlayer.hand.length = " + game.currentPlayer.hand.length);
				};
				
			};
		} else {
			// IF IT'S NOT THE PLAYER'S TURN
			socket.emit("alert", "It's not your turn, peasant!");
		};
	});


////// HANDLE PLAYER'S CLICK ON A CARD IN HIS HAND
	socket.on("card click", function(cardName) {

	var activePlayer = game.players.find(player => player.socketId == socket.id),
		cardPlayed   = activePlayer.hand.find(hand => hand.name.toLowerCase() == cardName),
		cardIndex    = activePlayer.hand.findIndex(hand => hand.name.toLowerCase() == cardName);
 
		activePlayer.hand.splice(cardIndex, 1); 

		// activePlayer.hand.splice($.inArray(cardPlayed, activePlayer.hand), 1);

	game.renderHand(socket);

	// CHECK IF PLAYER IMMUNE :todo
	// CHECK IF PLAYER ELIMINATED :todo

		// CHECK IF WIN CONDITION MET :todo

			// IF YES, END ROUND, UPDATE SCORE :todo
			// io.sockets.emit("score", scoreObject);

			// IF YES, CHECK SCORES (END GAME IF player.score == 4) :todo
				
			// IF NOT, NEXT PLAYER'S TURN :todo
			game.setNextPlayer();
	});


////// PLAYER LEAVES
	socket.on("disconnect", function(reason) {
		var leavingPlayer = game.players.find(player => player.socketId == socket.id);
		if (leavingPlayer != undefined) {
			leavingPlayer.chairTaken = false;
			leavingPlayer.socketId = "";
			leavingPlayer.name = "";
			game.setPlayerName("", socket);

			socket.broadcast.emit("message", "Player " + leavingPlayer.name + " (" + socket.id + ") has disconnected.");
			console.log("Player " + leavingPlayer.name + "(" + socket.id + ") disconnected.");
	  	} else {
	  		console.log("A spectator left the game.");
	  	};
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// SETUP GAME MODEL ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////// GLOBAL SCOPE - MISC VARIABLES
var game = {
	players: [],
	currentPlayer: {},
	currentPlayerIndex: null,
	firstPlayer: null,
	firstPlayerIndex: null,
	smallerCardIndex: null,
	hiddenCard: null,
	roundStart: true,
	deck: {cards: []},
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE CARDS ••••••••••••••••••••••••••••••••••••••••••••••••••••

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

////// PRINT {CARDS} (Immediately invoked function expression)
(function () {
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
})();

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE PLAYERS ••••••••••••••••••••••••••••••••••••••••••••••••••••

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

////// CREATE [PLAYERS] (Immediately invoked function expression)
(function () {
	for (var i = 0; i < 4; i++) {
	  	var name 	 = "", //"Player " + (i + 1),
	  		playerId = i; 
	  	game.players.push(game.Player(name, i));
	};

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
	console.log("First player is: " + (game.players[game.firstPlayerIndex].playerId));
	// SET FIRST PLAYER AS CURRENT PLAYER
	game.currentPlayer = game.players[game.firstPlayerIndex];
	// TRIGGER RENDERING OF CURRENT PLAYER INDICATOR
	io.sockets.emit("render current player indicator", game.currentPlayer.playerId);
};

game.randomFirstPlayer(); // DELETE THIS :todo

////// SET NAME OF A PLAYER
game.setPlayerName = function(playerName, socket) {
	// FIND CLIENT'S SPOT IN ARRAY OF PLAYERS & CHANGE HIS NAME
	var player = game.players.find(player => player.socketId == socket.id);
	// IF CLIENT IS SEATED & HIS NAME ISN'T EMPTY
	if (player != undefined && playerName.length > 0) {
		player.name = playerName;
	};
	// IF PLAYER'S NAME IS "EMPTY"
	if (player != undefined && playerName.length == 0) {
		player.name = "Player " + (player.playerId + 1);
	};
	// SEND ARRAY OF ALL PLAYER NAMES TO ALL CLIENTS
	var playerNames = game.players.map(function(players) {return players.name;});
	io.sockets.emit("player names", playerNames);
	console.log(playerNames);
};
	
////// ASSIGN CHAIR TO PLAYER (GAME.PLAYERS[INDEX])
game.sitPlayer = function (socket) {
	var socketId = socket.id;
	// FIND A FREE CHAIR
	var freeChair = game.players.find(player => player.chairTaken === false);
	// IS THERE A CHAIR THAT ISN'T ALREADY TAKEN BY A PLAYER?
	if (freeChair != undefined) {
		// ASSIGN SOCKETID TO players[i].socketId
		freeChair.socketId = socketId;
		// MARK CHAIR AS TAKEN
		freeChair.chairTaken = true;
	} else { 
		// IF NO CHAIR IS FREE
		socket.emit("alert", "Sorry, the game is full! (all chairs are taken)");
	}
};

// SET NEXT PLAYER
game.setNextPlayer = function () {
	game.currentPlayer = game.currentPlayer.next;
	game.currentPlayerIndex = game.currentPlayer.playerId;
	io.sockets.emit("set next player", game.currentPlayerIndex);
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE ACTIONS ••••••••••••••••••••••••••••••••••••••••••••••••••••

////// PICK A RANDOM CARD FROM THE DECK
game.deck.randomCard = function(){
		return Math.round(Math.random() * Math.floor(this.cards.length - 1));
};

////// HIDE A CARD FROM THE DECK
game.deck.pickHiddenCard = function(){
		// CHOOSE RANDOM CARD FROM DECK ARRAY
		var pickedCardIndex = game.deck.randomCard();
		// COPY IT TO HIDDEN SPOT (edge case in game rules)
		game.hiddenCard = this.cards[pickedCardIndex];
		console.log(this.cards[pickedCardIndex].name + " will be hidden!");
		// REMOVE IT FROM DECK ARRAY
		this.cards.splice(pickedCardIndex,1);
};

game.dealer = function(playerIndex) {
	// IF DECK ISN'T EMPTY
	if (game.deck.cards.length > 0) {
		// CHOOSE RANDOM CARD FROM DECK ARRAY 
		var	randomCardIndex = game.deck.randomCard();
		// COPY IT TO TARGET PLAYER'S HAND
		game.players[playerIndex].hand.push(game.deck.cards[randomCardIndex]);
		var cardDrawn = game.deck.cards[randomCardIndex];
		// REMOVE IT FROM DECK ARRAY
		game.deck.cards.splice(randomCardIndex,1);
	} else {
		console.error("DECK IS EMPTY! CAN'T GAME.DEALER!");
	};
	return cardDrawn;
};

////// DEAL A CARD TO EACH PLAYER (start of round)
game.deck.dealCards = function(){
		// DEAL A CARD TO EVERY PLAYER
		for (i=0;i < game.players.length; i++) {
			// DEAL CARD
			game.dealer(i);
		};
		// SEND RENDER TRIGGER TO ALL OTHER CLIENTS
		// game.updateEnemyHands();
		// game.updateUI();
};

////// PLAYER DRAWS ONE CARD
game.deck.drawCard = function(socket){

		// WHICH PLAYER IS DRAWING THE CARD?
		var activePlayer = game.players.find(player => player.socketId == socket.id);

		//  DRAW THE CARD AND SAVE IT
		var cardDrawn = game.dealer(activePlayer.playerId);

		// SEND THE DRAWN CARD OBJECT AND PLAYERID TO THE ACTIVE CLIENT
		socket.emit("update player hand", {card: cardDrawn, playerId: activePlayer.playerId, discard: false});

		// SEND RENDER TRIGGER TO ALL OTHER CLIENTS
		socket.broadcast.emit("update enemy hands", activePlayer.playerId);

		// SEND NEW "CARDS LEFT IN DECK" TOOLTIP TO ALL CLIENTS
		var tooltip = "Cards left in deck: " + game.deck.cards.length;
		io.sockets.emit("deck tooltip", tooltip);
};

game.playCard = function () {
	var playerIndex = game.currentPlayerIndex,
		cardIndex = clickedCardIndex,
	// CARD = CLICKED CARD OBJECT
		card = game.players[playerIndex].hand[CardIndex],
	// AICARD = SMALLER CARD IN HAND
		aiCard = game.pickSmallerCard();
	// IF PLAYER IS AI
	if (playerIndex != 0) {
		game.currentPlayer.cardsPlayed.push(aiCard);
		// DELETE AICARD FROM AI HAND
		game.currentPlayer.hand.splice(game.smallerCardIndex,1);
		// APPLY CARD EFFECT & MOVE TO TABLE (CARDS PLAYED)
		console.log(game.currentPlayer.name + "(AI) played - " + card.name);
		socket.broadcast.emit("ai played card", aiCard);
	} else {
		game.currentPlayer.cardsPlayed.push(card);
		// EXECUTE CARD ACTION
		game.play[card.name.toLowerCase()]();
	};
};


game.startNewGame = function () {
	game.randomFirstPlayer();
};



//•••••••••••••••••••••••••••••••••••••••••••••••••••• RENDER CALLS ••••••••••••••••••••••••••••••••••••••••••••••••••••

game.renderHand = function(socket) {
	// SEND PLAYER'S CARD AND ENEMY INDEXES TO EACH CLIENT FOR RENDERING
	var playerHandsArray = game.players.map(function(players) {return players.hand;});

	for (var i=0; i < game.players.length; i++) {
		var enemyIndexes = [0,1,2,3];

		// IF START OF ROUND, PLAYER THAT CLICKED HAS TWO CARDS IN HAND (add his index to the array) 
		if (game.roundStart) {
			enemyIndexes.push(game.firstPlayerIndex);
		};

		// FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
		enemyIndexes = enemyIndexes.filter(function(value) {
			return value != i;
		});

		// SEND NEW HAND ARRAY AND THEIR INDEX TO EACH PLAYER 
		io.to(game.players[i].socketId).emit("render player hand", {playerHand: playerHandsArray[i], playerIndex: i});
		// SEND ENEMY INDEXES[!i] TO THE PLAYER[i]
		io.to(game.players[i].socketId).emit("render enemy hands", enemyIndexes);
	};
};

game.renderHand.dealCards = function(socket) {
	// SEND PLAYER'S CARD AND ENEMY INDEXES TO EACH CLIENT FOR RENDERING
	var playerHandsArray = game.players.map(function(players) {return players.hand;});

	for (var i=0; i < game.players.length; i++) {
		var enemyIndexes = [0,1,2,3];

		// IF START OF ROUND, PLAYER THAT CLICKED HAS TWO CARDS IN HAND (add his index to the array) 
		if (game.roundStart) {
		};
			enemyIndexes.push(game.firstPlayerIndex);


		// FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
		enemyIndexes = enemyIndexes.filter(function(value) {
			return value != i;
		});

		// SEND NEW HAND ARRAY AND THEIR INDEX TO EACH PLAYER 
		io.to(game.players[i].socketId).emit("render player hand", {playerHand: playerHandsArray[i], playerIndex: i});
		// SEND ENEMY INDEXES[!i] TO THE PLAYER[i]
		io.to(game.players[i].socketId).emit("render enemy hands", enemyIndexes);
	};
};

game.renderHand.drawCard
game.renderHand.playCard
