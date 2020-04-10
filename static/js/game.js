console.log("••• GAME_NEW.JS CONNECTED •••");

// ==================================================================================================================
// ========== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==========
// ==================================================================================================================

var socket = io(),
    app = {
        maxNameLength: 16,
        fullDeck: 16
    };

////// Render server alerts
socket.on("alert", function (message) {
    alert(message);
});
////// Render server messages
socket.on("message", function (message) {
    console.log(message);
});


////// Get all player names from server
socket.on("player names", function (playerNames) {
    for (var i=0; i < playerNames.length; i++) {
        // Set each players name
        var name = playerNames[i];
        $targetSpan = "#player-" + (i + 1) + "-name";
        $($targetSpan).text(name);
    };
});

////// Render current player
socket.on("render current player indicator", function (playerIndex) {
    app.renderPlayerIndicator(playerIndex);
});
////// Render hidden card under deck before dealing cards
socket.on("render hidden card", function () {
    app.renderHiddenCard();
});
////// Render player's hand
socket.on("render player hand", function (object) {
    app.renderPlayerHand(object.playerHand, object.playerIndex);
});
////// Render other player hands
socket.on("render enemy hands", function (enemyIndexArray) {
    app.renderEnemyHands(enemyIndexArray);
});
////// Render deck shadow & tooltip
socket.on("render deck", function (object) {
    app.renderDeck(object.deckSize);
    // Render deck tooltip
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
////// Remove played card from player's hand, render it onto the table
socket.on("card discarded", function (object) {
    app.renderCardDiscarded(object);
});
///// Remove hidden card
socket.on("remove hidden card", function () {
    app.removeHiddenCard();
});
socket.on("player eliminated", function (eliminatedPlayerId){
    app.renderPlayerEliminated(eliminatedPlayerId);
});

socket.on("render guard modal", function (targetablePlayerIds) {
    app.cardActions.guard(targetablePlayerIds);
});

socket.on("render priest modal", function (targetablePlayerIds) {
    app.cardActions.priest(targetablePlayerIds);
});

socket.on("render baron modal", function (targetablePlayerIds) {
    app.cardActions.baron(targetablePlayerIds);
});

socket.on("render prince modal", function (targetablePlayerIds) {
    app.cardActions.prince(targetablePlayerIds);
});

socket.on("render king modal", function (targetablePlayerIds) {
    app.cardActions.king(targetablePlayerIds);
});

socket.on("render player immune", function (immunePlayerId) {
    app.cardActions.handmaid(immunePlayerId);
});

socket.on("confirm next round", function () {
    app.renderNextRoundButton();
});

socket.on("new round", function () {
    app.renderNewRound();
});

socket.on("confirm new game", function () {
    app.renderNewGameButton();
});

socket.on("new game", function () {
    app.renderNewGame();
});


// ==================================================================================================================
// =========== PLAYER ACTIONS ====================== PLAYER ACTIONS ====================== PLAYER ACTIONS ===========
// ==================================================================================================================

$("#deck").click(function () {
    socket.emit("deck click");
});

app.addCardClickEvent = function (cardDiv) {
    // Add click event card div
    $(cardDiv).click(function () {
        // Get "data-card" from clicked card
        var cardName = $(this).data("card");

        // Trigger card action on server
        socket.emit("card click", cardName);
    });
};

app.renderNextRoundButton = function () {
    var $button = $("<input type=\"button\" value=\"READY\"/>");
    $(".floor:first").append($button);
    $button.click(function() {
        console.log("removing ready button");
        console.log(this);
        socket.emit("player ready");
        this.remove();
    });
};

app.renderNewGameButton = function () {
    var $button = $("<input type=\"button\" value=\"NEW GAME?\"/>");
    $(".floor:first").append($button);
    $button.click(function() {
        console.log("removing ready button");
        console.log(this);
        socket.emit("player ready");
        this.remove();
    });
};


// ==================================================================================================================
// ============= CARD ACTIONS ======================= CARD ACTIONS ======================== CARD ACTIONS ============
// ==================================================================================================================

app.cardActions = [];
app.initModals = [];

app.initModals.guard = function () {
    var $modal 		   = $("#guard-modal"),
        $targetCards   = $(".guard-modal-content > .card"),
        $buttonCancel  = $("#cancel-guard-button"),
        $buttonConfirm = $("#confirm-guard-button");
    // Set card zoom modal & action text event for all cards in modal
    for (var i=0; i < $targetCards.length; i++) {
        $targetCards[i] = $($targetCards[i]);
        app.setCardModal($targetCards[i]);
        var cardName = ($targetCards[i][0].attributes[1].value);
        console.log(cardName);
        app.setTargetCardText($targetCards[i], cardName, i);
    };
    $buttonCancel.click(function () {
        $modal.addClass("hide");
        // Remove targetable player markers
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // Remove card-targeted
        $(".card-targeted").removeClass("card-targeted");
        $(".target-player-text").text("which player");
        $(".target-card-text").text("which card");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            cardName = $(".card-targeted").data("card");
        if (targetPlayerId !== undefined && cardName !== undefined) {
            // Send target player and target card info
            socket.emit("guard action", {targetPlayerId: targetPlayerId, targetCard: cardName});
            // Remove card-targeted
            $(".card-targeted").removeClass("card-targeted");
            $(".target-player-text").text("which player");
            $(".target-card-text").text("which card");
            $modal.addClass("hide");
            // Remove targetable player markers
            for (let i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            };
        } else {
            alert("Choose a player and a card before confirming!");
        };
    });
    // All targetable cards can be clicked
    var $cardsInModal = $("[class*=target]");
    $cardsInModal.click(function (clickedCard) {
        $($cardsInModal).not(clickedCard.target).removeClass("card-targeted");
        $(this).toggleClass("card-targeted");
    });
};

app.initModals.priest = function () {
    var $modal 		   = $("#priest-modal"),
        $buttonCancel  = $("#cancel-priest-button"),
        $buttonConfirm = $("#confirm-priest-button"),
        $buttonFinish  = $("#finish-priest-button");

    $buttonCancel.click(function () {
        $modal.addClass("hide");
        // Remove targetable player markers
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // Remove card-targeted
        $(".card-targeted").removeClass("card-targeted");
        $(".target-player-text").text("which player");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            targetPlayerNameSpan = "#player-" + (targetPlayerId + 1)+ "-name",
            targetPlayerName = $(targetPlayerNameSpan).text();

        if (targetPlayerId !== undefined) {
            // Send target player and target card info
            socket.emit("priest action", targetPlayerId);
            // Remove all player markers
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            };
            // Remove confirm & cancel buttons
            $buttonConfirm.addClass("hidden");
            $buttonCancel.addClass("hidden");
            $(".target-player-text").text("which player");
            $(".priest-modal-help-text").text(`${targetPlayerName} has this card in their hand:`);
        } else {
            alert("Choose a player before confirming!");
        }
    });
    socket.on("render priest action", function(cardName) {
        var cardName 		 = cardName.toLowerCase(),
            cardClass 		 = "card card-" + cardName,
            $cardDiv  		 = $("<div>").addClass(cardClass).data('data-card', cardName),
            $priestModalCard = $("#priest-modal-target-card");

        // Replace card from modal (card-back) with card in target player's hand
        $priestModalCard.removeClass("card-back").addClass(cardClass).data("data-card", cardName);
        // Card can be zoomed in on hover
        app.setCardModal($cardDiv);
        // Show finish button
        $buttonFinish.removeClass("hidden");
        $("#priest-action-text").addClass("hidden");
    });
    $buttonFinish.click(function () {
        var $priestModalCard = $("#priest-modal-target-card"),
            $modal 		     = $("#priest-modal");
        // Reset & close modal
        $modal.addClass("hide");
        $(".priest-modal-help-text").text("Select a player to see their card");
        $("#priest-action-text").removeClass("hidden");
        // Replace card in modal (card-front) with card-back
        $priestModalCard.removeClass().data("data-card", null).addClass("card card-back");
        // Add a card-back to targeted player after priest action ends
        socket.emit("priest card discarded");
        // Show confirm & cancel buttons, hide finish button
        $buttonConfirm.removeClass("hidden");
        $buttonCancel.removeClass("hidden");
        $buttonFinish.addClass("hidden");
        $(".target-player-text").text("which player");
    });
};

app.initModals.baron = function () {
    var $modal 		   = $("#baron-modal"),
        $buttonCancel  = $("#cancel-baron-button"),
        $buttonConfirm = $("#confirm-baron-button"),
        $buttonFinish  = $("#finish-baron-button");

    $buttonCancel.click(function () {
        $modal.addClass("hide");
        // Remove targetable player markers
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // Remove card-targeted
        $(".card-targeted").removeClass("card-targeted");
    });

    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            targetPlayerNameSpan = "#player-" + (targetPlayerId + 1)+ "-name",
            targetPlayerName = $(targetPlayerNameSpan).text();

        if (targetPlayerId !== undefined) {
            // Send target player and target card info
            socket.emit("baron action", targetPlayerId);
            // Remove all player markers
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            }
            // Remove confirm & cancel buttons
            $buttonConfirm.addClass("hidden");
            $buttonCancel.addClass("hidden");
            $(".baron-modal-help-text").text(`${targetPlayerName} has this card in their hand:`);
        } else {
            alert("Choose a player before confirming!");
        }
    });

    socket.on("render baron action", function(object) {
        var cardName = object.cardName.toLowerCase(),
            winner = object.winner,
            cardClass = "card card-" + cardName,
            $cardDiv  = $("<div>").addClass(cardClass).attr('data-card', cardName),
            $cardBack = $("<div>", {"class": "card card-back"}),
            $baronModal = $("#baron-modal"),
            $baronModalCard = $("#baron-modal-target-card"),
            $buttonFinish = $("#finish-baron-button");

        // Replace card from modal (card-back) with card in target player's hand
        $baronModalCard.removeClass("card-back").addClass(cardClass).data("data-card", cardName);
        // Card can be zoomed in on hover
        app.setCardModal($cardDiv);
        // Card can be zoomed in on hover
        app.setCardModal($cardDiv);

        if (winner !== undefined) {
            // Modal prompt to confirm end of turn
            $("#baron-action-text").text(`${winner} wins the duel!`);
        } else {
            $("#baron-action-text").text("It's a croatian tie.");
        }
        // Show finish button
        $buttonFinish.removeClass("hidden");

        $buttonFinish.click(function () {
            var $baronModalCard = $("#baron-modal-target-card");
            // Replace card in modal (card-front) with card-back
            $baronModalCard.removeClass().data("data-card", null).addClass("card card-back");
            socket.emit("baron card discarded");
            // Show confirm & cancel buttons, hide finish button
            $buttonConfirm.removeClass("hidden");
            $buttonCancel.removeClass("hidden");
            $buttonFinish.addClass("hidden");
            $(".winner-span").slice(0).remove();
            // Close modal
            $modal.addClass("hide");
            $(".baron-modal-help-text").text("Which player do you want to compare cards with?");
            $("#baron-action-text").html("Should&nbsp;<span class=\"target-player-text\">(Player X)</span>&nbsp;compare his card with yours?</span>");
            $(".baron-modal-help-text").removeClass("hidden");
        });
    });
};

