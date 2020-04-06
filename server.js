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
// Start the server.
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
        if (socket.id === game.currentPlayer.socketId) {
            var handSize = game.currentPlayer.hand.length,
                deckSize = game.deck.cards.length;
            // IF IT IS THE START OF THE ROUND
            if (game.roundStart && deckSize === 16) {
                // TAKE A CARD FROM THE DECK AND HIDE IT
                game.deck.pickHiddenCard();
                // RENDER THE HIDDEN CARD
                io.sockets.emit("render hidden card");
                // DEAL 1 CARD TO EACH PLAYER
                game.deck.dealCards();
                // DRAW 2nd CARD
                game.deck.drawCard(socket.id);
                // RENDER HANDS OF ALL PLAYERS
                game.render.dealCards(socket);
                // RENDER DECK
                game.render.deck();
                game.roundStart = false;
            } else {
                // IF PLAYER HAS LESS THAN 2 CARDS IN HAND
                if (handSize === 1 || handSize === 0) {
                    game.deck.drawCard(socket.id);
                    game.render.drawCard(socket.id);
                    game.render.deck();
                }
                if (handSize === 2) {
                    // IF PLAYER HAS 2 CARDS IN HAND
                    socket.emit("alert", "You already have 2 cards in hand. Play a card!");
                }
                    // THROW ERROR IF HANDSIZE IS WEIRD
                if (handSize > 2 || handSize < 0 || handSize === undefined) {
                    socket.emit("alert", "ERROR: game.currentPlayer.hand.length = " + game.currentPlayer.hand.length);
                }
            }
        } else {
            // IF IT'S NOT THE PLAYER'S TURN
            socket.emit("alert", "It's not your turn, peasant!");
        }
    });
