console.log("••• GAME_NEW.JS CONNECTED •••")

// ==================================================================================================================
// ========== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==========
// ==================================================================================================================

var socket = io(),
	app = {
		maxNameLength: 16,
		fullDeck: 16
	};

////// RENDER SERVER ALERTS
socket.on("alert", function(message) {
	alert(message);
});
////// RENDER SERVER MESSAGES
socket.on("message", function(message) {
	console.log(message);
});

////// SEND NEW PLAYER EMIT AFTER LOADING THE DOM
$(function() {
	// DISPLAY PROMPT
	var playerName = prompt("What is thy name, peasant?", "");
	// CHECK NAME LENGTH
	if ($.trim(playerName).length > app.maxNameLength) {
		playerName = prompt("Your name is too long! \n\ (Peasants are not allowed to have names longer than 16 characters)", "");
	};
	// CHECK IF NAME IS "EMPTY"
	if ($.trim(playerName) == 0) {
		alert("Fine then, be anonymous, mystery man.");
	};
	// REMOVE SPACES BEFORE AND AFTER NAME
	playerName = $.trim(playerName);
	console.log("Sending your name (" + playerName + ") to server.");
	socket.emit("new player", playerName);
});


////// GET ALL PLAYER NAMES FROM SERVER
socket.on("player names", function(playerNames) {
	// GO THROUGH WHOLE ARRAY
	for (var i=0; i < playerNames.length; i++) {
		// SET EACH PLAYERS NAME
		var name = playerNames[i];
		$targetSpan = "#player-" + (i + 1) + "-name";
		$($targetSpan).text(name);
	};
});

////// RENDER CURRENT PLAYER
socket.on("render current player indicator", function(playerIndex) {
	app.renderPlayerIndicator(playerIndex);
});
////// RENDER HIDDEN CARD UNDER DECK BEFORE DEALING CARDS
socket.on("render hidden card", function() {
	app.renderHiddenCard();
});
////// RENDER PLAYER'S HAND
socket.on("render player hand", function(object) {
	app.renderPlayerHand(object.playerHand, object.playerIndex);
});
////// RENDER OTHER PLAYER HANDS
socket.on("render enemy hands", function(enemyIndexArray) {
	app.renderEnemyHands(enemyIndexArray);
});
////// RENDER DECK SHADOW & TOOLTIP
socket.on("render deck", function(object) {
	app.renderDeck(object.deckSize);
	$("#deck").prop("title", object.tooltip);
});
//////
socket.on("render all cards", function (allCardsArray) {
	app.renderAllCards(allCardsArray);
});
//////
socket.on("render score", function (winningPlayerId) {
	app.renderScore(winningPlayerId);
});
////// REMOVE PLAYED CARD FROM PLAYER'S HAND, RENDER IT ONTO THE TABLE 
socket.on("card played", function(object) {
	app.renderCardPlayed(object);
});

socket.on("confirm next round", function() {
	app.renderNextRoundButton();
});

socket.on("new round", function() {
	app.renderNewRound();
});

socket.on("confirm new game", function() {
	app.renderNewGameButton();
});

socket.on("new game", function() {
	app.renderNewGame();
})



// ==================================================================================================================
// =========== PLAYER ACTIONS ====================== PLAYER ACTIONS ====================== PLAYER ACTIONS ===========
// ==================================================================================================================

$("#deck").click(function() {
	socket.emit("deck click");	
});

app.addCardClickEvent = function (cardDiv) {
	// ADD CLICK EVENT CARD DIV
	$(cardDiv).click(function() {
		// GET "DATA-CARD" FROM CLICKED CARD
		var cardName = $(this).data("card");
		// SEND CLICKED CARD'S NAME WITH TRIGGER
		socket.emit("card click", cardName);
	});
};

app.renderNextRoundButton = function () {
	var $button = $("<input type=\"button\" value=\"READY\"/>");
	$(".floor:first").append($button);
	$(":button").click(function() {
		socket.emit("player ready");
		this.remove();
	});
};

app.renderNewGameButton = function () {
	var $button = $("<input type=\"button\" value=\"NEW GAME?\"/>");
	$(".floor:first").append($button);
	$(":button").click(function() {
		socket.emit("player ready");
		this.remove();
	});
}

// ==================================================================================================================
// ============== RENDERING =========================== RENDERING =========================== RENDERING =============
// ==================================================================================================================

app.renderPlayerIndicator = function (playerIndex) {
	$(".player-info").removeClass("player-turn-indicator");
	$("#player-" + (playerIndex+1) + "-box .player-info").addClass("player-turn-indicator");
};

app.renderPlayerHand = function (playerHand, playerIndex) {

	// REMOVE ALL CARDS FROM PLAYER'S HAND
	var $playerHand = $("#player-" + (playerIndex+1) + "-hand");
	$("div", $playerHand).slice(0).remove();
	
	// RENDER CARDS IN PLAYER'S HAND
	var firstCard = playerHand[0],
		firstCardClass = "card card-" + firstCard.name.toLowerCase(),
		$firstCardDiv = $("<div>").addClass(firstCardClass).attr('data-card', firstCard.name.toLowerCase());

		// RENDER FIRST CARD
		$($playerHand).append($firstCardDiv);
		app.addCardClickEvent($firstCardDiv);
		app.setCardModal($firstCardDiv);

		// CHECK IF PLAYER HAS TWO CARDS
		if (playerHand.length == 2) {
			// RENDER SECOND CARD
			secondCard = playerHand[1],
			secondCardClass = "card card-" + secondCard.name.toLowerCase(),
			$secondCardDiv = $("<div>").addClass(secondCardClass).attr('data-card', secondCard.name.toLowerCase());
			$($playerHand).append($secondCardDiv);
			app.addCardClickEvent($secondCardDiv);
			app.setCardModal($secondCardDiv);
		};
};