app.initModals.prince = function () {
    var $modal 		   = $("#prince-modal"),
        $buttonCancel  = $("#cancel-prince-button"),
        $buttonConfirm = $("#confirm-prince-button");

    $buttonCancel.click(function () {
        // Close modal
        $modal.addClass("hide");
        // Remove targetable player markers
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // Remove card-targeted
        $(".card-targeted").removeClass("card-targeted");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id");
        if (targetPlayerId != undefined) {
            // Send target player and target card info
            socket.emit("prince action", targetPlayerId);
            // Close modal
            $modal.addClass("hide");
            // Remove all player markers
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            }
        } else {
            alert("Choose a player before confirming!");
        }
    });
};

app.initModals.king = function () {
    var $modal 		   = $("#king-modal"),
        $buttonCancel  = $("#cancel-king-button"),
        $buttonConfirm = $("#confirm-king-button");

    $buttonCancel.click(function () {
        // Close modal
        $modal.addClass("hide");
        // Remove targetable player markers
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // Remove card-targeted
        $(".card-targeted").removeClass("card-targeted");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id");
        if (targetPlayerId != undefined) {
            // Send target player and target card info
            socket.emit("king action", targetPlayerId);
            // Close modal
            $modal.addClass("hide");
            // Remove all player markers
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            };
        } else {
            alert("Choose a player before confirming!");
        }
    });
};

