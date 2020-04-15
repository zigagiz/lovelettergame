// Dependencies
var express  = require("express"),
    http     = require("http"),
    path     = require("path"),
    socketIO = require("socket.io"),
    app      = express(),
    server   = http.Server(app),
    io       = socketIO(server, {'pingInterval': 2000, 'pingTimeout': 60000});


// Set path for serving files
app.use(express.static('../static'));
app.set("port", 3000);
// Routing
app.get("/", function(request, response) {
  response.sendFile(path.join(__dirname, "/index.html"));
});
// Start the server.
server.listen(3000, function() {
  console.log("Starting server on port 3000");
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////// SETUP COMMUNICATIONS //////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

io.on("connection", function(socket) {

////// Player joins
    socket.on("new player", function(playerName) {
        game.sitPlayer(socket);
        game.setPlayerName(playerName, socket);
        io.sockets.emit("message", "Player " + playerName + " with id '" + socket.id + "'' connected.");
    });

////// Handle player's click on deck
    socket.on("deck click", function() {
        // If it is the player's turn
        if (socket.id === game.currentPlayer.socketId) {
            var handSize = game.currentPlayer.hand.length,
                deckSize = game.deck.cards.length;
            // If it is the start of the round
            if (game.roundStart && deckSize === 16) {
                // Take a card from the deck and hide it
                game.deck.pickHiddenCard();
                // Render the hidden card
                io.sockets.emit("render hidden card");
                // Deal 1 card to each player
                game.deck.dealCards();
                // Draw 2nd card
                game.deck.drawCard(socket.id);
                // Render hands of all players
                game.render.dealCards(socket);
                // Render deck
                game.render.deck();
                game.roundStart = false;
            } else {
                // If player has less than 2 cards in hand
                if (handSize === 1 || handSize === 0) {
                    game.deck.drawCard(socket.id);
                    game.render.drawCard(socket.id);
                    game.render.deck();
                }
                if (handSize === 2) {
                    // If player has 2 cards in hand
                    socket.emit("alert", "You already have 2 cards in hand. Play a card!");
                }
                    // Throw error if handsize is weird
                if (handSize > 2 || handSize < 0 || handSize === undefined) {
                    socket.emit("alert", "ERROR: game.currentPlayer.hand.length = " + game.currentPlayer.hand.length);
                }
            }
        } else {
            // If it's not the player's turn
            socket.emit("alert", "It's not your turn, peasant!");
        }
    });

                                      //////////// CARD ACTIONS ///////////

////// Handle player's click on a card in his hand
    socket.on("card click", function(cardName) {
        ////// Handle player's click on a card
        var activePlayer         = game.players.find(player => player.socketId === socket.id),
            activePlayerHand     = activePlayer.hand.map(card => card.number),
            targetablePlayers    = game.players.filter(player => !player.eliminated && !player.immune && player.playerId !== activePlayer.playerId),
            targetablePlayerIds  = targetablePlayers.map(player => player.playerId),
            cardPlayed           = activePlayer.hand.find(hand => hand.name.toLowerCase() === cardName);
        if (activePlayer.hand.length === 2) {
            if (targetablePlayers.length === 0 && cardName !== "prince" && cardName !== "handmaid" && cardName !== "countess" && cardName !== "princess") {
                socket.emit("alert", "All players are either immune or eliminated! No action taken, card discarded.");
                game.discardCard(socket.id, cardName);
                game.checkWinCondition();
            } else {
                var allowPlay = true;
                // Which card was clicked
                if (cardName !== "countess" && activePlayer.hand.find(card => card.number === 7)) {
                    if (activePlayer.hand.find(card => card.number === 5 || card.number === 6)) {
                            socket.emit("alert", "You must play the countess!");
                            allowPlay = false;
                    }
                }
                if (allowPlay) {
                    switch (cardName) {
                    case "guard":
                    case "priest":
                    case "baron":
                    case "king":
                    case "countess":
                        cardPlayed.action(socket, targetablePlayerIds);
                        break;
                    case "prince":
                        targetablePlayerIds.push(activePlayer.playerId);
                        cardPlayed.action(socket, targetablePlayerIds);
                        break;
                    case "handmaid":
                    case "princess":
                        cardPlayed.action(socket);
                        break;
                    }
                }
            }
        } else {
            socket.emit("alert", "You must draw a card before playing one!");
        }
    });

////// Guard card
    socket.on("guard action", function(object) {
        var targetPlayerId = object.targetPlayerId,
            targetCard     = object.targetCard,
            activePlayer   = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.guard(targetPlayerId, targetCard, socket.id);
            game.discardCard(socket.id, "guard");
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
        game.checkWinCondition();
    });
////// Priest card
    socket.on("priest action", function(targetPlayerId) {
        var activePlayer = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.priest(socket.id, targetPlayerId);
            game.discardCard(socket.id, "priest");
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
    });
////// Priest card action end trigger
    socket.on("priest card discarded", function() {
        game.checkWinCondition();
    });
////// Baron card
    socket.on("baron action", function(targetPlayerId){
        var activePlayer = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.baron(activePlayer, targetPlayerId);
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
    });
////// Prince card
    socket.on("prince action", function(targetPlayerId) {
        game.cardAction.prince(socket.id, targetPlayerId);
    });
////// King card
    socket.on("king action", function(targetPlayerId) {
        game.cardAction.king(socket.id, targetPlayerId);
    });


/////////////// CARD ACTIONS END //////////// //////////// CARD ACTIONS END //////////// //////////// CARD ACTIONS END ///////////////


////// Handle player's ready button click
    socket.on("player ready", function() {
        game.playersReady(socket);
    });

////// Player leaves
    socket.on("disconnect", function(reason) {
        var leavingPlayer = game.players.find(player => player.socketId === socket.id);

        if (leavingPlayer !== undefined) {
            leavingPlayer.chairTaken = false;
            leavingPlayer.socketId = "";
            leavingPlayer.name = "";
            game.setPlayerName("", socket);
            socket.broadcast.emit("message", "Player " + leavingPlayer.name + " (" + socket.id + ") has disconnected.");
            console.log("Player " + leavingPlayer.name + "(" + socket.id + ") disconnected.");
        } else {
            console.log("A spectator left the game.");
        }
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////// SETUP GAME MODEL ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////// Global scope - misc variables
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

////// Design cards
game.cardFactory = {
    createGuard: function () {
        return {
            name: "Guard",
            number: 1,
            description: "Guess a player's card. If you are correct, the player is eliminated. (Can't guess 'guard')",
            action: function (socket, targetablePlayerIds) {
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
            action: function (socket, targetablePlayerIds) {
                socket.emit("render priest modal", targetablePlayerIds);
                console.log(this.name + "(" + this.number + ") card has been played.");
            }
        }
    },
    createBaron: function () {
        return {
            name: "Baron",
            number: 3,
            description: "Guess a player's card. If you are correct, the player loses. (Can't guess 'guard')",
            action: function (socket, targetablePlayerIds) {
                socket.emit("render baron modal", targetablePlayerIds);
            }
        }
    },
    createHandmaid: function () {
        return {
            name: "Handmaid",
            number: 4,
            description: "You cannot be the target of any card's ability.",
            action: function (socket) {
                game.cardAction.handmaid(socket.id, "handmaid");
                console.log(this.name + "(" + this.number + ") card has been played.");
            }
        }
    },
    createPrince: function () {
        return {
            name: "Prince",
            number: 5,
            description: "Choose a player - he discards his card, then draws another. If he discarded the princess, he loses.",
            action: function (socket, targetablePlayerIds) {
                socket.emit("render prince modal", targetablePlayerIds);
                console.log(this.name + "(" + this.number + ") card has been played.");
            }
        }
    },
    createKing: function () {
        return {
            name: "King",
            number: 6,
            description: "Trade the card in your hand with the card held by another player of your choice.",
            action: function (socket, targetablePlayerIds) {
                socket.emit("render king modal", targetablePlayerIds);
            }
        }
    },
    createCountess: function () {
        return {
            name: "Countess",
            number: 7,
            description: "If you ever have the Countess and either the King or Prince in your hand, you must discard the Countess.",
            action: function (socket) {
                game.cardAction.countess(socket.id, "countess");
            }
        }
    },
    createPrincess: function () {
        return {
            name: "Princess",
            number: 8,
            description: "If you discard the princess for any reason, you lose!",
            action: function (socket) {
                game.cardAction.princess(socket.id, "princess");
                socket.emit("alert", "You played " + this.name + "(" + this.number + ") card. You're out!");
                console.log(this.name + "(" + this.number + ") card has been played.");
            }
        }
    }
};

////// Print cards
game.printCards = function () {
    // Create 5 guards
    for (var i = 0; i < 5; i++) {
        game.deck.cards.push(game.cardFactory.createGuard());
    };
    // Create 2 of each - priest, baron, handmaid, prince
    for (var i = 0; i < 2; i++) {
        game.deck.cards.push(game.cardFactory.createPriest());
        game.deck.cards.push(game.cardFactory.createBaron());
        game.deck.cards.push(game.cardFactory.createHandmaid());
        game.deck.cards.push(game.cardFactory.createPrince());
    };
    // Create 1 of each - king, countess, princess
    game.deck.cards.push(game.cardFactory.createKing());
    game.deck.cards.push(game.cardFactory.createCountess());
    game.deck.cards.push(game.cardFactory.createPrincess());
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• CARD ACTIONS ••••••••••••••••••••••••••••••••••••••••••••••••

game.cardAction = {};
game.cardAction.guard = function (targetPlayerId, targetCard, socketId) {
    var targetPlayer = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer = game.players.find(player => player.socketId === socketId),
        otherPlayers = game.players.filter(player => player.playerId !== targetPlayerId && player.socketId !== socketId);
    // If player has been eliminated
    if (targetPlayer.hand[0].name.toLowerCase() === targetCard) {
        // All other players
        for (var i=0; i < otherPlayers.length; i++) {
            io.to(otherPlayers[i].socketId).emit("alert", targetPlayer.name + " has been eliminated from the round by " + activePlayer.name + "'s Guard!")
        };
    ////// Messages
        // Eliminated player
        io.to(targetPlayer.socketId).emit("alert", "You have been eliminated by " + activePlayer.name + "'s Guard!");
        // Active player
        io.to(activePlayer.socketId).emit("alert", "You have eliminated " + targetPlayer.name + "!");
        game.eliminatePlayer(targetPlayer);
    } else {
        targetCard = targetCard[0].toUpperCase() + targetCard.substring(1);
        io.to(activePlayer.socketId).emit("alert", "Dang! " + game.players[targetPlayerId].name + " doesn't have a " + targetCard + " in his hand.");
    }
};

game.cardAction.priest = function (socketId, targetPlayerId) {
    var targetPlayer = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer = game.players.find(player => player.socketId === socketId);
    io.to(activePlayer.socketId).emit("render priest action", targetPlayer.hand[0].name);
    io.to(targetPlayer.socketId).emit("alert", activePlayer.name + " has used a Priest on you! He knows which card you have.");
};

game.cardAction.baron = function (activePlayer, targetPlayerId) {
    var targetPlayer = game.players.find(player => player.playerId === targetPlayerId),
        winner = null;

    if (!targetPlayer) {
        console.error("Target player not found!");
    }
    if (!activePlayer) {
        console.error("Active player not found!");
    }
    game.discardCard(activePlayer.socketId, "baron");
    // Find card that isn't baron
    activePlayerCard = activePlayer.hand[0];
    // Get target player's card
    targetPlayerCard = targetPlayer.hand[0];
    // If active player has two barons in hand, pick one of them
    if (activePlayerCard === undefined) {
        activePlayerCard = activePlayer.hand[0]
    }
    if (activePlayerCard.number > targetPlayerCard.number) {
        winner = activePlayer;
        game.eliminatePlayer(targetPlayer);
        io.sockets.emit("player eliminated", targetPlayer.playerId);
    }
    if (activePlayerCard.number < targetPlayerCard.number) {
        winner = targetPlayer;
        game.eliminatePlayer(activePlayer);
        io.sockets.emit("player eliminated", activePlayer.playerId);
    }
    if (activePlayerCard.number === targetPlayerCard.number) {
        winner = undefined;
    }
    if (winner !== undefined) {
        io.to(activePlayer.socketId).emit("render baron action", {cardName: targetPlayerCard.name, winner: winner.name});
        io.to(targetPlayer.socketId).emit("alert", activePlayer.name + " has used a Baron on you! His " + activePlayerCard.name + " fought against your " + targetPlayerCard.name + ". " + winner.name + " won.");
    } else {
        io.to(activePlayer.socketId).emit("render baron action", {cardName: targetPlayerCard.name, winner: undefined});
    }
    game.checkWinCondition();
};

game.cardAction.handmaid = function (socketId, cardName) {
    var immunePlayer = game.players.find(player => player.socketId === socketId);

    immunePlayer.immune = true;
    game.discardCard(socketId, cardName);
    io.sockets.emit("render player immune", immunePlayer.playerId);
    game.checkWinCondition();
};

game.cardAction.prince = function (socketId, targetPlayerId) {
    var targetPlayer         = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer         = game.players.find(player => player.socketId === socketId),
        otherPlayers         = game.players.filter(player => player.playerId !== targetPlayerId && player.socketId !== socketId),
        targetPlayerCardName = targetPlayer.hand[0].name.toLowerCase(),
        activePlayerCardName = activePlayer.hand.find(hand => hand.name.toLowerCase() === "prince").name.toLowerCase();

    // Active player discards his prince
    game.discardCard(activePlayer.socketId, activePlayerCardName);
    // If player targets himself
    if (targetPlayer === activePlayer) {
        console.log("Player targets himself");
        targetPlayerCardName = targetPlayer.hand[0].name.toLowerCase();
        activePlayer = targetPlayer;
    }
    // Targeted player discards his card
    game.discardCard(targetPlayer.socketId, targetPlayerCardName);
    // If princess, he is eliminated
    if (targetPlayerCardName === "princess") {
    ////// Messages
        // Eliminated player
        io.to(targetPlayer.socketId).emit("alert", "You have been eliminated by " + activePlayer.name + "'s Prince!");
        // Active player
        io.to(activePlayer.socketId).emit("alert", "You have eliminated " + targetPlayer.name + "!");
        // All other players
        for (var i=0; i < otherPlayers.length; i++) {
            io.to(otherPlayers[i].socketId).emit("alert", targetPlayer.name + " has been eliminated from the round by " + activePlayer.name + "'s Prince!")
        };
    ////// Render player elimination
        io.sockets.emit("player eliminated", targetPlayerId);
        targetPlayer.eliminated = true;
        game.eliminatePlayer(targetPlayer);
    // If not princess
    } else {
        // If no card left in deck, draw hidden card
        if (game.deck.cards.length === 0) {
            game.deck.drawHiddenCard(targetPlayer.socketId);
        } else {
        // Else draw a card from deck
            game.deck.drawCard(targetPlayer.socketId);
            game.render.drawCard(targetPlayer.socketId);
        }
    }
    game.render.deck();
    game.checkWinCondition();
};

game.cardAction.king = function (socketId, targetPlayerId) {
    var targetPlayer     = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer     = game.players.find(player => player.socketId === socketId),
        otherPlayers     = game.players.filter(player => player.playerId !== targetPlayerId && player.socketId !== socketId),
        targetPlayerCard = Object.assign({}, targetPlayer.hand[0]),
        activePlayerCard = Object.assign({}, activePlayer.hand.find(hand => hand.name.toLowerCase() !== "king")),
        activePlayerKing = activePlayer.hand.find(hand => hand.name.toLowerCase() === "king");

    // Active player discards the king card
    game.discardCard(activePlayer.socketId, activePlayerKing.name.toLowerCase());
    targetPlayer.hand[0] = activePlayerCard;
    activePlayer.hand[0] = targetPlayerCard;
    io.to(activePlayer.socketId).emit("render player hand", {playerHand: activePlayer.hand,  playerIndex: activePlayer.playerId});
    io.to(targetPlayer.socketId).emit("render player hand", {playerHand: targetPlayer.hand,  playerIndex: targetPlayer.playerId});
    io.to(targetPlayer.socketId).emit("alert", activePlayer.name + " has used the King on you! You switched cards.");
    game.checkWinCondition();
};

game.cardAction.countess = function (socketId, cardName) {
    game.discardCard(socketId, cardName)
    game.checkWinCondition();
}

game.cardAction.princess = function (socketId, cardName) {
    var eliminatedPlayer = game.players.find(player => player.socketId === socketId);

    game.discardCard(socketId, cardName);
    game.eliminatePlayer(eliminatedPlayer);
    io.sockets.emit("player eliminated", eliminatedPlayer.playerId);
    game.checkWinCondition();
};

game.eliminatePlayer = function (targetPlayer) {
    ////// Trigger rendering of player elimination
    io.sockets.emit("player eliminated", targetPlayer.playerId);
    targetPlayer.eliminated = true;
    if (targetPlayer.hand.length && targetPlayer.hand[0].name.toLowerCase() !== "princess") {
        // Place his card into his cards played area (reveal card)
        game.discardCard(targetPlayer.socketId, targetPlayer.hand[0].name.toLowerCase());
    }
    // Remove him from circle
    var playersNotEliminated = game.players.filter(player => !player.eliminated);
    for (i = 0; i < playersNotEliminated.length; i++) {
        playersNotEliminated[i].next = playersNotEliminated[(i+1)%playersNotEliminated.length];
    };
}

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE PLAYERS ••••••••••••••••••••••••••••••••••••••••••••••••••

////// Player class
game.Player = function (name, playerId) {
    return {
        name: name,
        score: 0,
        hand: [],
        cardsPlayed: [],
        cardsPlayedScore: 0,
        immune: false,
        eliminated: false,
        next: null,
        chairTaken: false,
        ready: false,
        playerId: playerId,
        socketId: ""
    };
};

////// Create [players]
game.createPlayers = function () {
    for (var i = 0; i < 4; i++) {
        var name     = "",
            playerId = i;
        game.players.push(game.Player(name, i));
    };
    // Create a linked list from game.players (set circular player order)
    for (i = 0; i < game.players.length; i++) {
        game.players[i].next = game.players[(i+1)%game.players.length];
    };
};

////// Set random first player (at game start only)
game.randomFirstPlayer = function () {
    // Pick first player at random
    game.currentPlayerIndex = Math.floor(Math.random() * Math.floor(4));
    game.currentPlayer = game.players[game.currentPlayerIndex];
    console.log("First player is:  Player " + (game.players[game.currentPlayerIndex].playerId + 1));
    // Trigger rendering of current player indicator
    game.render.playerIndicator(game.currentPlayerIndex);
    console.log(game.currentPlayerIndex);
};

////// Set name of a player
game.setPlayerName = function(playerName, socket) {
    // Find client's spot in array of players
    var player = game.players.find(player => player.socketId === socket.id);
    // If client is seated & his name isn't empty
    if (player !== undefined && playerName.length > 0) {
        player.name = playerName;
    }
    // If player's name is "empty"
    if (player !== undefined && playerName.length === 0) {
        player.name = "Player " + (player.playerId + 1);
    }
    // Send array of all player names to all clients
    var playerNames = game.players.map(function(players) {return players.name;});
    io.sockets.emit("player names", playerNames);
    console.log(playerNames);
    game.render.playerIndicator(game.currentPlayerIndex);
};

////// Assign chair to player (game.players[index])
game.sitPlayer = function (socket) {
    var socketId  = socket.id,
        freeChair = game.players.find(player => player.chairTaken === false);
    // Is there a free chair that isn't already taken by a player?
    if (freeChair !== undefined) {
        // Assign socketId to players[i].socketId
        freeChair.socketId = socketId;
        // Mark chair as taken
        freeChair.chairTaken = true;
    } else {
        // If no chair is free
        socket.emit("alert", "Sorry, the game is full! (all chairs are taken)");
    }
};

////// Set next player
game.setNextPlayer = function () {
    console.log("<!> NEXT PLAYER <!>");
    game.currentPlayer = game.currentPlayer.next;
    game.currentPlayerIndex = game.currentPlayer.playerId;
    game.render.playerIndicator(game.currentPlayerIndex);
    if (game.currentPlayer.immune) {
        game.currentPlayer.immune = false;
        io.sockets.emit("render player immune", game.currentPlayerIndex);
    }
};

////// Reset player objects for new round
game.resetPlayers = function () {
    // Reset scores if it's a new game
    if (game.players.filter(player => player.score === 4).length === 1) {
        for (var i=0; i < game.players.length; i++) {
            game.players[i].score = 0;
        };
    }
    // Empty hand, empty cards played, reset eliminated, immune and ready state
    for (var i=0; i < game.players.length; i++) {
        game.players[i].hand = [];
        game.players[i].cardsPlayed = [];
        game.players[i].eliminated = false;
        game.players[i].immune = false;
        game.players[i].ready = false;
    };
    // Reset circle at start of round
    for (i = 0; i < game.players.length; i++) {
        game.players[i].next = game.players[(i+1)%game.players.length];
    };
    // Set first player
    game.currentPlayer = game.players[game.currentPlayerIndex];
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE ACTIONS ••••••••••••••••••••••••••••••••••••••••••••••••••

////// Pick a random card from the deck
game.deck.randomCard = function(){
        return Math.round(Math.random() * Math.floor(this.cards.length - 1));
};

////// Hide a card from the deck
game.deck.pickHiddenCard = function(){
        // Choose random card from deck array
        var pickedCardIndex = game.deck.randomCard();
        // Copy it to hidden spot (edge case in game rules)
        game.hiddenCard = this.cards[pickedCardIndex];
        console.log(this.cards[pickedCardIndex].name + " will be hidden!");
        // Remove it from deck array
        this.cards.splice(pickedCardIndex,1);
        console.log(game.deck.cards.length);
};

////// Card dealing
game.dealer = function(playerIndex) {
    // If deck isn't empty
    if (game.deck.cards.length > 0) {
        // Choose random card from deck array
        var	randomCardIndex = game.deck.randomCard(),
            cardDrawn = game.deck.cards[randomCardIndex];
        // Copy it to target player's hand
        game.players[playerIndex].hand.push(cardDrawn);
        // Remove it from deck array
        game.deck.cards.splice(randomCardIndex,1);
    } else {
        console.error("DECK IS EMPTY! CAN'T GAME.DEALER!");
    }
    // Return card drawn
    return cardDrawn;
};

////// Deal a card to each player (start of round)
game.deck.dealCards = function () {
        // Deal a card to every player
        for (i=0; i < game.players.length; i++) {
            game.dealer(i);
        };
};

////// Player draws one card
game.deck.drawCard = function (socketId) {
    // Which player is drawing the card?
    var drawingPlayer = game.players.find(player => player.socketId === socketId);
    //  Draw the card
    game.dealer(drawingPlayer.playerId);
};

game.deck.drawHiddenCard = function (socketId) {
    // Which player is drawing the card?
    var activePlayer = game.players.find(player => player.socketId === socketId),
        hiddenCard = game.hiddenCard;
    // Copy it to target player's hand
    activePlayer.hand.push(hiddenCard);
    // Remove it from hidden space
    game.hiddenCard = null;
    // Render player's hand
    io.to(socketId).emit("render player hand", {playerHand: [hiddenCard], playerIndex: activePlayer.playerId});
    // Render hidden card removal
    io.sockets.emit("remove hidden card");
    return hiddenCard;
};

///// Move a card from hand to cards played area
game.discardCard = function (socketId, cardName) {
    var player       = game.players.find(player => player.socketId === socketId),
        cardIndex    = player.hand.findIndex(card => card.name.toLowerCase() === cardName.toLowerCase()),
        card         = player.hand[cardIndex];
    // Increase player.cardsplayedscore
    player.cardsPlayedScore += card.number;
    // Add card to player.cardsPlayed
    player.cardsPlayed.push(card);
    // Delete card from player.hand
    player.hand.splice(cardIndex, 1);
    // Render card
    game.render.discardCard(cardName, player.playerId);
    if (cardName.toLowerCase() === "princess") {
        player.eliminated = true;
        io.sockets.emit("player eliminated", player.playerId);
    }
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• RENDER CALLS •••••••••••••••••••••••••••••••••••••••••••••••••

game.render = {};
game.render.playerIndicator = function (playerIndex) {
    io.sockets.emit("render current player indicator", playerIndex);
};

////// Send players' cards and enemy indexes to each client for rendering
game.render.dealCards = function(socket) {
    var playerHandsArray = game.players.map(function(players) {return players.hand} );

    for (var i=0; i < game.players.length; i++) {
        var enemyIndexArray = [0,1,2,3];
        // First player has two cards in hand (add a copy of his index to the array)
        enemyIndexArray.push(game.currentPlayerIndex);
        // Filter out current player's index from array of indexes
        enemyIndexArray = enemyIndexArray.filter(function(value) {
            return value !== i;
        });
        // Send new hand array and their index to each player
        io.to(game.players[i].socketId).emit("render player hand", {playerHand: playerHandsArray[i], playerIndex: i});
        // Send enemy indexes[!i] to the player[i]
        io.to(game.players[i].socketId).emit("render enemy hands", enemyIndexArray);
    };
};

// Send drawn card to player and his index to each other client for rendering
game.render.drawCard = function(socketId) {
    var playerHandsArray = game.players.map(function(players) {return players.hand;}),
        enemyIndexArray  = [0,1,2,3],
        targetPlayerId   = game.players.find(player => player.socketId === socketId).playerId;
    // Send new hand array and his index to current player
    io.to(socketId).emit("render player hand", {playerHand: playerHandsArray[targetPlayerId], playerIndex: targetPlayerId});
    // Filter out current player's index from array of indexes
    enemyIndexArray = enemyIndexArray.filter(function(value) {
        return value !== targetPlayerId;
    });
    for (var i=0; i < enemyIndexArray.length; i++) {
        // Send enemy index to all other clients
        io.to(game.players[enemyIndexArray[i]].socketId).emit("render enemy hands", targetPlayerId);
    };
};
game.render.discardCard = function (cardName, playerIndex) {
    io.sockets.emit("card discarded", {cardName: cardName, playerIndex: playerIndex});
};
game.render.deck = function () {
    var deckSize = game.deck.cards.length,
        tooltip  = "Cards left in deck: " + game.deck.cards.length;
    // Send deck size & "cards left" to all clients
    io.sockets.emit("render deck", {deckSize: deckSize, tooltip: tooltip});
};
game.render.showAllCards = function (showAllCardsArray) {
    io.sockets.emit("render all cards", showAllCardsArray);
};


// ••••••••••••••••••••••••••••••••••••••••••••••••••••• GAME STATE •••••••••••••••••••••••••••••••••••••••••••••••••

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
game.checkWinCondition = function (socketId, cardName) {
    var playersNotEliminated = game.players.filter(player => !player.eliminated),
        winningPlayer        = null;
    // Check if only one player is left in the round
    if (playersNotEliminated.length === 1) {
        var winningPlayerIndex = playersNotEliminated[0].playerId;
        winningPlayer = playersNotEliminated[0];
        game.currentPlayerIndex = winningPlayerIndex;
        game.render.playerIndicator(game.currentPlayerIndex);
        ++winningPlayer.score;
        // Render round winner
        io.sockets.emit("alert", playersNotEliminated[0].name + " wins the round! Last player standing!");
        // Set score
        io.sockets.emit("render score", winningPlayer.playerId);
        game.roundEnded = true;
    } else {
        // Check if deck is empty & more than 1 player is left in the round
        if (game.deck.cards.length === 0) {
            // Compare cards of all players
            var playerHandsArray   = playersNotEliminated.map(player => { return [player.hand[0], player.playerId] }),
                highestCard        = playerHandsArray[0][0],
                tiedPlayers        = [],
                winningPlayerIndex = playerHandsArray[0][1];
            // Find the highest card & owner's index
            for (var i=1; i < playerHandsArray.length; i++) {
                if (highestCard.number < playerHandsArray[i][0].number) {
                    highestCard = playerHandsArray[i][0];
                    winningPlayerIndex = playerHandsArray[i][1];
                }
            };
            // Place all players with the highest card in hand into tiedplayers array
            var tiedPlayers     = playersNotEliminated.filter(player => player.hand[0].number === highestCard.number),
                playerScores    = tiedPlayers.map(player => player.cardsPlayedScore),
                playerHighScore = 0;
            // If there is only one winner (highest card)
            if (tiedPlayers.length === 1) {
                var winningPlayer = tiedPlayers[0];
                game.currentPlayerIndex = winningPlayer.playerId;
                game.render.playerIndicator(game.currentPlayerIndex);
                ++winningPlayer.score;
                // Render round winner
                io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card! (" + highestCard.name + "(" + highestCard.number + "))");
                // Set score
                io.sockets.emit("render score", winningPlayer.playerId);
                game.roundEnded = true;
            // If more than one player has highest card in hand
            } else {
                // Find highest cards played score
                playerHighScore = Math.max(...playerScores);
                // Make array of all players with highest cards played score
                tiedPlayers = tiedPlayers.filter(player => player.cardsPlayedScore === playerHighScore);
                // If more than one player has highest cards played score
                if (tiedPlayers.length > 1) {
                    // Emit message
                    io.sockets.emit("alert", "Tie! No point given.");
                    // Both winners toss a coin for first player
                    game.currentPlayerIndex = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)].playerId;
                    game.render.playerIndicator(game.currentPlayerIndex);
                    game.roundEnded = true;
                // If only one player has highest cards score
                } else {
                    winningPlayer = tiedPlayers[0];
                    // If there is no tie in cards played value
                    io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card and higher cards played! (" + highestCard.name + "(" + highestCard.number + "))");
                    game.currentPlayerIndex = winningPlayer.playerId;
                    // Set score
                    ++winningPlayer.score;
                    io.sockets.emit("render score", winningPlayer.playerId);
                    game.render.playerIndicator(winningPlayer.playerId);
                    game.roundEnded = true;
                }
            }
        }
    }
    // Check if round is over
    if (game.roundEnded) {
        game.revealAllCards();
        var gameWinner = game.players.filter(player => player.score === 4);
        // Check scores
        if (gameWinner.length === 1) {
            // Declare winner & end game
            io.sockets.emit("alert", gameWinner[0].name + " wins the game!");
            // Offer new game
            io.sockets.emit("confirm new game");
        // If no winner
        } else {
            // Offer new round
            io.sockets.emit("confirm next round");
        }
    } else {
    game.setNextPlayer();
    }
};

game.revealAllCards = function () {
    var playersNotEliminated = game.players.filter(player => !player.eliminated),
        playerHandsArray     = playersNotEliminated.map(function(players) { return players.hand[0] }),
        showAllCardsArray    = [];

    for (var i=0; i < playerHandsArray.length; i++) {
        showAllCardsArray[i] = [playerHandsArray[i], playersNotEliminated[i].playerId];
    };
    // If all cards have been played / deck is empty then add hidden card
    if (game.deck.cards.length === 0 && game.hiddenCard != null) {
        showAllCardsArray.push(game.hiddenCard.name.toLowerCase());
    }
    // Render (reveal) all cards at end of round
    game.render.showAllCards(showAllCardsArray);
};

game.playersReady = function (socket) {
    var player = game.players.find(player => player.socketId === socket.id);
    player.ready = true;
    var playersNotReady = game.players.filter(player => player.ready === false);

    if (playersNotReady.length === 0) {
        if (game.players.filter(player => player.score === 4).length === 1) {
            game.startNewGame();
            io.sockets.emit("new game");
        } else {
            game.startNewRound();
            io.sockets.emit("new round");
        }
        game.roundStart = true;
    }
};

game.init();



