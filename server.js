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

////////////////////////////////////////////////////SOCKETS START///////////////////////////////////////////////////////

////// ------> WEBSOCKET HANDLERS START ------> 
io.on("connection", function(socket) {

socket.broadcast.to(socket.id).emit("message", "Welcome! I'm broadcasting this to only you, " + socket.id);

////// PLAYER JOINS
	socket.on("new player", function() {
		io.sockets.emit("message", "Player with id " + socket.id + " connected.");
	  	game.sitPlayer(socket);
	});

////// GET PLAYER NAME
	socket.on("player name", function(playerName) {
		// FIND CLIENT'S SPOT IN ARRAY OF PLAYERS & CHANGE HIS NAME
		var player = game.players.find(player => player.socketId == socket.id);
		// MAKE SURE CLIENT IS A PLAYER, NOT A SPECTATOR && HIS NAME ISN'T EMPTY
		if (player != undefined && playerName.length > 0) {
			player.name = playerName;
		};
		// IF PLAYER'S NAME
		if (player != undefined && playerName.length == 0) {
			var playerNameDefault = game.players.find(player => player.socketId == socket.id);
			player.name = playerNameDefault.name;
		};
		// SEND ARRAY OF ALL PLAYER NAMES TO ALL CLIENTS
		var playerNames = game.players.map(function(players) {return players.name;});
		io.sockets.emit("player names", playerNames);
	});	

////// SEND FIRST PLAYER INDEX
	socket.on("first player", function() {
		socket.emit("first player", game.firstPlayerIndex);
	});

////// HANDLE PLAYER'S CLICK ON DECK
	socket.on("deck click", function() {
		// IF IT IS THE PLAYER'S TURN
		if (socket.id == game.currentPlayer.socketId) {
			var handSize = game.currentPlayer.hand.length;
			// IF IT IS THE START OF THE ROUND
			if (roundStart) {
				// DEAL 1 CARD TO EACH PLAYER & HIDE 1 CARD UNDER DECK
				game.startRound();
				// DRAW 2nd CARD
				game.deck.drawCard(socket);
				roundStart = false;

			} else {
				// IF PLAYER HAS LESS THAN 2 CARDS IN HAND
				if (handSize == 1 || handSize == 0) {
					game.deck.drawCard(socket);
				};

				if (handSize == 2) {
					// IF PLAYER HAS 2 CARDS IN HAND
					socket.emit("alert", "Play a card!");
				};

				if (handSize > 2 || handSize < 0 || handSize == undefined) {
					socket.emit("alert", "ERROR: game.currentPlayer.hand.length = " + game.currentPlayer.hand.length);
				};
				
			};
		} else {
			// IF IT'S NOT THE PLAYER'S TURN
			socket.emit("alert", "It's not your turn, peasant!");
		};
	});

////// PLAYER PLAYS CARD - WHEN ACTIVE PLAYER CLICKS CARD :todo
	socket.on("card click", function(cardName) {
	// game.play[cardName]();

	var activePlayer = game.players.find(player => player.socketId == socket.id),
		cardPlayed   = activePlayer.hand.find(hand => hand.name.toLowerCase() == cardName),
		cardIndex    = activePlayer.hand.findIndex(hand => hand.name.toLowerCase() == cardName);

	if (cardIndex >= 0) { 
		activePlayer.hand.splice(cardIndex, 1); 
	};

		// activePlayer.hand.splice($.inArray(cardPlayed, activePlayer.hand), 1);

	socket.emit("update player hand", {card: cardPlayed, playerId: activePlayer.playerId, discard: true});

	// CHECK IF PLAYER IMMUNE :todo
	// CHECK IF PLAYER ELIMINATED :todo

		// CHECK IF WIN CONDITION MET :todo

			// IF YES, END ROUND, UPDATE SCORE :todo
			// io.sockets.emit("score", scoreObject);

			// IF YES, CHECK SCORES (END GAME IF player.score == 4) :todo
				
			// IF NOT, NEXT PLAYER'S TURN :todo
			game.setNextPlayer();
	});


////// 
	game.updateEnemyHands = function () {
		var activePlayer = game.players.find(player => player.socketId == socket.id);
		socket.broadcast.emit("update enemy hands", activePlayer.playerId);
	};


////// PLAYER DISCONNECTS
	socket.on("disconnect", function(reason) {
		socket.broadcast.emit("message", "Player with id " + socket.id + " disconnected.");
		console.log("Player with id " + socket.id + " disconnected. Reason: " + reason);
		var leavingPlayer = game.players.find(player => player.socketId == socket.id);
		console.log(socket.id);
		console.log(leavingPlayer);
		if (leavingPlayer != undefined) {
			leavingPlayer.chairTaken = false;
			leavingPlayer.socketId = "";
			leavingPlayer.name = "Player " + (leavingPlayer.playerId + 1);
	  	};
	});



}); // <------ WEBSOCKET HANDLERS END <------ 