app.cardActions.guard = function (targetablePlayerIds) {
    var $modal = $("#guard-modal");
    // Open modal
    $modal.removeClass("hide");
    // Mark targetable players
    for (var i=0; i < targetablePlayerIds.length; i++) {
        var $playerBox = $("#player-" + (targetablePlayerIds[i] + 1) + "-box");
        $playerBox.addClass("player-targetable");
        $playerBox.click(function (clickedBox) {
            $(".player-targeted").not(clickedBox.target).removeClass("player-targeted");
            $(this).toggleClass("player-targeted");
            var targetedPlayerId = parseInt(clickedBox.currentTarget.attributes[2].value, 10),
                targetedPlayerNameSpan = "#player-" + (targetedPlayerId + 1)+ "-name",
                targetedPlayerName = $(targetedPlayerNameSpan).text();
            $(".target-player-text").text(targetedPlayerName);
        });
    }
};

app.cardActions.priest = function (targetablePlayerIds) {
    var $modal = $("#priest-modal");
    // Open modal
    $modal.removeClass("hide");
    // Mark targetable players
    for (var i=0; i < targetablePlayerIds.length; i++) {
        var $playerBox = $("#player-" + (targetablePlayerIds[i] + 1) + "-box");
        $playerBox.addClass("player-targetable");
        $playerBox.click(function (clickedBox) {
            $(".player-targeted").not(clickedBox.target).removeClass("player-targeted");
            $(this).toggleClass("player-targeted");
            var targetedPlayerId = parseInt(clickedBox.currentTarget.attributes[2].value, 10),
                targetedPlayerNameSpan = "#player-" + (targetedPlayerId + 1)+ "-name",
                targetedPlayerName = $(targetedPlayerNameSpan).text();
            $(".target-player-text").text(targetedPlayerName);
        });
    }
};

