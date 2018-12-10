console.log("game.js CONNECTED!");

app = {};
app.currentPlayer = {};
app.currentPlayerIndex = null;
app.firstPlayer = null;
app.firstPlayerIndex = null;
app.smallerCardIndex = null;
app.mySocketId = "";
app.myPlayerId = null;
app.newRound = true;

////// PLAYER NAME SETUP
// app.myPlayerName = prompt("What is thy name, peasant?", "");
// // REMOVE LEADING & TRAILING SPACES FROM NAME INPUT
// app.myPlayerName = $.trim(app.myPlayerName);

// if (app.myPlayerName.length > 16) {
// 	app.myPlayerName = prompt("Your name is too long! \n\ (Peasants are not allowed to have names longer than 16 characters)", "");
// }


// ======================================
// ========== SOCKET.IO CLIENT ==========
// ======================================

var socket = io();

// SEND NEW PLAYER EMIT ON LOADING THE PAGE
socket.emit("new player");

// SEND PLAYER NAME TO SERVER
socket.emit("player name", app.myPlayerName);

// GET ALL PLAYER NAMES FROM SERVER
socket.on("player names", function(playerNames) {
	// GO THROUGH WHOLE ARRAY
	for (var i=0; i < playerNames.length; i++) {
		// SET EACH PLAYERS NAME
		var name = playerNames[i];
		$targetSpan = "#player-" + (i + 1) + "-name";
		$($targetSpan).text(name);
	};
});

// CLIENT RECIEVES PLAYERID FROM SERVER
socket.on("player id", function(playerId) {
	// GET PLAYERID FOR CLIENT
	app.myPlayerId = playerId;
	console.log("Server sent this to client: Your playerId is '" + app.myPlayerId + "'.");
	// GET SOCKETID FOR CLIENT
	app.mySocketId = socket.io.engine.id;
	console.log("Server sent this to client: Your socketId is '" + app.mySocketId + "'.");
});

////// GET FIRST PLAYER FROM SERVER
socket.emit("first player");
socket.on("first player", function(firstPlayerIndex) {
	app.firstPlayerIndex = firstPlayerIndex;
	app.currentPlayerIndex = firstPlayerIndex;
	// app.firstPlayer	
});

// RENDER SERVER MESSAGES INTO USER'S CONSOLE
socket.on("message", function(message) {
	console.log(message);
});

// RENDER SERVER ALERTS
socket.on("alert", function(message) {
	alert(message);
});

socket.on("send hands", function(object) {
	// UNPACK RECIEVED OBJECT (ARRAY OF HANDS & DECK SIZE) & UPDATE APP.PLAYERS
	var playerHands = object.playerHands,
		deckSize = object.deckSize;
	// REPLACE ALL HANDS WITH NEW PLAYER HANDS
	for (var i=0; i < app.players.length; i++) {
		console.log("Player index " + i + "'s hand: ");
		console.log(playerHands[i]);
		app.players[i].hand = playerHands[i];
	};
	// REPLACE ENEMY HANDS WITH DUMMY DATA (make cheating harder) :todo
	// app.renderHands(); // RENDER ENEMY HANDS
	app.renderPlayerHand(app.myPlayerId); // RENDER PLAYER HAND
	app.renderDeck(deckSize); // RENDER DECK (SHADOW OR REMOVE)
});

app.renderDeck = function (deckSize) {
	// CHECK DECK SIZE
	if (deckSize == 0) {
		// IF IT'S EMPTY, REMOVE THE DECK FROM TABLE
		$("#deck").css("visibility", "hidden");
	} else {
		// OTHERWISE ADJUST DECK'S SHADOW SIZE
		shadowX = deckSize / 4,
		shadowY = shadowX,
		shadowSpread = shadowX,
		shadowAlpha = (deckSize / 15);
	$("#deck").css("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
	};
};

socket.on("update player hand", function(object) {
	// GET CARD OBJECT & PLAYER ID FROM SERVER
	var card = object.card,
	playerId = object.playerId,
	    hand = app.players[playerId].hand;
	// IF PLAYER IS NOT DISCARDING
	if (object.discard == false) {
		// ADD CARD TO HAND
		hand.push(card);
	// IF PLAYER IS DISCARDING	
	} else {
		var index = $.inArray(card, hand);
		if (index >= 0) {
    	hand.splice(index, 1);
		};
	};
	// RENDER NEW HAND
	app.renderPlayerHand(playerId);
});

socket.on("update enemy hands", function(playerIndex) {
	// RENDER THE CARDBACK
	var $dealtCard = $("<div>", {"class": "card card-back"}),
		targetHand = "#player-" + (playerIndex+1) + "-hand";	
	$(targetHand).append($dealtCard);
});

socket.on("deck tooltip", function(tooltip) {
	// SET DECK TOOLTIP
	$("#deck").prop("title", tooltip);
});

socket.on("set next player", function(nextPlayerIndex) {
	app.currentPlayerIndex = nextPlayerIndex;
});	

socket.on("ai played card", function(card) {
	// RENDER PLAYED CARD ONTO THE TABLE
	var playerIndex = app.currentPlayerIndex;
		playerPlayedCardsArea = "#player-" + (playerIndex+1) + "-cards",
		playedCardClass = "card card-" + card.name.toLowerCase(),
		mainDiv = $("<div>").addClass(playedCardClass).attr('data-card', cardName),
		$playedCard = mainDiv;
	$(playerPlayedCardsArea).append($playedCard);
});


// ======================================
// =========== PLAYER OBJECTS ===========
// ======================================

app.players = [
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
		socketId: ""
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
		socketId: ""
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
		socketId: ""
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
		socketId: ""
	}
];