app.renderEnemyHands = function (enemyIndexArray) {
	// IF enemyIndexArray IS AN ARRAY (TRIGGERED BY DEALING CARDS)
	if (enemyIndexArray.length != undefined) {
		for (var i=0; i < enemyIndexArray.length; i++) {
			// RENDER THE CARDBACKS
			var $dealtCard = $("<div>", {"class": "card card-back"}),
				targetHand = "#player-" + (enemyIndexArray[i] + 1) + "-hand";	
			$(targetHand).append($dealtCard);
		};
	} else {
	// IF enemyIndexArray IS JUST ONE INDEX (TRIGGERED BY DRAWING A CARD)
		var $dealtCard = $("<div>", {"class": "card card-back"}),
			enemyIndex = enemyIndexArray,
			targetHand = "#player-" + (enemyIndex + 1) + "-hand";	
		$(targetHand).append($dealtCard);

		console.log("••••• Player " + (enemyIndex + 1) + " drew a card! •••••");
	};
	
};

app.renderHiddenCard = function () {
	var $hiddenCard = $("<div>", {"class": "card card-back rotate-hidden-card"});
		$(".table-center").prepend($hiddenCard);
};

app.renderDeck = function (deckSize) {
	// CHECK DECK SIZE
	if (deckSize == 0) {
		// IF IT'S EMPTY, REMOVE THE DECK FROM TABLE
		$("#deck").css("visibility", "hidden");
	} else {
		// OTHERWISE ADJUST DECK'S SHADOW SIZE
		shadowX = deckSize / 3,
		shadowY = shadowX,
		shadowSpread = shadowX,
		shadowAlpha = (deckSize / 15);
	$("#deck").css("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
	};
};

app.renderCardPlayed = function (object) {
	// UNPACK OBJECT
	var cardName = object.cardName, 
		playerIndex = object.playerIndex,
		playedCardClass = "card card-" + cardName,
		playedCardsDiv = "#player-" + (playerIndex+1) + "-cards",
		$playedCardDiv = $("<div>").addClass(playedCardClass).attr('data-card', cardName);

	// RENDER THE CARD IN PLAYED CARDS DIV
	$(playedCardsDiv).append($playedCardDiv);
	app.setCardModal($playedCardDiv);

	var targetHand = "#player-" + (playerIndex+1) + "-hand",
		$cardBack = $("div.card.card-back", targetHand),
		$cardInHand = $("div.card.card-" + cardName, targetHand);

	// REMOVE THE CARD FROM PLAYER'S HAND
	$cardInHand.last().remove();


	// REMOVE FACE DOWN CARD FROM PLAYER'S HAND
	var targetHand = "#player-" + (playerIndex+1) + "-hand";
	$cardBack.last().remove();
};

app.renderAllCards = function (allCardsArray) {
	// CHECK IF LAST ARRAY ITEM IS A STRING
	if (typeof allCardsArray[allCardsArray.length - 1] == "string") {
		// REMOVE HIDDEN CARD
		$(".rotate-hidden-card", ".table-center").slice(0).remove();
		// RENDER HIDDEN CARD
		var cardName = allCardsArray[allCardsArray.length - 1].toLowerCase(),
			cardClass = "card card-" + cardName,
			$cardDiv = $("<div>").addClass(cardClass).addClass("rotate-hidden-card").attr('data-card', cardName);
		$(".table-center").append($cardDiv);
		app.setCardModal($cardDiv);
		allCardsArray.splice(-1, 1);
	};

	// FOR ALL PLAYERS
	for (var i = 0; i < allCardsArray.length; i++) {

		// REMOVE ALL CARDS FROM PLAYER'S HAND
		var $playerHand = $("#player-" + (allCardsArray[i][1]+1) + "-hand");
		$("div", $playerHand).slice(0).remove();
	
		// RENDER CARD IN PLAYER'S HAND
		var cardName = allCardsArray[i][0],
			cardClass = "card card-" + cardName.toLowerCase(),
			$cardDiv = $("<div>").addClass(cardClass).attr('data-card', cardName);
		$($playerHand).append($cardDiv);
		app.setCardModal($cardDiv);
	};
};

app.renderScore = function (winningPlayerId) {
	var $playerScoreDiv = $("#player-" + (winningPlayerId+1) + "-score");
	$($playerScoreDiv).children(".heart-empty").first().removeClass("heart-empty");
};

app.renderNewRound = function () {
	$(".card").not("#deck").remove();
	$("#deck").css("visibility", "visible");
	app.renderDeck(app.fullDeck);
};

app.renderNewGame = function () {
	$(".card").not("#deck").remove();
	$("#deck").css("visibility", "visible");
	app.renderDeck(app.fullDeck);

	for (var i=0; i < 4; i++) {
		var $playerScoreDiv = $("#player-" + (i+1) + "-score");
		$($playerScoreDiv).children(".heart").addClass("heart-empty");
	};

};

app.setCardModal = function($card) {
	// SET MODAL EVENT & ASSIGN IMAGE TO CARD
	var modal = $(".modal-card-zoom"),
		cardImage = $("#card-image"),
		modalOpened = false;

	$card.hover(function(element){
		var that = this,
			delay = 1000;
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
		// IF MOUSE LEAVES THE CARD BEFORE DELAY IS COMPLETE, STOP THE ACTION
		clearTimeout(timer);
	}
	);

	// WHEN MOUSE EXITS MODAL, CLOSE THE MODAL
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

	// IF CARD IS CLICKED, STOP HOVER EVENT
	$card.click(function() {
	clearTimeout(timer);
	});

};