app.cardActions.baron = function (targetablePlayerIds) {
    var $modal = $("#baron-modal");
    // Open modal
    $modal.removeClass("hide");
    // Mark targetable players
    for (var i=0; i < targetablePlayerIds.length; i++) {
        var $playerBox = $("#player-" + (targetablePlayerIds[i] + 1) + "-box");
        $playerBox.addClass("player-targetable");
        $playerBox.click(function (clickedBox) {
            $(".player-targeted").not(clickedBox.target).removeClass("player-targeted");
            $(this).toggleClass("player-targeted");
            var targetedPlayerId = parseInt(clickedBox.currentTarget.attributes[2].value, 10),
                targetedPlayerNameSpan = "#player-" + (targetedPlayerId + 1)+ "-name",
                targetedPlayerName = $(targetedPlayerNameSpan).text();
            $(".target-player-text").text(targetedPlayerName);
        });
    }
};

app.cardActions.handmaid = function (immunePlayerId) {
    var $playerBox = $("#player-" + (immunePlayerId + 1) + "-box");
        $playerBox.toggleClass("player-immune");
};

app.cardActions.prince = function (targetablePlayerIds) {
    var $modal = $("#prince-modal");
    // Open modal
    $modal.removeClass("hide");
    // Mark targetable players
    for (var i=0; i < targetablePlayerIds.length; i++) {
        var $playerBox = $("#player-" + (targetablePlayerIds[i] + 1) + "-box");
        $playerBox.addClass("player-targetable");
        $playerBox.click(function (clickedBox) {
            $(".player-targeted").not(clickedBox.target).removeClass("player-targeted");
            $(this).toggleClass("player-targeted");
            var targetedPlayerId = parseInt(clickedBox.currentTarget.attributes[2].value, 10),
                targetedPlayerNameSpan = "#player-" + (targetedPlayerId + 1)+ "-name",
                targetedPlayerName = $(targetedPlayerNameSpan).text();
            $(".target-player-text").text(targetedPlayerName);
        });
    }
};

