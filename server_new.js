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
				game.render.dealCards(socket);
				// RENDER DECK
				game.render.deck();

				game.roundStart = false;

				for (var i=0; i < game.players.length; i++) {
					console.log("<<< ROUND START >>>" + game.players[i].name + " has " + game.players[i].hand.length + " cards in hand: ");
					for (var j=0; j < game.players[i].hand.length; j++) {
						console.log(game.players[i].hand[j].name);
					};
					console.log();
				};

			} else {
				// IF PLAYER HAS LESS THAN 2 CARDS IN HAND
				if (handSize == 1 || handSize == 0) {
					game.deck.drawCard(socket);
					game.render.drawCard(socket);
					game.render.deck();
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
		////// HANDLE PLAYER'S CLICK ON A CARD
		var	activePlayer 		 = game.players.find(player => player.socketId == socket.id),
			targetablePlayers	 = game.players.filter(player => !player.eliminated && !player.immune && player.playerId != activePlayer.playerId),
			targetablePlayerIds  = targetablePlayers.map(player => player.playerId),
			cardPlayed 		     = activePlayer.hand.find(hand => hand.name.toLowerCase() == cardName);

		// CHECK WHICH CARD WAS CLICKED

		switch (cardName) {
			case "guard": 
				cardPlayed.action(socket, targetablePlayerIds);
				break;

			default: 
				game.discardCard(socket, cardName);
		};

			// EXECUTE CARD ACTION :todo
			
			// RENDER CARD EFFECT :todo
	});
//////////// CARD ACTIONS ////////////

////// GUARD CARD
	socket.on("guard action", function(object) {
	 	var targetPlayerId = object.targetPlayerId,
	 		targetCard = object.targetCard;

	 	game.cardAction.guard(targetPlayerId, targetCard);
	 	game.discardCard(socket, "guard");

	});

