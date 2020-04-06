console.log("••• GAME_NEW.JS CONNECTED •••");

// ==================================================================================================================
// ========== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==================== SOCKET.IO CLIENT ==========
// ==================================================================================================================

var socket = io(),
    app = {
        maxNameLength: 16,
        fullDeck: 16
    };

////// RENDER SERVER ALERTS
socket.on("alert", function (message) {
    alert(message);
});
////// RENDER SERVER MESSAGES
socket.on("message", function (message) {
    console.log(message);
});


////// GET ALL PLAYER NAMES FROM SERVER
socket.on("player names", function (playerNames) {
    // GO THROUGH WHOLE ARRAY
    for (var i=0; i < playerNames.length; i++) {
        // SET EACH PLAYERS NAME
        var name = playerNames[i];
        $targetSpan = "#player-" + (i + 1) + "-name";
        $($targetSpan).text(name);
    };
});

////// RENDER CURRENT PLAYER
socket.on("render current player indicator", function (playerIndex) {
    app.renderPlayerIndicator(playerIndex);
});
////// RENDER HIDDEN CARD UNDER DECK BEFORE DEALING CARDS
socket.on("render hidden card", function () {
    app.renderHiddenCard();
});
////// RENDER PLAYER'S HAND
socket.on("render player hand", function (object) {
    app.renderPlayerHand(object.playerHand, object.playerIndex);
});
////// RENDER OTHER PLAYER HANDS
socket.on("render enemy hands", function (enemyIndexArray) {
    app.renderEnemyHands(enemyIndexArray);
});
////// RENDER DECK SHADOW & TOOLTIP
socket.on("render deck", function (object) {
    app.renderDeck(object.deckSize);
    // RENDER DECK TOOLTIP
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
socket.on("card discarded", function (object) {
    app.renderCardDiscarded(object);
});
///// REMOVE HIDDEN CARD
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
    // ADD CLICK EVENT CARD DIV
    $(cardDiv).click(function () {
        // GET "DATA-CARD" FROM CLICKED CARD
        var cardName = $(this).data("card");

        // TRIGGER CARD ACTION ON SERVER
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
    // SET CARD ZOOM MODAL & ACTION TEXT EVENT FOR ALL CARDS IN MODAL
    for (var i=0; i < $targetCards.length; i++) {
        $targetCards[i] = $($targetCards[i]);
        app.setCardModal($targetCards[i]);
        var cardName = ($targetCards[i][0].attributes[1].value);
        console.log(cardName);
        app.setTargetCardText($targetCards[i], cardName, i);
    };
    $buttonCancel.click(function () {
        $modal.addClass("hide");
        // REMOVE TARGETABLE PLAYER MARKERS
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // REMOVE CARD-TARGETED
        $(".card-targeted").removeClass("card-targeted");
        $(".target-player-text").text("which player");
        $(".target-card-text").text("which card");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            cardName = $(".card-targeted").data("card");
        if (targetPlayerId !== undefined && cardName !== undefined) {
            // SEND TARGET PLAYER AND TARGET CARD INFO
            socket.emit("guard action", {targetPlayerId: targetPlayerId, targetCard: cardName});
            // REMOVE CARD-TARGETED
            $(".card-targeted").removeClass("card-targeted");
            $(".target-player-text").text("which player");
            $(".target-card-text").text("which card");
            $modal.addClass("hide");
            // REMOVE TARGETABLE PLAYER MARKERS
            for (let i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            };
        } else {
            alert("Choose a player and a card before confirming!");
        };
    });
    // ALL TARGETABLE CARDS CAN BE CLICKED
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
        // REMOVE TARGETABLE PLAYER MARKERS
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // REMOVE CARD-TARGETED
        $(".card-targeted").removeClass("card-targeted");
        $(".target-player-text").text("which player");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            targetPlayerNameSpan = "#player-" + (targetPlayerId + 1)+ "-name",
            targetPlayerName = $(targetPlayerNameSpan).text();

        if (targetPlayerId !== undefined) {

            // SEND TARGET PLAYER AND TARGET CARD INFO
            socket.emit("priest action", targetPlayerId);
            // REMOVE ALL PLAYER MARKERS
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            };
            // REMOVE CONFIRM & CANCEL BUTTONS
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

        // REPLACE CARD FROM MODAL (CARD-BACK) WITH CARD IN TARGET PLAYER'S HAND
        $priestModalCard.removeClass("card-back").addClass(cardClass).data("data-card", cardName);
        // CARD CAN BE ZOOMED IN ON HOVER
        app.setCardModal($cardDiv);
        // SHOW FINISH BUTTON
        $buttonFinish.removeClass("hidden");
        $("#priest-action-text").addClass("hidden");
    });
    $buttonFinish.click(function () {
        var $priestModalCard = $("#priest-modal-target-card"),
            $modal 		     = $("#priest-modal");
        // RESET & CLOSE MODAL
        $modal.addClass("hide");
        $(".priest-modal-help-text").text("Select a player to see their card");
        $("#priest-action-text").removeClass("hidden");
        // REPLACE CARD IN MODAL (CARD-FRONT) WITH CARD-BACK
        $priestModalCard.removeClass().data("data-card", null).addClass("card card-back");
        // ADD A CARD-BACK TO TARGETED PLAYER AFTER PRIEST ACTION ENDS
        socket.emit("priest card discarded");
        // SHOW CONFIRM & CANCEL BUTTONS, HIDE FINISH BUTTON
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
        // REMOVE TARGETABLE PLAYER MARKERS
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // REMOVE CARD-TARGETED
        $(".card-targeted").removeClass("card-targeted");
    });

    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id"),
            targetPlayerNameSpan = "#player-" + (targetPlayerId + 1)+ "-name",
            targetPlayerName = $(targetPlayerNameSpan).text();

        if (targetPlayerId !== undefined) {
            // SEND TARGET PLAYER AND TARGET CARD INFO
            socket.emit("baron action", targetPlayerId);
            // REMOVE ALL PLAYER MARKERS
            for (var i=0; i < 4; i++) {
                $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
            }
            // REMOVE CONFIRM & CANCEL BUTTONS
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
        // REPLACE CARD FROM MODAL (CARD-BACK) WITH CARD IN TARGET PLAYER'S HAND
        $baronModalCard.removeClass("card-back").addClass(cardClass).data("data-card", cardName);
        // CARD CAN BE ZOOMED IN ON HOVER
        app.setCardModal($cardDiv);
        // CARD CAN BE ZOOMED IN ON HOVER
        app.setCardModal($cardDiv);

        // $baronModal.addClass("hide");
        if (winner !== undefined) {
            // MODAL PROMPT TO CONFIRM END OF TURN
            $("#baron-action-text").text(`${winner} wins the duel!`);
            // $($baronModal).append('<span class="#baron">' + winner.name + 'wins the duel!</span>');
        } else {
            // $($baronModal).append('<span class="winner-span">' + "It's a croatian tie.</span>");
            $("#baron-action-text").text("It's a croatian tie.");
        }
        // SHOW FINISH BUTTON
        $buttonFinish.removeClass("hidden");

        $buttonFinish.click(function () {
            var $baronModalCard = $("#baron-modal-target-card");
            // REPLACE CARD IN MODAL (CARD-FRONT) WITH CARD-BACK
            $baronModalCard.removeClass().data("data-card", null).addClass("card card-back");
            socket.emit("baron card discarded");
            // SHOW CONFIRM & CANCEL BUTTONS, HIDE FINISH BUTTON
            $buttonConfirm.removeClass("hidden");
            $buttonCancel.removeClass("hidden");
            $buttonFinish.addClass("hidden");
            $(".winner-span").slice(0).remove();
            // CLOSE MODAL
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
        // CLOSE MODAL
        $modal.addClass("hide");
        // REMOVE TARGETABLE PLAYER MARKERS
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // REMOVE CARD-TARGETED
        $(".card-targeted").removeClass("card-targeted");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id");
        if (targetPlayerId != undefined) {
            // SEND TARGET PLAYER AND TARGET CARD INFO
            socket.emit("prince action", targetPlayerId);
            // CLOSE MODAL
            $modal.addClass("hide");
            // REMOVE ALL PLAYER MARKERS
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
        // CLOSE MODAL
        $modal.addClass("hide");
        // REMOVE TARGETABLE PLAYER MARKERS
        for (var i=0; i < 4; i++) {
            $("#player-" + (i + 1) + "-box").removeClass("player-targetable player-targeted");
        };
        // REMOVE CARD-TARGETED
        $(".card-targeted").removeClass("card-targeted");
    });
    $buttonConfirm.click(function () {
        var targetPlayerId = $(".player-targeted").data("target-player-id");
        if (targetPlayerId != undefined) {
            // SEND TARGET PLAYER AND TARGET CARD INFO
            socket.emit("king action", targetPlayerId);
            // CLOSE MODAL
            $modal.addClass("hide");
            // REMOVE ALL PLAYER MARKERS
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
    // OPEN MODAL
    $modal.removeClass("hide");
    // MARK TARGETABLE PLAYERS
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
    // OPEN MODAL
    $modal.removeClass("hide");
    // MARK TARGETABLE PLAYERS
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
    // OPEN MODAL
    $modal.removeClass("hide");
    // MARK TARGETABLE PLAYERS
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
    // OPEN MODAL
    $modal.removeClass("hide");
    // MARK TARGETABLE PLAYERS
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
    // OPEN MODAL
    $modal.removeClass("hide");
    // MARK TARGETABLE PLAYERS
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
    alert("renderPriestResult");
    $targetPlayerHand = $("#player-" + (targetPlayerId+1) + "-hand");
    cardName = cardName.toLowerCase();
    cardClass = "card card-" + cardName;
    $cardDiv  = $("<div>").addClass(cardClass).attr('data-card', cardName);
    $cardBack = $("<div>", {"class": "card card-back"});

    // REMOVE CARD FROM HAND (CARD-BACK)
    $("div", $targetPlayerHand).slice(0).remove();
    // APPEND CARD TO HAND (CARD-FRONT)
    $($targetPlayerHand).append($cardDiv);
    // CARD CAN BE ZOOMED IN ON HOVER
    app.setCardModal($cardDiv);
    // MODAL PROMPT TO CONFIRM END OF TURN
    alert("He's holding a " + cardName.toUpperCase() + " in his hand!");
    // REMOVE CARD FROM HAND (CARD-FRONT)
    $("div", $targetPlayerHand).slice(0).remove();
    // ADD A CARD-BACK TO TARGETED PLAYER AFTER PRIEST ACTION ENDS
    $($targetPlayerHand).append($cardBack);
    socket.emit("priest card discarded");
};


app.renderPlayerIndicator = function (playerIndex) {
    $(".player-info").removeClass("player-turn-indicator");
    $("#player-" + (playerIndex+1) + "-box .player-info").addClass("player-turn-indicator");
};

app.renderPlayerHand = function (playerHand, playerIndex) {
    // REMOVE ALL CARDS FROM PLAYER'S HAND
    var $playerHand = $("#player-" + (playerIndex+1) + "-hand");
    console.log("render player hand");
    console.log($("div", $playerHand));
    $("div", $playerHand).slice(0).remove();
    // RENDER CARDS IN PLAYER'S HAND
    var firstCard 	   = playerHand[0],
        firstCardClass = "card card-" + firstCard.name.toLowerCase(),
        $firstCardDiv  = $("<div>").addClass(firstCardClass).attr('data-card', firstCard.name.toLowerCase());
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

app.removeHiddenCard = function () {
    var $hiddenCard = $(".rotate-hidden-card");
    $hiddenCard.addClass("hidden");
};

app.renderDeck = function (deckSize) {
    // CHECK DECK SIZE
    if (deckSize == 0) {
        // IF IT'S EMPTY, REMOVE THE DECK FROM TABLE
        $("#deck").css("visibility", "hidden");
    } else {
        // OTHERWISE ADJUST DECK'S SHADOW SIZE
        shadowX = deckSize / 5 + 1,
        shadowY = shadowX,
        shadowSpread = shadowX,
        shadowAlpha = (deckSize / 15);
    $("#deck").css("box-shadow", shadowX + "px " + shadowY + "px 2px " + shadowSpread + "px rgba(0,0,0," + shadowAlpha + ")");
    };
};

app.renderCardDiscarded = function (object) {
    // UNPACK OBJECT
    var cardName 		   = object.cardName.toLowerCase(),
        playerIndex 	   = object.playerIndex,
        discardedCardClass = "card card-" + cardName,
        discardedCardsDiv  = "#player-" + (playerIndex+1) + "-cards",
        $discardedCardDiv  = $("<div>").addClass(discardedCardClass).attr('data-card', cardName);
    // RENDER THE CARD IN PLAYED CARDS DIV
    $(discardedCardsDiv).append($discardedCardDiv);
    app.setCardModal($discardedCardDiv);
    var targetHand  = "#player-" + (playerIndex+1) + "-hand",
        $cardBack   = $("div.card.card-back", targetHand),
        $cardInHand = $("div.card.card-" + cardName, targetHand);
    // REMOVE THE CARD FROM PLAYER'S HAND
    $cardInHand.last().remove();
    // REMOVE THE CARD BACK FROM PLAYER'S HAND
    app.removeCardBack(playerIndex);
};

app.removeCardBack = function (playerIndex) {
    // REMOVE FACE DOWN CARD FROM PLAYER'S HAND
    var targetHand = "#player-" + (playerIndex+1) + "-hand",
        $cardBack  = $("div.card.card-back", targetHand);
    $cardBack.last().remove();
};

app.renderPlayerEliminated = function (eliminatedPlayerId) {
    playerBox = "#player-" + (eliminatedPlayerId+1) + "-box";
    $(playerBox).addClass("eliminated");
};

app.renderAllCards = function (allCardsArray) {
    // CHECK IF LAST ARRAY ITEM IS A STRING
    if (typeof allCardsArray[allCardsArray.length - 1] == "string") {
        // REMOVE HIDDEN CARD
        $(".rotate-hidden-card", ".table-center").slice(0).remove();
        // RENDER HIDDEN CARD
        var cardName  = allCardsArray[allCardsArray.length - 1].toLowerCase(),
            cardClass = "card card-" + cardName,
            $cardDiv  = $("<div>").addClass(cardClass).addClass("rotate-hidden-card").attr('data-card', cardName);
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
    // REMOVE ALL CARDS EXCEPT DECK AND CARDS IN MODALS
    $(".card").not("#deck").not('[class*="target"]').not('[id*="target"]').remove();
    // REMOVE ALL ELIMINATED PLAYER CLASSES
    $(".eliminated").removeClass("eliminated");
    // RENDER DECK
    $("#deck").css("visibility", "visible");
    app.renderDeck(app.fullDeck);
};

app.renderNewGame = function () {
    app.renderNewRound();
    // RESET ALL SCORES
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
    // SET MODAL EVENT & ASSIGN IMAGE TO CARD
    var modal 		= $(".modal-card-zoom"),
        cardImage 	= $("#card-image"),
        modalOpened = false;
    $card.hover(function (element){
        var that  = this,
            delay = 600;
        // DELAY OPENING THE MODAL
        timer = setTimeout(function () {
            if (modal.css("display") !== "block") {
                var cardWidth   = 255,
                    cardHeight  = 350,
                    zoomOutline = 3,
            ////// CENTER MODAL ON MOUSE POSITION
                    centerX = element.pageX - cardWidth / 2,
                    centerY = element.pageY - cardHeight / 2,
                // CHECK IF CARD IMAGE (MODAL) WOULD GO OFF USER'S SCREEN & FIX IT
                    minimumX = (element.pageX - (cardWidth / 2)),
                    minimumY = (element.pageY - (cardHeight / 2)),
                    maximumX = (element.pageX + (cardWidth / 2)),
                    maximumY = (element.pageY + (cardHeight / 2));
                // RUN CHECKS FOR OUT OF BOUNDS MODAL
                if(minimumX<0) { centerX = 0 + zoomOutline };
                if(minimumY<0) { centerY = 0 + zoomOutline };
                if(maximumX > $(window).width()) { centerX = $(window).width() -  (cardWidth + zoomOutline) };
                if(maximumY > $(window).height()) { centerY = $(window).height() -  (cardHeight+ zoomOutline) };
            ////// SET MODAL CONTENT & POSITION
                cardName = $(that).data("card");
                modal.css("left", centerX);
                modal.css("top", centerY);
                // DISPLAY CARD ZOOM MODAL
                modal.addClass("modal-zoom-in");
                modal.css("display", "block");
                // GET CARD NAME AND SET IT'S SRC VALUE
                cardImage.attr("src", "images/" + cardName + ".jpg");
                cardImage.attr("alt", "Image failed to load! (images/" + cardName + ".jpg)");
            }
        }, delay);
    }, function() {
        // IF MOUSE LEAVES THE CARD BEFORE DELAY IS COMPLETE, STOP THE ACTION
        clearTimeout(timer);
    }
    );

    // WHEN MOUSE EXITS MODAL, CLOSE THE MODAL
    modal.hover(function (){}, function(){
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

////// SEND NEW PLAYER EMIT AFTER LOADING THE DOM
$(function() {
    // DISPLAY PROMPT
    var playerName = prompt("What is thy name, peasant?", "");
    // CHECK NAME LENGTH
    if ($.trim(playerName).length > app.maxNameLength) {
        playerName = prompt("Your name is too long! \n\ (Peasants are not allowed to have names longer than 16 characters)", "");
    };
    // CHECK IF NAME IS "EMPTY"
    if ($.trim(playerName) === 0) {
        alert("Fine then, be anonymous, mystery man.");
    };
    // REMOVE SPACES BEFORE AND AFTER NAME
    playerName = $.trim(playerName);
    console.log("Sending your name (" + playerName + ") to server.");
    socket.emit("new player", playerName);
});

app.initModals.guard();
app.initModals.baron();
app.initModals.priest();
app.initModals.prince();
app.initModals.king();