app.cardActions.king = function (targetablePlayerIds) {
    var $modal = $("#king-modal");
    // Open modal
    $modal.removeClass("hide");
    // Mark targetable players
    for (var i=0; i < targetablePlayerIds.length; i++) {
        var $playerBox = $("#player-" + (targetablePlayerIds[i] + 1) + "-box");
        $playerBox.addClass("player-targetable");
        $playerBox.click(function (clickedBox) {
            $(".player-targeted").not(clickedBox.target).removeClass("player-targeted");
            $(this).toggleClass("player-targeted");
            var targetedPlayerId = parseInt(clickedBox.currentTarget.attributes[2].value, 10),
                targetedPlayerNameSpan = "#player-" + (targetedPlayerId + 1)+ "-name",
                targetedPlayerName = $(targetedPlayerNameSpan).text();
            $(".target-player-text").text(targetedPlayerName);
        });
    };
};

// ==================================================================================================================
// ============== RENDERING =========================== RENDERING =========================== RENDERING =============
// ==================================================================================================================

app.renderPriestResult = function (cardName, targetPlayerId, activePlayerId) {
    $targetPlayerHand = $("#player-" + (targetPlayerId+1) + "-hand");
    cardName = cardName.toLowerCase();
    cardClass = "card card-" + cardName;
    $cardDiv  = $("<div>").addClass(cardClass).attr('data-card', cardName);
    $cardBack = $("<div>", {"class": "card card-back"});

    // Remove card from hand (card-back)
    $("div", $targetPlayerHand).slice(0).remove();
    // Append card to hand (card-front)
    $($targetPlayerHand).append($cardDiv);
    // Card can be zoomed in on hover
    app.setCardModal($cardDiv);
    // Modal prompt to confirm end of turn
    alert("He's holding a " + cardName.toUpperCase() + " in his hand!");
    // Remove card from hand (card-front)
    $("div", $targetPlayerHand).slice(0).remove();
    // Add a card-back to targeted player after priest action ends
    $($targetPlayerHand).append($cardBack);
    socket.emit("priest card discarded");
};


app.renderPlayerIndicator = function (playerIndex) {
    $(".player-info").removeClass("player-turn-indicator");
    $("#player-" + (playerIndex+1) + "-box .player-info").addClass("player-turn-indicator");
};

app.renderPlayerHand = function (playerHand, playerIndex) {
    // Remove all cards from player's hand
    var $playerHand = $("#player-" + (playerIndex+1) + "-hand");
    console.log("render player hand");
    console.log($("div", $playerHand));
    $("div", $playerHand).slice(0).remove();
    // render cards in player's hand
    var firstCard 	   = playerHand[0],
        firstCardClass = "card card-" + firstCard.name.toLowerCase(),
        $firstCardDiv  = $("<div>").addClass(firstCardClass).attr('data-card', firstCard.name.toLowerCase());
        // Render first card
        $($playerHand).append($firstCardDiv);
        app.addCardClickEvent($firstCardDiv);
        app.setCardModal($firstCardDiv);
        // Check if player has two cards
        if (playerHand.length == 2) {
            // Render second card
            secondCard = playerHand[1],
            secondCardClass = "card card-" + secondCard.name.toLowerCase(),
            $secondCardDiv = $("<div>").addClass(secondCardClass).attr('data-card', secondCard.name.toLowerCase());
            $($playerHand).append($secondCardDiv);
            app.addCardClickEvent($secondCardDiv);
            app.setCardModal($secondCardDiv);
        };
};