////// HANDLE PLAYER'S READY BUTTON CLICK
	socket.on("player ready", function() {
		game.playersReady(socket);
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
	hiddenCard: null,
	roundStart: true,
	roundEnded: false,
	deck: {
		cards: []
	}
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE CARDS ••••••••••••••••••••••••••••••••••••••••••••••••••••

////// DESIGN CARDS
game.cardFactory = {
	createGuard: function () {
		return {
			name: "Guard",
			number: 1,
			description: "Guess a player's card. If you are correct, the player is eliminated. (Can't guess 'guard')",
			action: function (socket, targetablePlayerIds) {
				console.log("EMITING render guard modal TO CLIENT “THAT CLICKED")
				socket.emit("render guard modal", targetablePlayerIds);
				console.log(game.currentPlayer.name + " played " + this.name + "(" + this.number + ") card.");
			} 
		}
	},
	createPriest: function () {
		return {
			name: "Priest",
			number: 2,
			description: "Secretly look at another player's card.",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")} 
		}
	},
	createBaron: function () {
		return {
			name: "Baron",
			number: 3,
			description: "Guess a player's card. If you are correct, the player loses. (Can't guess 'guard')",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createHandmaid: function () {
		return {
			name: "Handmaid",
			number: 4,
			description: "You cannot be the target of any card's abilities.",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createPrince: function () {
		return {
			name: "Prince",
			number: 5,
			description: "Choose a player - he discards his card, then draws another. If he discarded the princess, he loses.",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createKing: function () {
		return {
			name: "King",
			number: 6,
			description: "Trade the card in your hand with the card held by another player of your choice.",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createCountess: function () {
		return {
			name: "Countess",
			number: 7,
			description: "If you ever have the Countess and either the King or Prince in your hand, you must discard the Countess.",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createPrincess: function () {
		return {
			name: "Princess",
			number: 8,
			description: "If you discard the princess for any reason, you lose!",
			action: function (socket) {socket.emit("alert", "You played " + this.name + "(" + this.number + ") card.")}
		}
	}
};

////// PRINT CARDS
game.printCards = function () {
	// CREATE 5 GUARDS
	for (var i = 0; i < 5; i++) {
		game.deck.cards.push(game.cardFactory.createGuard());
	};
	// CREATE 2 OF EACH - PRIEST, BARON, HANDMAID, PRINCE
	for (var i = 0; i < 2; i++) {
		game.deck.cards.push(game.cardFactory.createPriest());
		game.deck.cards.push(game.cardFactory.createBaron());
		game.deck.cards.push(game.cardFactory.createHandmaid());
		game.deck.cards.push(game.cardFactory.createPrince());
	};
	// CREATE 1 OF EACH - KING, COUNTESS, PRINCESS
	game.deck.cards.push(game.cardFactory.createKing());
	game.deck.cards.push(game.cardFactory.createCountess());
	game.deck.cards.push(game.cardFactory.createPrincess());

	console.log(game.deck.cards);
};

game.cardAction = {};

game.cardAction.guard = function (targetPlayerId, targetCard) {
	var targetPlayer = game.players.filter(player => player.playerId == targetPlayerId)[0];
	
	if (targetPlayer.hand[0].name.toLowerCase() == targetCard) {
		io.sockets.emit("alert", targetPlayer.name + " has been eliminated from the round!");

		targetPlayer.eliminated = true;
		// PLACE HIS CARD INTO HIS CARDS PLAYED AREA
		game.discardCard(socket, targetPlayer.hand[0].name.toLowerCase());
		// REMOVE HIM FROM CIRCLE UNTIL END OF ROUND
		// CHECK WIN CONDITIONS AND CARD REVEALING AT END OF ROUND, SHIT AYNT WORKIN
	}
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE PLAYERS ••••••••••••••••••••••••••••••••••••••••••••••••••••

////// PLAYER CLASS
game.Player = function (name, playerId) {
	return {
		name: name,
		score: 0,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		ready: false,
		playerId: playerId,
		socketId: ""
	};
};

////// CREATE [PLAYERS]
game.createPlayers = function () {
	for (var i = 0; i < 4; i++) {
	  	var name 	 = "", //"Player " + (i + 1),
	  		playerId = i; 
	  	game.players.push(game.Player(name, i));
	};

  	// CREATE A LINKED LIST FROM GAME.PLAYERS (SET CIRCULAR PLAYER ORDER)
	for (i = 0; i < game.players.length; i++) {
		game.players[i].next = game.players[(i+1)%game.players.length];
	};
};

////// SET RANDOM FIRST PLAYER (AT GAME START ONLY)
game.randomFirstPlayer = function () {
	// PICK FIRST PLAYER AT RANDOM 
	game.currentPlayerIndex = Math.floor(Math.random() * Math.floor(4));
	game.currentPlayer = game.players[game.currentPlayerIndex];
	console.log("First player is:  Player " + (game.players[game.currentPlayerIndex].playerId + 1));
	
	// TRIGGER RENDERING OF CURRENT PLAYER INDICATOR
	game.render.playerIndicator(game.currentPlayerIndex);
};

////// SET NAME OF A PLAYER
game.setPlayerName = function(playerName, socket) {
	// FIND CLIENT'S SPOT IN ARRAY OF PLAYERS
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

////// SET NEXT PLAYER
game.setNextPlayer = function () {
	game.currentPlayer = game.currentPlayer.next;
	game.currentPlayerIndex = game.currentPlayer.playerId;
	game.render.playerIndicator(game.currentPlayerIndex);
};

////// RESET PLAYER OBJECTS FOR NEW ROUND
game.resetPlayers = function () {
	if (game.players.filter(player => player.score == 4).length == 1) {
		for (var i=0; i < game.players.length; i++) {
			game.players[i].score = 0;
		};
	};

	for (var i=0; i < game.players.length; i++) {
		game.players[i].hand = [];
		game.players[i].cardsPlayed = [];
		game.players[i].ready = false;
	};

	game.currentPlayer = game.players[game.currentPlayerIndex];

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

////// CARD DEALING
game.dealer = function(playerIndex) {
	// IF DECK ISN'T EMPTY
	if (game.deck.cards.length > 0) {
		// CHOOSE RANDOM CARD FROM DECK ARRAY 
		var	randomCardIndex = game.deck.randomCard(),
			cardDrawn = game.deck.cards[randomCardIndex];
		// COPY IT TO TARGET PLAYER'S HAND
		game.players[playerIndex].hand.push(cardDrawn);
		// REMOVE IT FROM DECK ARRAY
		game.deck.cards.splice(randomCardIndex,1);
	} else {
		console.error("DECK IS EMPTY! CAN'T GAME.DEALER!");
	};

	// console.log(game.players.map((player) => player.hand));

	// RETURN CARD DRAWN
	return cardDrawn;
};

////// DEAL A CARD TO EACH PLAYER (start of round)
game.deck.dealCards = function(){
	console.log("> DEALING CARDS");
		// DEAL A CARD TO EVERY PLAYER
		for (i=0; i < game.players.length; i++) {
			// DEAL CARD
			game.dealer(i);
		};
};

////// PLAYER DRAWS ONE CARD
game.deck.drawCard = function(socket) {

	// WHICH PLAYER IS DRAWING THE CARD?
	var activePlayer = game.players.find(player => player.socketId == socket.id);

		if (game.roundStart) {
		console.log("•••••••• NEW ROUND, EXTRA CARD GOES TO " + activePlayer.name);
	};

	//  DRAW THE CARD
	game.dealer(activePlayer.playerId);
};


///// MOVE THE CARD AND CHECK WIN CONDITIONS
game.discardCard = function (socket, cardName) {

	var activePlayer 		 = game.players.find(player => player.socketId == socket.id),
		cardPlayed 		     = activePlayer.hand.find(hand => hand.name.toLowerCase() == cardName),
		cardIndex   		 = activePlayer.hand.findIndex(hand => hand.name.toLowerCase() == cardName),
		playerIndex 		 = game.currentPlayerIndex,
		card 		 		 = game.players[playerIndex].hand[cardIndex],
		playersNotEliminated = game.players.filter(player => !player.eliminated),
		targetablePlayers	 = playersNotEliminated.filter(player => !player.immune),
		winningPlayer 		 = null;

		console.log(">•<");
		console.log(socket.id + " HAS " + activePlayer.hand.length + " CARDS IN HAND, DISCARDING ONE CARD!");
		console.log(">•<");

	if (activePlayer.hand.length == 2) {
		// ADD CARD TO player.cardsPlayed
		game.currentPlayer.cardsPlayed.push(card);
		// DELETE CARD FROM player.hand
		game.currentPlayer.hand.splice(cardIndex, 1);
		// RENDER CARD
		game.render.playCard(card.name.toLowerCase(), activePlayer.playerId);
		game.setNextPlayer();

		// CHECK IF ROUND IS OVER -->
		// CHECK IF DECK IS EMPTY & MORE THAN 1 PLAYER IS LEFT IN THE ROUND
		if (game.deck.cards.length == 0 && playersNotEliminated.length > 1) {
			// COMPARE CARDS OF ALL PLAYERS
			var playerHandsArray = game.players.map(function(players) { return players.hand[0] }),
				highestCard = playerHandsArray[0],
				tiedPlayers = [],
				winningPlayerIndex = 0;

			// FIND THE HIGHEST CARD & OWNER'S INDEX
			for (var i=1; i < playerHandsArray.length; i++) {
				if (highestCard.number < playerHandsArray[i].number) {
					highestCard = playerHandsArray[i];
					winningPlayerIndex = i;
				};
			};

			// PLACE ALL PLAYER INDEXES WITH THE HIGHEST CARD IN HAND INTO tiedPlayers ARRAY
			var index = playerHandsArray.map(function(card) { return card.number }).indexOf(highestCard.number);

			// MAKE SURE SOMEONE HAS THE HIGH CARD IN HAND
			while (index != -1) {
			  tiedPlayers.push(index);
			  index = playerHandsArray.map(function(card) { return card.number; }).indexOf(highestCard.number, index + 1);
			};

			// IF MORE THAN ONE PLAYER HAS THE HIGHEST CARD
			if (tiedPlayers.length > 1) {
				var firstWinner = game.players[tiedPlayers[0]],
					secondWinner = game.players[tiedPlayers[1]],
					firstWinnerValue  = 0,
					secondWinnerValue = 0;

				// ADD UP ALL NUMBERS OF CARDS PLAYED FOR FIRST WINNER
				firstWinner.cardsPlayed.forEach(function(card) {
					firstWinnerValue = firstWinnerValue + card.number;
				});
				// ADD UP ALL NUMBERS OF CARDS PLAYED FOR SECOND WINNER
				secondWinner.cardsPlayed.forEach(function(card) {
					secondWinnerValue = secondWinnerValue + card.number;
				});

				// IF FIRST PLAYER'S CARDS PLAYED HAVE A HIGHER VALUE, HE IS THE WINNER
				if (firstWinnerValue > secondWinnerValue) {
					winningPlayer = firstWinner;
				};
				// IF SECOND PLAYER'S CARDS PLAYED HAVE A HIGHER VALUE, HE IS THE WINNER
				if (secondWinnerValue > firstWinnerValue) {
					winningPlayer = secondWinner;
				};
				// IF BOTH PLAYERS' CARDS PLAYED HAVE EQUAL VALUE, THEY ARE TIED
				if (firstWinnerValue == secondWinnerValue) {
					winningPlayer = undefined;
				};
				// IF THERE IS NO TIE IN CARDS PLAYED VALUE
				if (winningPlayer != undefined) {
					io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card and higher cards played! (" + highestCard.name + "(" + highestCard.number + "))");
					game.currentPlayerIndex = winningPlayer.playerId;
					// SET SCORE
					++winningPlayer.score;
					io.sockets.emit("render score", winningPlayer.playerId);
					game.render.playerIndicator(winningPlayer.playerId);
				// IF THERE IS A TIE IN CARDS PLAYED VALUE
				} else {
					io.sockets.emit("alert", firstWinner.name + " and " + secondWinner.name + " are tied! No points given.");
					// BOTH WINNERS TOSS A COIN FOR FIRST PLAYER
					game.currentPlayerIndex = tiedPlayers[(Math.random() <= 0.5) ? 1 : 2];
					game.render.playerIndicator(game.currentPlayerIndex);
				};

			} else {
			// IF THERE IS ONLY ONE WINNER (HIGHEST CARD)
			var winningPlayer = game.players[winningPlayerIndex];
			game.currentPlayerIndex = winningPlayer.playerId;
			game.render.playerIndicator(game.currentPlayerIndex);
			++winningPlayer.score;
			// RENDER ROUND WINNER
			io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card! (" + highestCard.name + "(" + highestCard.number + "))");
			// SET SCORE
			io.sockets.emit("render score", winningPlayer.playerId);
			};

			game.roundEnded = true;
		};

		// CHECK IF ONLY ONE PLAYER IS LEFT IN THE ROUND
		if (playersNotEliminated.length == 1) {

			var winningPlayerIndex = activePlayer.playerId;
			winningPlayer = game.players[winningPlayerIndex];
			game.currentPlayerIndex = winningPlayer.playerId;
			game.render.playerIndicator(game.currentPlayerIndex);
			++winningPlayer.score;

			// RENDER ROUND WINNER
			io.sockets.emit("alert", playersNotEliminated[0].name + " wins the round! Last player standing!");

			// SET SCORE
			io.sockets.emit("render score", winningPlayer.playerId);

			game.roundEnded = true;
		};

		// CHECK IF ROUND IS OVER
		if (game.roundEnded) {
			// REVEAL ALL CARDS
			playerHandsArray = playerHandsArray.map(function(card) { return card.name; });
			var showAllCardsArray = [];
			
			// SETUP ARRAY OF PLAYERS & THEIR CARDS FOR RENDERING
			
			// IF ALL CARDS HAVE BEEN PLAYED / DECK IS EMPTY
			for (var i=0; i < playerHandsArray.length; i++) {
				showAllCardsArray[i] = [playerHandsArray[i], playersNotEliminated[i].playerId];
			};

			// ADD HIDDEN CARD
			showAllCardsArray.push(game.hiddenCard.name.toLowerCase());

			// RENDER (REVEAL) ALL CARDS AT END OF ROUND
			game.render.showAllCards(showAllCardsArray);
			
			var gameWinner = game.players.filter(player => player.score == 4);
			// CHECK SCORES :todo
			if (gameWinner.length == 1) {
				// DECLARE WINNER & END GAME
				io.sockets.emit("alert", gameWinner[0].name + " wins the game!");
				// OFFER NEW GAME
				io.sockets.emit("confirm new game");
			// IF NO WINNER
			} else {
				// OFFER NEW ROUND
				io.sockets.emit("confirm next round");
			};
				
			
			
		};

	// IF PLAYER DOESN'T HAVE 2 CARDS IN HAND
	} else {
		socket.emit("alert", "You must draw a card before playing one.");
	};
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• RENDER CALLS ••••••••••••••••••••••••••••••••••••••••••••••••••••

game.render = {};

game.render.playerIndicator = function (playerIndex) {
	io.sockets.emit("render current player indicator", playerIndex);
};

////// SEND PLAYERS' CARDS AND ENEMY INDEXES TO EACH CLIENT FOR RENDERING
game.render.dealCards = function(socket) {
	var playerHandsArray = game.players.map(function(players) {return players.hand;});

	for (var i=0; i < game.players.length; i++) {
		var enemyIndexArray = [0,1,2,3];

		// FIRST PLAYER HAS TWO CARDS IN HAND (add a copy of his index to the array) 
		enemyIndexArray.push(game.currentPlayerIndex);

		// FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
		enemyIndexArray = enemyIndexArray.filter(function(value) {
			return value != i;
		});

		// SEND NEW HAND ARRAY AND THEIR INDEX TO EACH PLAYER 
		io.to(game.players[i].socketId).emit("render player hand", {playerHand: playerHandsArray[i], playerIndex: i});
		// SEND ENEMY INDEXES[!i] TO THE PLAYER[i]
		io.to(game.players[i].socketId).emit("render enemy hands", enemyIndexArray);
	};
};

// SEND DRAWN CARD TO PLAYER AND HIS INDEX TO EACH OTHER CLIENT FOR RENDERING
game.render.drawCard = function(socket) {

	var playerHandsArray = game.players.map(function(players) {return players.hand;}),
		enemyIndexArray  = [0,1,2,3];
	
	// SEND NEW HAND ARRAY AND HIS INDEX TO CURRENT PLAYER 
	socket.emit("render player hand", {playerHand: playerHandsArray[game.currentPlayerIndex], playerIndex: game.currentPlayerIndex});

	// FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
	enemyIndexArray = enemyIndexArray.filter(function(value) {
		return value != game.currentPlayerIndex;
	});

	for (var i=0; i < enemyIndexArray.length; i++) {
		// SEND ENEMY INDEX TO ALL OTHER CLIENTS
		io.to(game.players[enemyIndexArray[i]].socketId).emit("render enemy hands", game.currentPlayerIndex);
	};
};

game.render.playCard = function (cardName, playerIndex) {
	io.sockets.emit("card played", {cardName: cardName, playerIndex: playerIndex});
};

game.render.deck = function () {
	var deckSize = game.deck.cards.length,
		tooltip = "Cards left in deck: " + game.deck.cards.length;
	// SEND DECK SIZE & "CARDS LEFT" TO ALL CLIENTS
	io.sockets.emit("render deck", {deckSize: deckSize, tooltip: tooltip});
};

game.render.showAllCards = function (showAllCardsArray) {
	io.sockets.emit("render all cards", showAllCardsArray);
};


// ••••••••••••••••••••••••••••••••••••••••••••••••••••• GAME STATE •••••••••••••••••••••••••••••••••••••••••••••••••••••

game.init = function () {
	game.printCards();
	game.createPlayers();
	// Wait for all players to connect (game must be full) :todo
	game.randomFirstPlayer();
};

game.startNewRound = function () {
	game.deck.cards = [];
	game.hiddenCard = null;
	game.printCards();
	game.resetPlayers();
	game.render.deck();
	game.roundStart = true;
	game.roundEnded = false;
};

game.startNewGame = function () {
	game.deck.cards = [];
	game.hiddenCard = null;
	game.printCards();
	game.resetPlayers();
	game.render.deck();
	game.roundStart = true;
	game.roundEnded = false;
};

game.playersReady = function (socket) {
	var player = game.players.find(player => player.socketId == socket.id);

	player.ready = true;

	var playersNotReady = game.players.filter(player => player.ready == false);

	if (playersNotReady.length == 0) {
		if (game.players.filter(player => player.score == 4).length == 1) {
			game.startNewGame();
			io.sockets.emit("new game");
	
		} else {
			game.startNewRound();
			io.sockets.emit("new round");
		};

		game.roundStart = true;
	};
};

game.init();