/////////////// CARD ACTIONS //////////// //////////// CARD ACTIONS //////////// //////////// CARD ACTIONS ///////////////
////// HANDLE PLAYER'S CLICK ON A CARD IN HIS HAND
    socket.on("card click", function(cardName) {
        ////// HANDLE PLAYER'S CLICK ON A CARD
        var	activePlayer 		 = game.players.find(player => player.socketId === socket.id),
            activePlayerHand 	 = activePlayer.hand.map(card => card.number),
            targetablePlayers	 = game.players.filter(player => !player.eliminated && !player.immune && player.playerId !== activePlayer.playerId),
            targetablePlayerIds  = targetablePlayers.map(player => player.playerId),
            cardPlayed 		     = activePlayer.hand.find(hand => hand.name.toLowerCase() === cardName);
        if (activePlayer.hand.length === 2) {
            if (targetablePlayers.length === 0 && cardName !== "prince" && cardName !== "handmaid" && cardName !== "countess" && cardName !== "princess") {
                socket.emit("alert", "All players are either immune or eliminated! No action taken, card discarded.");
                game.discardCard(socket.id, cardName);
                game.checkWinCondition();
            } else {
                var allowPlay = true;
                // WHICH CARD WAS CLICKED
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


////// GUARD CARD
    socket.on("guard action", function(object) {
        var targetPlayerId = object.targetPlayerId,
            targetCard = object.targetCard,
            activePlayer = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.guard(targetPlayerId, targetCard, socket.id);
            game.discardCard(socket.id, "guard");
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
        game.checkWinCondition();
    });
////// PRIEST CARD
    socket.on("priest action", function(targetPlayerId) {
        var	activePlayer = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.priest(socket.id, targetPlayerId);
            game.discardCard(socket.id, "priest");
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
    });
////// PRIEST CARD ACTION END TRIGGER
    socket.on("priest card discarded", function() {
        game.checkWinCondition();
    });
////// BARON CARD
    socket.on("baron action", function(targetPlayerId){
        var	activePlayer = game.players.find(player => player.socketId === socket.id);
        if (activePlayer.hand.length === 2) {
            game.cardAction.baron(activePlayer, targetPlayerId);
        } else {
            socket.emit("alert", "You need to draw a card first!");
        }
    });
////// PRINCE CARD
    socket.on("prince action", function(targetPlayerId) {
        game.cardAction.prince(socket.id, targetPlayerId);
    });
////// KING CARD
    socket.on("king action", function(targetPlayerId) {
        game.cardAction.king(socket.id, targetPlayerId);
    });


/////////////// CARD ACTIONS END //////////// //////////// CARD ACTIONS END //////////// //////////// CARD ACTIONS END ///////////////


////// HANDLE PLAYER'S READY BUTTON CLICK
    socket.on("player ready", function() {
        game.playersReady(socket);
    });

////// PLAYER LEAVES
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

////// PRINT CARDS
game.printCards = function () {
    // CREATE 5 GUARDS
    for (var i = 0; i < 5; i++) {
        game.deck.cards.push(game.cardFactory.createGuard());
    };
    // // CREATE 2 OF EACH - PRIEST, BARON, HANDMAID, PRINCE
    for (var i = 0; i < 2; i++) {
        game.deck.cards.push(game.cardFactory.createPriest());
        game.deck.cards.push(game.cardFactory.createBaron());
        game.deck.cards.push(game.cardFactory.createHandmaid());
        game.deck.cards.push(game.cardFactory.createPrince());
    };
    // // CREATE 1 OF EACH - KING, COUNTESS, PRINCESS
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
    // IF PLAYER HAS BEEN ELIMINATED
    if (targetPlayer.hand[0].name.toLowerCase() === targetCard) {
        // ALL OTHER PLAYERS
        for (var i=0; i < otherPlayers.length; i++) {
            io.to(otherPlayers[i].socketId).emit("alert", targetPlayer.name + " has been eliminated from the round by " + activePlayer.name + "'s Guard!")
        };
    ////// MESSAGES
        // ELIMINATED PLAYER
        io.to(targetPlayer.socketId).emit("alert", "You have been eliminated by " + activePlayer.name + "'s Guard!");
        // ACTIVE PLAYER
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

    if (!targetPlayer)	{
        console.error("Target player not found!");
    }

    if (!activePlayer)	{
        console.error("Active player not found!");
    }
    game.discardCard(activePlayer.socketId, "baron");
    // FIND CARD THAT ISN'T BARON
    activePlayerCard = activePlayer.hand[0];
    // GET TARGET PLAYER'S CARD
    targetPlayerCard = targetPlayer.hand[0];
    // IF ACTIVE PLAYER HAS TWO BARONS IN HAND, PICK ONE OF THEM
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
    var targetPlayer = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer = game.players.find(player => player.socketId === socketId),
        otherPlayers = game.players.filter(player => player.playerId !== targetPlayerId && player.socketId !== socketId),
        targetPlayerCardName = targetPlayer.hand[0].name.toLowerCase(),
        activePlayerCardName = activePlayer.hand.find(hand => hand.name.toLowerCase() === "prince").name.toLowerCase();

    // ACTIVE PLAYER DISCARDS HIS PRINCE
    game.discardCard(activePlayer.socketId, activePlayerCardName);

    // IF PLAYER TARGETS HIMSELF
    if (targetPlayer === activePlayer) {
        console.log("Player targets himself");
        targetPlayerCardName = targetPlayer.hand[0].name.toLowerCase();
        activePlayer = targetPlayer;
    }
    // TARGETED PLAYER DISCARDS HIS CARD
    game.discardCard(targetPlayer.socketId, targetPlayerCardName);
    // IF PRINCESS, HE IS ELIMINATED
    if (targetPlayerCardName === "princess") {
    ////// MESSAGES
        // ELIMINATED PLAYER
        io.to(targetPlayer.socketId).emit("alert", "You have been eliminated by " + activePlayer.name + "'s Prince!");
        // ACTIVE PLAYER
        io.to(activePlayer.socketId).emit("alert", "You have eliminated " + targetPlayer.name + "!");
        // ALL OTHER PLAYERS
        for (var i=0; i < otherPlayers.length; i++) {
            io.to(otherPlayers[i].socketId).emit("alert", targetPlayer.name + " has been eliminated from the round by " + activePlayer.name + "'s Prince!")
        };
    ////// RENDER PLAYER ELIMINATION
        io.sockets.emit("player eliminated", targetPlayerId);
        targetPlayer.eliminated = true;
        game.eliminatePlayer(targetPlayer);
    // IF NOT PRINCESS
    } else {
        // IF NO CARD LEFT IN DECK, DRAW HIDDEN CARD
        if (game.deck.cards.length === 0) {
            game.deck.drawHiddenCard(targetPlayer.socketId);
        } else {
        // ELSE DRAW A CARD FROM DECK
            game.deck.drawCard(targetPlayer.socketId);
            game.render.drawCard(targetPlayer.socketId);
        }
    }
    game.render.deck();
    game.checkWinCondition();
};

game.cardAction.king = function (socketId, targetPlayerId) {
    var targetPlayer = game.players.find(player => player.playerId === targetPlayerId),
        activePlayer = game.players.find(player => player.socketId === socketId),
        otherPlayers = game.players.filter(player => player.playerId !== targetPlayerId && player.socketId !== socketId),
        targetPlayerCard = Object.assign({}, targetPlayer.hand[0]),
        activePlayerCard = Object.assign({}, activePlayer.hand.find(hand => hand.name.toLowerCase() !== "king")),
        activePlayerKing = activePlayer.hand.find(hand => hand.name.toLowerCase() === "king");
    // ACTIVE PLAYER DISCARDS THE KING CARD
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
    ////// TRIGGER RENDERING OF PLAYER ELIMINATION
    io.sockets.emit("player eliminated", targetPlayer.playerId);
    targetPlayer.eliminated = true;
    if (targetPlayer.hand.length && targetPlayer.hand[0].name.toLowerCase() !== "princess") {
        // PLACE HIS CARD INTO HIS CARDS PLAYED AREA (REVEAL CARD)
        game.discardCard(targetPlayer.socketId, targetPlayer.hand[0].name.toLowerCase());
    }
    // REMOVE HIM FROM CIRCLE
    var playersNotEliminated = game.players.filter(player => !player.eliminated);
    for (i = 0; i < playersNotEliminated.length; i++) {
        playersNotEliminated[i].next = playersNotEliminated[(i+1)%playersNotEliminated.length];
    };
}

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE PLAYERS ••••••••••••••••••••••••••••••••••••••••••••••••••

////// PLAYER CLASS
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
    console.log(game.currentPlayerIndex);
};

////// SET NAME OF A PLAYER
game.setPlayerName = function(playerName, socket) {
    // FIND CLIENT'S SPOT IN ARRAY OF PLAYERS
    var player = game.players.find(player => player.socketId === socket.id);
    // IF CLIENT IS SEATED & HIS NAME ISN'T EMPTY
    if (player !== undefined && playerName.length > 0) {
        player.name = playerName;
    }
    // IF PLAYER'S NAME IS "EMPTY"
    if (player !== undefined && playerName.length === 0) {
        player.name = "Player " + (player.playerId + 1);
    }
    // SEND ARRAY OF ALL PLAYER NAMES TO ALL CLIENTS
    var playerNames = game.players.map(function(players) {return players.name;});
    io.sockets.emit("player names", playerNames);
    console.log(playerNames);
    game.render.playerIndicator(game.currentPlayerIndex);
};

////// ASSIGN CHAIR TO PLAYER (GAME.PLAYERS[INDEX])
game.sitPlayer = function (socket) {
    var socketId = socket.id;
    // FIND A FREE CHAIR
    var freeChair = game.players.find(player => player.chairTaken === false);
    // IS THERE A CHAIR THAT ISN'T ALREADY TAKEN BY A PLAYER?
    if (freeChair !== undefined) {
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
    console.log("<!> NEXT PLAYER <!>");
    game.currentPlayer = game.currentPlayer.next;
    game.currentPlayerIndex = game.currentPlayer.playerId;
    game.render.playerIndicator(game.currentPlayerIndex);
    if (game.currentPlayer.immune) {
        game.currentPlayer.immune = false;
        io.sockets.emit("render player immune", game.currentPlayerIndex);
    }
};

////// RESET PLAYER OBJECTS FOR NEW ROUND
game.resetPlayers = function () {

    // RESET SCORES IF IT'S A NEW GAME
    if (game.players.filter(player => player.score === 4).length === 1) {
        for (var i=0; i < game.players.length; i++) {
            game.players[i].score = 0;
        };
    }
    // EMPTY HAND, EMPTY CARDS PLAYED, RESET ELIMINATED, IMMUNE AND READY STATE
    for (var i=0; i < game.players.length; i++) {
        game.players[i].hand = [];
        game.players[i].cardsPlayed = [];
        game.players[i].eliminated = false;
        game.players[i].immune = false;
        game.players[i].ready = false;
    };
    // RESET CIRCLE AT START OF ROUND
    for (i = 0; i < game.players.length; i++) {
        game.players[i].next = game.players[(i+1)%game.players.length];
    };
    // SET FIRST PLAYER
    game.currentPlayer = game.players[game.currentPlayerIndex];
};

//•••••••••••••••••••••••••••••••••••••••••••••••••••• THE ACTIONS ••••••••••••••••••••••••••••••••••••••••••••••••••

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
        console.log(game.deck.cards.length);
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
    }
    // RETURN CARD DRAWN
    return cardDrawn;
};

////// DEAL A CARD TO EACH PLAYER (start of round)
game.deck.dealCards = function () {
        // DEAL A CARD TO EVERY PLAYER
        for (i=0; i < game.players.length; i++) {
            // DEAL CARD
            game.dealer(i);
        };
};

////// PLAYER DRAWS ONE CARD
game.deck.drawCard = function (socketId) {
    // WHICH PLAYER IS DRAWING THE CARD?
    var drawingPlayer = game.players.find(player => player.socketId === socketId);
    //  DRAW THE CARD
    game.dealer(drawingPlayer.playerId);
};

game.deck.drawHiddenCard = function (socketId) {
    // WHICH PLAYER IS DRAWING THE CARD?
    var activePlayer = game.players.find(player => player.socketId === socketId),
        hiddenCard = game.hiddenCard;
    // COPY IT TO TARGET PLAYER'S HAND
    activePlayer.hand.push(hiddenCard);
    // REMOVE IT FROM HIDDEN SPACE
    game.hiddenCard = null;
    // RENDER PLAYER'S HAND
    io.to(socketId).emit("render player hand", {playerHand: [hiddenCard], playerIndex: activePlayer.playerId});
    // RENDER HIDDEN CARD REMOVAL
    io.sockets.emit("remove hidden card");
    return hiddenCard;
};

///// MOVE A CARD FROM HAND TO CARDS PLAYED AREA
game.discardCard = function (socketId, cardName) {
    var player 		 = game.players.find(player => player.socketId === socketId),
        cardIndex    = player.hand.findIndex(card => card.name.toLowerCase() === cardName.toLowerCase()),
        card 		 = player.hand[cardIndex];
    // INCREASE player.cardsPlayedScore
    player.cardsPlayedScore += card.number;
    // ADD CARD TO player.cardsPlayed
    player.cardsPlayed.push(card);
    // DELETE CARD FROM player.hand
    player.hand.splice(cardIndex, 1);
    // RENDER CARD
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

////// SEND PLAYERS' CARDS AND ENEMY INDEXES TO EACH CLIENT FOR RENDERING
game.render.dealCards = function(socket) {
    var playerHandsArray = game.players.map(function(players) {return players.hand;});
    for (var i=0; i < game.players.length; i++) {
        var enemyIndexArray = [0,1,2,3];
        // FIRST PLAYER HAS TWO CARDS IN HAND (add a copy of his index to the array)
        enemyIndexArray.push(game.currentPlayerIndex);
        // FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
        enemyIndexArray = enemyIndexArray.filter(function(value) {
            return value !== i;
        });
        // SEND NEW HAND ARRAY AND THEIR INDEX TO EACH PLAYER
        io.to(game.players[i].socketId).emit("render player hand", {playerHand: playerHandsArray[i], playerIndex: i});
        // SEND ENEMY INDEXES[!i] TO THE PLAYER[i]
        io.to(game.players[i].socketId).emit("render enemy hands", enemyIndexArray);
    };
};

// SEND DRAWN CARD TO PLAYER AND HIS INDEX TO EACH OTHER CLIENT FOR RENDERING
game.render.drawCard = function(socketId) {
    var playerHandsArray = game.players.map(function(players) {return players.hand;}),
        enemyIndexArray  = [0,1,2,3],
        targetPlayerId = game.players.find(player => player.socketId === socketId).playerId;
    // SEND NEW HAND ARRAY AND HIS INDEX TO CURRENT PLAYER
    io.to(socketId).emit("render player hand", {playerHand: playerHandsArray[targetPlayerId], playerIndex: targetPlayerId});
    // FILTER OUT CURRENT PLAYER'S INDEX FROM ARRAY OF INDEXES
    enemyIndexArray = enemyIndexArray.filter(function(value) {
        return value !== targetPlayerId;
    });
    for (var i=0; i < enemyIndexArray.length; i++) {
        // SEND ENEMY INDEX TO ALL OTHER CLIENTS
        io.to(game.players[enemyIndexArray[i]].socketId).emit("render enemy hands", targetPlayerId);
    };
};
game.render.discardCard = function (cardName, playerIndex) {
    io.sockets.emit("card discarded", {cardName: cardName, playerIndex: playerIndex});
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
        winningPlayer 		 = null;
    // CHECK IF ONLY ONE PLAYER IS LEFT IN THE ROUND
    if (playersNotEliminated.length === 1) {
        var winningPlayerIndex = playersNotEliminated[0].playerId;
        winningPlayer = playersNotEliminated[0];
        game.currentPlayerIndex = winningPlayerIndex;
        game.render.playerIndicator(game.currentPlayerIndex);
        ++winningPlayer.score;
        // RENDER ROUND WINNER
        io.sockets.emit("alert", playersNotEliminated[0].name + " wins the round! Last player standing!");
        // SET SCORE
        io.sockets.emit("render score", winningPlayer.playerId);
        game.roundEnded = true;
    } else {
        // CHECK IF DECK IS EMPTY & MORE THAN 1 PLAYER IS LEFT IN THE ROUND
        if (game.deck.cards.length === 0) {
            // COMPARE CARDS OF ALL PLAYERS
            var playerHandsArray = playersNotEliminated.map(player => { return [player.hand[0], player.playerId] }),
                highestCard = playerHandsArray[0][0],
                tiedPlayers = [],
                winningPlayerIndex = playerHandsArray[0][1];
            // FIND THE HIGHEST CARD & OWNER'S INDEX
            for (var i=1; i < playerHandsArray.length; i++) {
                if (highestCard.number < playerHandsArray[i][0].number) {
                    highestCard = playerHandsArray[i][0];
                    winningPlayerIndex = playerHandsArray[i][1];
                }
            };
            // PLACE ALL PLAYERS WITH THE HIGHEST CARD IN HAND INTO tiedPlayers ARRAY
            var tiedPlayers 	= playersNotEliminated.filter(player => player.hand[0].number === highestCard.number),
                playerScores 	= tiedPlayers.map(player => player.cardsPlayedScore),
                playerHighScore = 0;
            // IF THERE IS ONLY ONE WINNER (HIGHEST CARD)
            if (tiedPlayers.length === 1) {
                var winningPlayer = tiedPlayers[0];
                game.currentPlayerIndex = winningPlayer.playerId;
                game.render.playerIndicator(game.currentPlayerIndex);
                ++winningPlayer.score;
                // RENDER ROUND WINNER
                io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card! (" + highestCard.name + "(" + highestCard.number + "))");
                // SET SCORE
                io.sockets.emit("render score", winningPlayer.playerId);
                game.roundEnded = true;
            // IF MORE THAN ONE PLAYER HAS HIGHEST CARD IN HAND
            } else {
                // FIND HIGHEST CARDS PLAYED SCORE
                playerHighScore = Math.max(...playerScores);
                // MAKE ARRAY OF ALL PLAYERS WITH HIGHEST CARDS PLAYED SCORE
                tiedPlayers = tiedPlayers.filter(player => player.cardsPlayedScore === playerHighScore);
                // IF MORE THAN ONE PLAYER HAS HIGHEST CARDS PLAYED SCORE
                if (tiedPlayers.length > 1) {
                    // EMIT MESSAGE
                    io.sockets.emit("alert", "Tie! No point given.");
                    // BOTH WINNERS TOSS A COIN FOR FIRST PLAYER
                    game.currentPlayerIndex = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)].playerId;
                    game.render.playerIndicator(game.currentPlayerIndex);
                    game.roundEnded = true;
                // IF ONLY ONE PLAYER HAS HIGHEST CARDS SCORE
                } else {
                    winningPlayer = tiedPlayers[0];
                    // IF THERE IS NO TIE IN CARDS PLAYED VALUE
                    io.sockets.emit("alert", winningPlayer.name + " wins the round! Highest card and higher cards played! (" + highestCard.name + "(" + highestCard.number + "))");
                    game.currentPlayerIndex = winningPlayer.playerId;
                    // SET SCORE
                    ++winningPlayer.score;
                    io.sockets.emit("render score", winningPlayer.playerId);
                    game.render.playerIndicator(winningPlayer.playerId);
                    game.roundEnded = true;
                }
            }
        }
    }
    // CHECK IF ROUND IS OVER
    if (game.roundEnded) {
        game.revealAllCards();
        var gameWinner = game.players.filter(player => player.score === 4);
        // CHECK SCORES
        if (gameWinner.length === 1) {
            // DECLARE WINNER & END GAME
            io.sockets.emit("alert", gameWinner[0].name + " wins the game!");
            // OFFER NEW GAME
            io.sockets.emit("confirm new game");
        // IF NO WINNER
        } else {
            // OFFER NEW ROUND
            io.sockets.emit("confirm next round");
        }
    } else {
    game.setNextPlayer();
    }
};

game.revealAllCards = function () {
    var playersNotEliminated = game.players.filter(player => !player.eliminated),
        playerHandsArray = playersNotEliminated.map(function(players) { return players.hand[0] }),
        showAllCardsArray = [];
    for (var i=0; i < playerHandsArray.length; i++) {
        showAllCardsArray[i] = [playerHandsArray[i], playersNotEliminated[i].playerId];
    };
    // IF ALL CARDS HAVE BEEN PLAYED / DECK IS EMPTY THEN ADD HIDDEN CARD
    if (game.deck.cards.length === 0 && game.hiddenCard != null) {
        showAllCardsArray.push(game.hiddenCard.name.toLowerCase());
    }
    // RENDER (REVEAL) ALL CARDS AT END OF ROUND
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