app.renderEnemyHands = function (enemyIndexArray) {
    // If enemyIndex>rray is an array (triggered by dealing cards)
    if (enemyIndexArray.length != undefined) {
        for (var i=0; i < enemyIndexArray.length; i++) {
            // Render the cardbacks
            var $dealtCard = $("<div>", {"class": "card card-back"}),
                targetHand = "#player-" + (enemyIndexArray[i] + 1) + "-hand";
            $(targetHand).append($dealtCard);
        };
    } else {
    // If enemyIndexArray is just one index (triggered by drawing a card)
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

app.removeHiddenCard = function () {
    var $hiddenCard = $(".rotate-hidden-card");
    $hiddenCard.addClass("hidden");
};

app.renderDeck = function (deckSize) {
    // Check deck size
    if (deckSize == 0) {
        // If it's empty, remove the deck from table
        $("#deck").css("visibility", "hidden");
    } else {
        // Otherwise adjust deck's shadow size
        shadowX = deckSize / 5 + 1,
        shadowY = shadowX,
        shadowSpread = shadowX,
        shadowAlpha = (deckSize / 15);
    $("#deck").css("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
    };
};

app.renderCardDiscarded = function (object) {
    // Unpack object
    var cardName 		   = object.cardName.toLowerCase(),
        playerIndex 	   = object.playerIndex,
        discardedCardClass = "card card-" + cardName,
        discardedCardsDiv  = "#player-" + (playerIndex+1) + "-cards",
        $discardedCardDiv  = $("<div>").addClass(discardedCardClass).attr('data-card', cardName);
    // Render the card in played cards div
    $(discardedCardsDiv).append($discardedCardDiv);
    app.setCardModal($discardedCardDiv);
    var targetHand  = "#player-" + (playerIndex+1) + "-hand",
        $cardBack   = $("div.card.card-back", targetHand),
        $cardInHand = $("div.card.card-" + cardName, targetHand);
    // Remove the card from player's hand
    $cardInHand.last().remove();
    // Remove the card back from player's hand
    app.removeCardBack(playerIndex);
};

app.removeCardBack = function (playerIndex) {
    // Remove face down card from player's hand
    var targetHand = "#player-" + (playerIndex+1) + "-hand",
        $cardBack  = $("div.card.card-back", targetHand);
    $cardBack.last().remove();
};

app.renderPlayerEliminated = function (eliminatedPlayerId) {
    playerBox = "#player-" + (eliminatedPlayerId+1) + "-box";
    $(playerBox).addClass("eliminated");
};

app.renderAllCards = function (allCardsArray) {
    // Check if last array item is a string
    if (typeof allCardsArray[allCardsArray.length - 1] == "string") {
        // Remove hidden card
        $(".rotate-hidden-card", ".table-center").slice(0).remove();
        // Render hidden card
        var cardName  = allCardsArray[allCardsArray.length - 1].toLowerCase(),
            cardClass = "card card-" + cardName,
            $cardDiv  = $("<div>").addClass(cardClass).addClass("rotate-hidden-card").attr('data-card', cardName);
        $(".table-center").append($cardDiv);
        app.setCardModal($cardDiv);
        allCardsArray.splice(-1, 1);
    };
    // For all players
    for (var i = 0; i < allCardsArray.length; i++) {
        // Remove all cards from player's hand
        var $playerHand = $("#player-" + (allCardsArray[i][1]+1) + "-hand");
        $("div", $playerHand).slice(0).remove();
        // Render card in player's hand
        var cardName  = allCardsArray[i][0].name.toLowerCase(),
            cardClass = "card card-" + cardName,
            $cardDiv  = $("<div>").addClass(cardClass).attr('data-card', cardName);
        $($playerHand).append($cardDiv);
        app.setCardModal($cardDiv);
    };
};

app.renderScore = function (winningPlayerId) {
    var $playerScoreDiv = $("#player-" + (winningPlayerId+1) + "-score");
    $($playerScoreDiv).children(".heart-empty").first().removeClass("heart-empty");
};

app.renderNewRound = function () {
    // Remove all cards except deck and cards in modals
    $(".card").not("#deck").not('[class*="target"]').not('[id*="target"]').remove();
    // Remove all eliminated player classes
    $(".eliminated").removeClass("eliminated");
    // Render deck
    $("#deck").css("visibility", "visible");
    app.renderDeck(app.fullDeck);
};

app.renderNewGame = function () {
    app.renderNewRound();
    // Reset all scores
    for (var i=0; i < 4; i++) {
        var $playerScoreDiv = $("#player-" + (i+1) + "-score");
        $($playerScoreDiv).children(".heart").addClass("heart-empty");
    };
};

app.setTargetCardText = function (targetCard, cardName, i) {
    targetCard.click(function () {
        $(".target-card-text").text(cardName.toUpperCase() + "(" + (i + 2) + ")");
    });
};

app.setCardModal = function ($card) {
    // Set modal event & assign image to card
    var modal 		= $(".modal-card-zoom"),
        cardImage 	= $("#card-image"),
        modalOpened = false;
    $card.hover(function (element){
        var that  = this,
            delay = 600;
        // Delay opening the modal
        timer = setTimeout(function () {
            if (modal.css("display") !== "block") {
                var cardWidth   = 255,
                    cardHeight  = 350,
                    zoomOutline = 3,
                // Center modal on mouse position
                    centerX = element.pageX - cardWidth / 2,
                    centerY = element.pageY - cardHeight / 2,
                // Check if card image (modal) would go off user's screen & fix it
                    minimumX = (element.pageX - (cardWidth / 2)),
                    minimumY = (element.pageY - (cardHeight / 2)),
                    maximumX = (element.pageX + (cardWidth / 2)),
                    maximumY = (element.pageY + (cardHeight / 2));
                // Run checks for out of bounds modal
                if(minimumX<0) { centerX = 0 + zoomOutline };
                if(minimumY<0) { centerY = 0 + zoomOutline };
                if(maximumX > $(window).width()) { centerX = $(window).width() -  (cardWidth + zoomOutline) };
                if(maximumY > $(window).height()) { centerY = $(window).height() -  (cardHeight+ zoomOutline) };
            ////// Set modal content & position
                cardName = $(that).data("card");
                modal.css("left", centerX);
                modal.css("top", centerY);
                // Display card zoom modal
                modal.addClass("modal-zoom-in");
                modal.css("display", "block");
                // Get card name and set it's src value
                cardImage.attr("src", "images/" + cardName + ".jpg");
                cardImage.attr("alt", "Image failed to load! (images/" + cardName + ".jpg)");
            }
        }, delay);
    }, function() {
        // If mouse leaves the card before delay is complete, stop the action
        clearTimeout(timer);
    }
    );

    // When mouse exits modal, close the modal
    modal.hover(function (){}, function(){
        // Delay closing the modal
        setTimeout(function(){
            modal.removeClass("modal-zoom-in");
            modal.addClass("modal-zoom-out");
            setTimeout(function(){
                modal.css("display", "none");
                modal.removeClass("modal-zoom-out");
            }, 299);
        }, 0);
    });
    // If card is clicked, stop hover event
    $card.click(function() {
    clearTimeout(timer);
    });
};

////// Send new player emit after loading the dom
$(function() {
    // Display prompt
    var playerName = prompt("What is thy name, peasant?", "");
    // Check name length
    if ($.trim(playerName).length > app.maxNameLength) {
        playerName = prompt("Your name is too long! \n\ (Peasants are not allowed to have names longer than 16 characters)", "");
    };
    // Check if name is "empty"
    if ($.trim(playerName) === 0) {
        alert("Fine then, be anonymous, mystery man.");
    };
    // Remove spaces before and after name
    playerName = $.trim(playerName);
    console.log("Sending your name (" + playerName + ") to server.");
    socket.emit("new player", playerName);
});

app.initModals.guard();
app.initModals.baron();
app.initModals.priest();
app.initModals.prince();
app.initModals.king();