// ======================================
// =========== PLAYER ACTIONS ===========
// ======================================

$("#deck").click(function() {
	socket.emit("deck click");	
});

app.renderPlayerHand = function (playerIndex) {
	// REMOVE ALL CARDS FROM PLAYER'S HAND
	var $playerHand = $("#player-" + (playerIndex+1) + "-hand");
	$("div", $playerHand).slice(0).remove();
	
	// RENDER CARDS IN PLAYER'S HAND
	var firstCard = app.players[playerIndex].hand[0],
		firstCardClass = "card card-" + firstCard.name.toLowerCase(),
		$firstCardDiv = $("<div>").addClass(firstCardClass).attr('data-card', firstCard.name.toLowerCase());

		// RENDER FIRST CARD
		$($playerHand).append($firstCardDiv);
		app.addCardClickEvent($firstCardDiv);

		// CHECK IF PLAYER HAS TWO CARDS
		if (app.players[playerIndex].hand.length == 2) {
			// RENDER SECOND CARD
			secondCard = app.players[playerIndex].hand[1],
			secondCardClass = "card card-" + secondCard.name.toLowerCase(),
			$secondCardDiv = $("<div>").addClass(secondCardClass).attr('data-card', secondCard.name.toLowerCase());
			$($playerHand).append($secondCardDiv);
			app.addCardClickEvent($secondCardDiv);
		};
};

app.addCardClickEvent = function (cardDiv) {
	// ADD CLICK EVENT CARD DIV
	$(cardDiv).click(function() {
		// GET "DATA-CARD" FROM CLICKED CARD
		var cardClicked = $(this).data("card");
		// SEND CLICKED CARD'S NAME WITH TRIGGER
		socket.emit("card click", cardClicked);
	});
};


app.playCard = function() {

	// REMOVE FACE DOWN CARD FROM PLAYER'S HAND
	var targetHand = "#player-" + (playerIndex+1) + "-hand";
	$("div", targetHand).slice(1).remove();


	

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
};


app.updateUI = function() {

	app.renderPlayerHand();





	// // GO THROUGH ALL PLAYERS
	// for(var i=0;i < app.players.length; i++) {
	// 	// TARGET THE PLAYER'S HAND SPAN
	// 	var targetHand = "#p" + (i+1) + "hand",
	// 	    firstCard = app.players[i].hand[0],
	// 	    targetScore = "#p" + (i+1) + "score";

	// 	    // SET EACH PLAYERS SCORE :todo
	// 	    // $(targetScore).text(app.players[i].score);

	// 		// IF TARGET PLAYER'S HAND IS EMPTY, THROW ERROR
	// 		if(app.players[i].hand.length == 0)	{ 
	// 			$(targetHand).text("");
	// 			console.error(targetHand + " is empty! Should always have a card in hand..."); 
	// 			continue;
	// 		};
	// 		// IF TARGET PLAYER HAS ONE CARD IN HAND, DISPLAY CARD
	// 		if(app.players[i].hand.length == 1) {
	// 			$(targetHand).text(firstCard.name + "(" + firstCard.number + ")");	
	// 		} else {
	// 		// OTHERWISE DISPLAY BOTH CARDS
	// 			var secondCard = app.players[i].hand[1];
	// 			$(targetHand).text(firstCard.name + "(" + firstCard.number + ")," + secondCard.name + "(" + secondCard.number + ")");	
	// 		}
	// }
	// var allCards = $(".card").not($(".card-back")).not($(".card-number")).not($(".card-name"));
	// app.setCardModal();

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.setCardModal = function(card) {
	// SET MODAL EVENT & ASSIGN IMAGE TO CARD
		var modal = $(".modal-card-zoom");
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


/////////////////////////////////////////////// INITIALIZATION STATIC ////////////////////////////////////////////









// RUN AFTER DOM LOADS
// $(function() {
    
// });
