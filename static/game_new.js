console.log("••• GAME_NEW.JS CONNECTED •••")

// ==================================================================================================================
// ========== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==========
// ==================================================================================================================

var socket = io(),
	app = {};

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
	if ($.trim(playerName).length > 16) {
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

socket.on("render hidden card", function() {
	app.renderHiddenCard();
});

socket.on("render player hand", function(object) {
	app.renderPlayerHand(object.playerHand, object.playerIndex);
});

socket.on("render enemy hands", function(enemyIndexArray) {
	app.renderEnemyHands(enemyIndexArray);
});





// ==================================================================================================================
// =========== PLAYER ACTIONS ====================== PLAYER ACTIONS ====================== PLAYER ACTIONS ===========
// ==================================================================================================================

$("#deck").click(function() {
	socket.emit("deck click");	
});


// ==================================================================================================================
// ============== RENDERING =========================== RENDERING =========================== RENDERING =============
// ==================================================================================================================


app.renderPlayerHand = function (playerHand, playerIndex) {

	console.log(playerHand);

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

		// CHECK IF PLAYER HAS TWO CARDS
		if (playerHand.length == 2) {
			// RENDER SECOND CARD
			secondCard = playerHand[1],
			secondCardClass = "card card-" + secondCard.name.toLowerCase(),
			$secondCardDiv = $("<div>").addClass(secondCardClass).attr('data-card', secondCard.name.toLowerCase());
			$($playerHand).append($secondCardDiv);
			app.addCardClickEvent($secondCardDiv);
		};
};

app.renderEnemyHands = function (enemyIndexArray) {
	for (var i=0; i < enemyIndexArray.length; i++) {
		// RENDER THE CARDBACKS
		var $dealtCard = $("<div>", {"class": "card card-back"}),
			targetHand = "#player-" + (enemyIndexArray[i] + 1) + "-hand";	
		$(targetHand).append($dealtCard);
	};
};

app.renderHiddenCard = function () {
	var $hiddenCard = $("<div>", {"class": "card card-back rotate-hidden-card"});
		$(".table-center").prepend($hiddenCard);
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