/////////////////////////////////////////////////////SOCKETS END////////////////////////////////////////////////////////



// ===================SERVER LOGIC==============================================================================
// ===================================================SERVER LOGIC==============================================
// ===================================================================================SERVER LOGIC==============

var game = {
	currentPlayer: {},
	currentPlayerIndex: null,
	firstPlayer: null,
	firstPlayerIndex: null,
	smallerCardIndex: null,
	hiddenCard: null,
	roundStart: true
};
	

/////////////// PLAYER DATA ARRAY //////////////////////////////////////////////////////////////////////////////

game.players = [
	{
		name: "Player 1",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 0,
		socketId: ""
	},
	{
		name: "Player 2",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 1,
		socketId: ""
	},
	{
		name: "Player 3",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 2,
		socketId: ""
	},
	{
		name: "Player 4",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		cardsPlayed: [],
		immune: false,
		eliminated: false,
		next: null,
		chairTaken: false,
		playerId: 3,
		socketId: ""
	}
];


// ASSIGN CHAIR TO PLAYER (GAME.PLAYERS[INDEX])
game.sitPlayer = function (socket) {
	var socketId = socket.id;
	// FIND A FREE CHAIR
	var freeChair = game.players.find( player => player.chairTaken === false );
	// IS THERE A CHAIR THAT ISN'T ALREADY TAKEN BY A PLAYER?
	if (freeChair != undefined) {
		// ASSIGN SOCKETID TO players[i].socketId
		freeChair.socketId = socketId;
		// MARK CHAIR AS TAKEN
		freeChair.chairTaken = true;
		// SEND PLAYERID TO SEATED CLIENT
		socket.emit("player id", freeChair.playerId);
		console.log("Player with ID '" + socketId + "' has been seated as " + freeChair.name + " with playerId of " + freeChair.playerId);
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


game.startRound = function () {
	// TAKE A CARD FROM THE DECK AND HIDE IT
	game.deck.pickHiddenCard();
	// DEAL 1 CARD TO EACH PLAYER
	game.deck.dealCards();
	// PACK UP NEW GAME.PLAYERS.HAND DATA INTO AN ARRAY
	var playerHandsArray = game.players.map(function(players) {return players.hand;});
	// SEND PLAYER HAND DATA TO ALL CLIENTS
	io.sockets.emit("send hands", {playerHands: playerHandsArray, deckSize: game.deck.cards.length});	
};


// MAIN DECK / CARD / HAND MANIPULATION
game.deck =  {
	cards: [
	],

	pickHiddenCard: function(){
		// CHOOSE RANDOM CARD FROM DECK ARRAY
		var pickedCardIndex = game.deck.randomCard();
		// COPY IT TO HIDDEN SPOT (edge case in game rules)
		game.hiddenCard = this.cards[pickedCardIndex];
		console.log(this.cards[pickedCardIndex].name + " will be hidden!");
		// REMOVE IT FROM DECK ARRAY
		this.cards.splice(pickedCardIndex,1);
	},

	dealCards: function(){
		// DEAL A CARD TO EVERY PLAYER
		for (i=0;i < game.players.length; i++) {
			// DEAL CARD
			game.dealer(i);
		};
		// SEND RENDER TRIGGER TO ALL OTHER CLIENTS
		game.updateEnemyHands();
		game.updateUI();
	},

	drawCard: function(socket){

		// WHICH PLAYER IS DRAWING THE CARD?
		var activePlayer = game.players.find(player => player.socketId == socket.id);

		// WHICH CARD DID HE DRAW?
		var cardDrawn = game.dealer(activePlayer.playerId);

		// SEND THE DRAWN CARD OBJECT AND PLAYERID TO THE ACTIVE CLIENT
		socket.emit("update player hand", {card: cardDrawn, playerId: activePlayer.playerId, discard: false});

		// SEND RENDER TRIGGER TO ALL OTHER CLIENTS
		socket.broadcast.emit("update enemy hands", activePlayer.playerId);

		// SEND NEW "CARDS LEFT IN DECK" TOOLTIP TO ALL CLIENTS
		var tooltip = "Cards left in deck: " + game.deck.cards.length;
		io.sockets.emit("deck tooltip", tooltip);

		// DEAL A RANDOM CARD TO THE CURRENT PLAYER
		game.dealer(game.currentPlayerIndex);
		game.updateUI();	
	},

	randomCard: function(){
		// PICK A RANDOM CARD FROM THE DECK
		return Math.round(Math.random() * Math.floor(this.cards.length - 1));
	}
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


game.pickSmallerCard = function() {
	// PICK THE LOWER CARD IN CURRENT PLAYER'S HAND
	if(game.currentPlayer.hand[0].number < game.currentPlayer.hand[1].number) {
		return game.currentPlayer.hand[0];
	} else {
		return game.currentPlayer.hand[1];
	};
};


game.play = {
	guard: function () {
		var $modal = $(".modal-guard-action"),
			$modalContent = $(".modal-guard-action-content"),
			$guardCard = $(".card-guard");

		// If you click on a guard card in your player-hand
		// open modal-guard-action
		// click on a player to choose him
		// fill modal-guard-action-content with card images
		// click on a card to choose it
		// cancel to close modal
		// pick to confirm selection 

		var playerIndex = game.currentPlayerIndex;


		io.sockets.emit("Played " + this.name + "(" + this.number + ") card.");
	},
	priest: function () {
		console.log("Played " + this.name + "(" + this.number + ") card.")
	}
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
	


//////////////////////
// UPDATE CLIENT UI //
//////////////////////

app.updateScore = function() {
	// GO THROUGH ALL PLAYERS
	for(var i=0;i < app.players.length; i++) {
		// TARGET THE PLAYER'S HAND SPAN
		var targetHand = "#p" + (i+1) + "hand",
		    firstCard = app.players[i].hand[0],
		    targetScore = "#p" + (i+1) + "score";
		// SET EACH PLAYERS SCORE
		$(targetScore).text(app.players[i].score);
		// IF TARGET PLAYER'S HAND IS EMPTY, THROW ERROR
		if(app.players[i].hand.length == 0)	{ 
			$(targetHand).text("");
			io.sockets.emit("alert", targetHand + " is empty! Should always have a card in hand..."); 
			continue;
		};
	};
};

game.updateUI = function() {};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////// SET UP CARDS & ACTIONS //////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// DESIGN CARDS
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

// PRINT CARDS
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

game.aiGame = function() {
	for (i=0;i<11;i++) {
		game.playCard();
		game.deck.drawCard();
	}
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// SET UP GAME ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


game.init = function() {
	roundStart = true;
	// PRINT CARDS
	game.printCards();

	// CREATE A LINKED LIST FROM GAME.PLAYERS (SET PLAYER ORDER)
	for (i=0;i<game.players.length;i++) {
		game.players[i].next = game.players[(i+1)%game.players.length];
	};

	// PICK FIRST PLAYER AT RANDOM 
	game.firstPlayerIndex = Math.floor(Math.random() * Math.floor(4));
	game.currentPlayerIndex = game.firstPlayerIndex;
	console.log("First player is: " + (game.players[game.firstPlayerIndex].name));
	// SET FIRST PLAYER AS CURRENT PLAYER
	game.currentPlayer = game.players[game.firstPlayerIndex];
};



//  RUN THE FUCKING GAME ALREADY!
game.init();





// //This prototype function allows you to remove even array from array
// Array.prototype.remove = function(x) { 
//     var i;
//     for (i in this) {
//         if (this[i].toString() == x.toString()) {
//             this.splice(i,1)
//         }
//     }
// }













////// PLAYER DRAWS CARD - WHEN ACTIVE PLAYER CLICKS ON DECK
	// socket.on("draw card", function(playerId) {

	// 	// WHICH PLAYER IS DRAWING THE CARD?
	// 	var activePlayer = game.players.find(player => player.socketId == socket.id);

	// 	// WHICH CARD DID HE DRAW?
	// 	var cardDrawn = game.dealer(activePlayer.playerId);

	// 	// SEND THE DRAWN CARD OBJECT AND PLAYERID TO THE ACTIVE CLIENT
	// 	socket.emit("card drawn", {card: cardDrawn, playerId: activePlayer.playerId});

	// 	// SEND ACTIVE CLIENT PLAYERID TO ALL OTHER CLIENTS AND TELL THEM HE DREW A CARD 
	// 	socket.broadcast.emit("player drew", activePlayer.playerId);

	// 	// SEND NEW "CARDS LEFT IN DECK" TOOLTIP TO ALL CLIENTS
	// 	var tooltip = "Cards left in deck: " + game.deck.cards.length;
	// 	io.sockets.emit("deck tooltip", tooltip);
	// });



