console.log("game.js CONNECTED!");

var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

socket.emit('new player');

// ======================================
// =============CARD OBJECTS=============
// ======================================

app = {};
app.currentPlayer = {};
app.currentPlayerIndex = null;
app.firstPlayer = null;
app.firstPlayerIndex = null;
app.smallerCardIndex = null;

app.table = {
	cardsPlayed: [],
	cardsLeft: []
}

function Card(name, number, description, action) {
	this.name = name;
	this.number = number;
	this.description = description;
	this.action = action;
};


app.cardFactory = {
	createGuard: function () {
		return {
			name: "Guard",
			number: 1,
			description: "Guess a player's card. If you are correct, the player loses. (Can't guess 'guard')",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
		}
	},
	createPriest: function () {
		return {
			name: "Priest",
			number: 2,
			description: "Secretly look at another player's card.",
			action: function(){console.log("Played " + this.name + "(" + this.number + ") card.")}
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
}

app.printCards = function () {
	// CREATE 5 GUARDS
	for (var i = 0; i < 5; i++) {
		app.deck.cards.push(app.cardFactory.createGuard());
	};
	// CREATE 2 OF EACH - PRIEST BARON HANDMAID PRINCE
	for (var i = 0; i < 2; i++) {
		app.deck.cards.push(app.cardFactory.createPriest());
		app.deck.cards.push(app.cardFactory.createBaron());
		app.deck.cards.push(app.cardFactory.createHandmaid());
		app.deck.cards.push(app.cardFactory.createPrince());
	};
	// CREATE 1 OF EACH - KING COUNTESS PRINCESS
	app.deck.cards.push(app.cardFactory.createKing());
	app.deck.cards.push(app.cardFactory.createCountess());
	app.deck.cards.push(app.cardFactory.createPrincess());
}



app.deck =  {
	cards: [
	],

	pickHiddenCard: function(){
		// CHOOSE RANDOM CARD FROM DECK ARRAY
		var pickedCardIndex = app.deck.randomCard();
		// COPY IT TO HIDDEN SPOT (edge case in game rules)
		app.hiddenCard = this.cards[pickedCardIndex];
		console.log(this.cards[pickedCardIndex].name + " will be hidden!");
		// REMOVE IT FROM DECK ARRAY
		this.cards.splice(pickedCardIndex,1);
	},

	dealCards: function(){
		// DEAL EXTRA CARD TO FIRST PLAYER AT START OF ROUND
		app.dealer(app.firstPlayerIndex);
		// DEAL A CARD TO EVERY PLAYER
		for (i=0;i < app.players.length; i++) {
			// DEAL CARD
			app.dealer(i);
		}
		app.updateUI();
	},

	drawCard: function(){
		// CHECK IF CURRENT PLAYER HAS 2 CARDS IN HAND
		if(app.currentPlayer.hand.length != 2) {
			// DEAL A RANDOM CARD TO THE CURRENT PLAYER
			app.dealer(app.currentPlayerIndex);
			app.updateUI();	
		} else {
			console.error(app.currentPlayer.name + " ALREADY HAS TWO CARDS!");
		};
		// CHECK DECK SIZE AND ADJUST SHADOW SIZE - IF IT'S EMPTY, REMOVE THE DECK FROM TABLE
		if (app.deck.cards.length == 0) {
			$("#deck").css("visibility", "hidden");
		};
		var deckSize = app.deck.cards.length;
		var shadowX = deckSize / 4;
		var shadowY = shadowX;
		var shadowSpread = shadowX;
		var shadowAlpha = (deckSize / 15);
		// console.log("Spread = " + shadowSpread + "\n" + "Alpha = " + shadowAlpha);
		$("#deck").css("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
		console.log("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
	},

	randomCard: function(){
		// PICK A RANDOM CARD FROM THE DECK
		return Math.round(Math.random() * Math.floor(this.cards.length - 1));
	}

}

app.dealer = function(playerIndex) {
	// CHOOSE RANDOM CARD FROM DECK ARRAY IF DECK ISN'T EMPTY
	if (app.deck.cards.length != 0) {
		randomCardIndex = app.deck.randomCard();
		// COPY IT TO TARGET PLAYER'S HAND
		app.players[playerIndex].hand.push(app.deck.cards[randomCardIndex]);
		// ANIMATE THE CARD
		var $dealtCard = $("<div>", {"class": "card card-back"});
		var targetHand = "#player-" + (playerIndex+1) + "-hand";
		$(targetHand).append($dealtCard);
		// REMOVE IT FROM DECK ARRAY
		app.deck.cards.splice(randomCardIndex,1);
	} else {
		console.error("DECK IS EMPTY! CAN'T APP.DEALER!");
	}
	// SET DECK TOOLTIP
	var tooltip = "Cards left in deck: " + app.deck.cards.length;
	$("#deck").prop("title", tooltip);
}

app.getWinner = function () {
	// COMPARE CARDS IN ALL PLAYERS' HANDS
	var keptCards   = [],
		highest     = 0,
		winnerIndex = null;
	// FILL KEPTCARDS ARRAY WITH CARD NUMBERS
	for(var i=0;i<app.players.length;i++) {
		keptCards.push(app.players[i].hand[0].number);
	}
	// COMPARE NUMBERS ONE BY ONE, IF NUMBER IS HIGHER, WRITE ITS INDEX INTO WINNERINDEX
	for(var i=0;i<keptCards.length;i++) {
		if(keptCards[i] > highest) {
			highest = keptCards[i];
			winnerIndex = i;
		}
	}
	return winnerIndex;
}

app.playCard = function() {
	var playerIndex = app.currentPlayerIndex;
	// CARD = CARD OBJECT
	// var card = app.players[playerIndex].hand[cardIndex];
	var card = app.pickSmallerCard();
	console.log(card + " = app.pickSmallerCard();")
	// COPY CARD TO CARDS PLAYED & LAST PLAYED ARRAYS
	app.table.cardsPlayed.push(card);
	app.currentPlayer.lastPlayed = card.name + "(" + card.number + ")";
	// DELETE CARD FROM HAND
	app.currentPlayer.hand.splice(app.smallerCardIndex,1);
	// APPLY CARD EFFECT
	console.log(app.currentPlayer.name + " played " + card.name);
	
	// --- UPDATE UI ---
	// REMOVE FACE DOWN CARD FROM PLAYER'S HAND
	var $targetCard = $("<div>", {"class": "card card-back"});
	var targetHand = "#player-" + (playerIndex+1) + "-hand";
	$("div", targetHand).slice(1).remove();
	// LAST CARD PLAYED BY PLAYER
	// var player = "#p" + (playerIndex+1) + "last";
	// $(player).text(card.name);
	
	// RENDER PLAYED CARD ONTO THE TABLE
	var playerCardsArea = "#player-" + (playerIndex+1) + "-cards",
		cardName = card.name.toLowerCase(),
		cardNumber = card.number,
		playedCardClass = "card card-" + card.name.toLowerCase(),
	
		mainDiv = $("<div>").addClass(playedCardClass).attr('data-card', cardName),
			cardNameDiv = $("<div>").addClass("card-name"),
				cardNameSpan = $("<span>").addClass("rotate-card-text").text(card.name),
			cardNumberDiv = $("<div>").addClass("card-number"),
				cardNumberSpan = $("<span>").text(card.number);

	mainDiv
		.append(
			cardNameDiv
				.append(cardNameSpan)
		)
		.append(
			cardNumberDiv
				.append(cardNumberSpan)
		);

	var $playedCard = mainDiv;
	$(playerCardsArea).append($playedCard);
	// CHECK IF DECK IS EMPTY
	if(app.deck.cards.length == 0) {
	// IF DECK = EMPTY, COMPARE CARDS AND DECLARE THE WINNER
	    var winner = app.players[app.getWinner()];
		alert(winner.name + " WINS!" + "\n" + "(Highest Card - " + winner.hand[0].name + ")");
		winner.score++;
	} else {
	// OTHERWISE IT'S NEXT PLAYER'S TURN
		app.setNextPlayer();
	}
	app.updateUI();
	app.setCardModal($playedCard);
}

app.pickSmallerCard = function() {
	// PICK THE LOWER CARD IN CURRENT PLAYER'S HAND
	if(app.currentPlayer.hand[0].number < app.currentPlayer.hand[1].number) {
		app.smallerCardIndex = 0;
		return app.currentPlayer.hand[0];
	} else {
		app.smallerCardIndex = 1;
		return app.currentPlayer.hand[1];
	}
}


app.updateUI = function() {
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
				console.error(targetHand + " is empty! Should always have a card in hand..."); 
				continue;
			}
			// IF TARGET PLAYER HAS ONE CARD IN HAND, DISPLAY CARD
			if(app.players[i].hand.length == 1) {
				$(targetHand).text(firstCard.name + "(" + firstCard.number + ")");	
			} else {
			// OTHERWISE DISPLAY BOTH CARDS
				var secondCard = app.players[i].hand[1];
				$(targetHand).text(firstCard.name + "(" + firstCard.number + ")," + secondCard.name + "(" + secondCard.number + ")");	
			}
	}
	// var allCards = $(".card").not($(".card-back")).not($(".card-number")).not($(".card-name"));
	// app.setCardModal();

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.setNextPlayer = function () {
	app.currentPlayer = app.currentPlayer.next;
	app.currentPlayerIndex = app.currentPlayer.playerID;
}



app.players = [
	{
		name: "Player 1",
		score: 0,
		firstPlayer: true,
		onTurn: true,
		hand: [],
		lastPlayed: "",
		immune: false,
		eliminated: false,
		next: null,
		playerID: 0
	},
	{
		name: "Player 2",
		score: 0,
		firstPlayer: false,
		onTurn: false,
		hand: [],
		lastPlayed: "",
		immune: false,
		eliminated: false,
		next: null,
		playerID: 1
	},
	{
		name: "Player 3",
		score: 0,
		firstPlayer: false,
		onTurn: false,
		hand: [],
		lastPlayed: "",
		immune: false,
		eliminated: false,
		next: null,
		playerID: 2
	},
	{
		name: "Player 4",
		score: 0,
		firstPlayer: false,
		onTurn: false,
		hand: [],
		lastPlayed: "",
		immune: false,
		eliminated: false,
		next: null,
		playerID: 3
	},
];

app.setCardModal = function(card) {
	// SET MODAL EVENT & ASSIGN IMAGE TO CARD
		var modal = $(".modal");
		var cardImage = $("#card-image");
		var modalOpened = false;
		card.hover(function(element){
			var that = this;
			// var timer;
			var delay = 500;
			// DELAY OPENING THE MODAL
			timer = setTimeout(function() {
				if (modal.css("display") !== "block") {
					var modalPosition =	that.getBoundingClientRect();
					var offset = $(that).offset();
					// CENTER MODAL ON MOUSE POSITION WHEN CARD IS CLICKED
					var relativeX = (element.pageX - 150); 
					var relativeY = (element.pageY - 205);
					// CHECK IF CARD IMAGE (MODAL) WOULD GO OFF USER'S SCREEN & FIX IT
					if(relativeX<0) { relativeX=0; };
					if(relativeY<0) { relativeY=0; };
					if(relativeY + 300 > $(window).width()) { relativeX = $(window).height() -  300;}
					if(relativeY + 410 > $(window).height()) { relativeY = $(window).height() -  405;}
					cardName = $(that).data("card");
					modal.css("left", relativeX);
					modal.css("top", relativeY);
					modal.addClass("modal-zoom-in");
				    modal.css("display", "block");
				    // GET CARD NAME AND SET IT'S SRC VALUE
				    cardImage.attr("src", "images/" + cardName + ".jpg");
				    cardImage.attr("alt", "When you discard the Guard, choose a player and name a card (other than Guard). If that player has that card, that player is knocked out of the round. If all other players still in the round are protected by the Handmaid, this card does nothing.");
				}
			}, delay);
		}, function() {
			clearTimeout(timer);
		}
		);

		// WHEN THE USER CLICKS ON MODAL, CLOSE THE MODAL
		modal.hover(function(){}, function(){
			// DELAY CLOSING THE MODAL
			setTimeout(function(){
				modal.removeClass("modal-zoom-in");
				modal.addClass("modal-zoom-out");
				setTimeout(function(){ 
					modal.css("display", "none");
					modal.removeClass("modal-zoom-out");
				}, 299);	
			}, 0);
		});
};


//////////////////////////////////////////// INITIALIZATION ///////////////////////////////////////////////////

app.init = function() {
	// PRINT CARDS
	app.printCards();
	// CREATE A LINKED LIST FROM APP.PLAYERS
	for (i=0;i<app.players.length;i++) {
		app.players[i].next = app.players[(i+1)%app.players.length];
	}
	// PICK RANDOM FIRST PLAYER
	app.firstPlayerIndex = Math.floor(Math.random() * Math.floor(4));
	app.currentPlayerIndex = app.firstPlayerIndex;
	console.log("First player is: " + (app.players[app.firstPlayerIndex].name));
	// FIRST PLAYER  IS CURRENT PLAYER
	app.currentPlayer = app.players[app.firstPlayerIndex];
	// TAKE A CARD FROM THE DECK AND HIDE IT
	app.deck.pickHiddenCard();
	// DEAL CARDS TO ALL PLAYERS
	app.deck.dealCards();
}

app.aiGame = function() {
	for (i=0;i<11;i++) {
		app.playCard();
		app.deck.drawCard();
	}
}

// RUN AFTER DOM LOADS
$(function() {
    app.init();
});
