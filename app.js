/*
credit to OpenJS Foundation (https://nodejs.org/) for node.js environment
credit to Kyle Stetz for the Sentencer module (https://kylestetz.github.io/Sentencer/)
credit to socket.io for the networking module (https://socket.io)
credit to Processing Foundation and Lauren McCarthy (https://p5js.org/) for p5.js module
credit to SweetAlert2 for the alert library (https://sweetalert2.github.io/)
credit to Material Design Lite and Google for the styled elements (https://getmdl.io/)
credit to The jQuery Foundation for the jQuery all-purpose library (https://jquery.com/)
 */




//==============================SERVER CODE=====================================\\




var app = require('http').createServer(response); //http server module. part of node.js
var fs = require('fs'); //filesystem module. part of node.js
var io = require('socket.io')(app); //socket.io module
var sentencer = require('sentencer') //for suggesting topics
var ids = [] //list of socket ids
var games = [] //list of games
var sockets = [] //list of connected sockets


async function response(req, res) {
    /*
    This function handles incoming HTTP requests and returns data
     */
    var file = "";
    if (req.url === "/" || req.url.slice(0, 5) === "/join") {
        file = __dirname + "/index.html"
    } else if (req.url === "/app.js") {
        file = __dirname + "/no.txt"
    }  else {
        file = __dirname + req.url;
    }


    fs.readFile(file,
        function (err, data) {
            if (err) {
                res.writeHead(404);
                return res.end('Page or file not found');
            }
            //set the correct MIME type
            if (req.url.substr(-3) === ".js") {
                res.setHeader("Content-Type", "text/javascript")
            } else if (req.url.substr(-4) === ".css") {
                res.setHeader("Content-Type", "text/css")
            }

            res.writeHead(200);

            res.end(data);
        }
    );

}
//start http server on port 3000 or process port for Heroku
app.listen(process.env.PORT || 3000);
console.log("Listening on port 3000")
//on a connection, what do we do
io.on('connection', function (socket) {
    sockets.push(socket)
    ids.push(socket.id)
    socket.on('disconnect', function () {
        //when the client has disconnected (tab closed, refreshed, etc)
        //try and get the game they were in
        var game = getGameBySocketId(socket.id)
        if (game) {
            var player = getPlayerById(socket.id)
            //handle the player leaving
            if (game.inGame) {
                gameEmit(game, "alert", player.username + " left. Party's over.")
                games.splice(games.indexOf(game), 1)
            } else {
                if (player.team === "judge") {
                    gameEmit(game, "alert", "Host left the game, reloading...")
                    games.splice(games.indexOf(game), 1)
                } else if (game["team" + player.team].p1.id === player.id) {
                    game["team" + player.team].p1 = {}
                    gameEmit(game, "joinedGame", game)
                    gameEmit(game, "chatUpdate", player.username + " left the game.")
                } else {
                    game["team" + player.team].p2 = {}
                    gameEmit(game, "joinedGame", game)
                    gameEmit(game, "chatUpdate", player.username + " left the game.")
                }
            }
        }
    });
    socket.on("gamemsg", function (msg, callback) {
        //game chat handler
        var game = getGameBySocketId(socket.id)
        if (game && msg !== "" && msg !== "/me") {
            var player = getPlayerById(socket.id)
            if (msg === "left" || msg === "right" && player.team === "judge" && game.right !== 0 && game.left !== 0) {
                if (msg === "left") {
                    game["team" + game.left].score++
                    gameEmit(game, "chatUpdate", "Team " + game.left + " won the round!")
                    gameEmit(game, "chatUpdate", "Team 1 (" + game.team1.p1.username + " and " + game.team1.p2.username + ") score: " + game.team1.score)
                    gameEmit(game, "chatUpdate", "Team 2 (" + game.team2.p1.username + " and " + game.team2.p2.username + ") score: " + game.team2.score)
                    gameEmit(game, "chatUpdate", "Rounds remaining: " + (game.maxRound - game.round + 1))
                    io.to(`${game["team" + game.left].p1.id}`).emit("alert", "Your team won the round!")
                    io.to(`${game["team" + game.left].p2.id}`).emit("alert", "Your team won the round!")
                    game.left = 0
                    game.right = 0
                } else {
                    game["team" + game.right].score++
                    gameEmit(game, "chatUpdate", "Team " + game.right + " won the round!")
                    gameEmit(game, "chatUpdate", "Team 1 (" + game.team1.p1.username + " and " + game.team1.p2.username + ") score: " + game.team1.score)
                    gameEmit(game, "chatUpdate", "Team 2 (" + game.team2.p1.username + " and " + game.team2.p2.username + ") score: " + game.team2.score)
                    gameEmit(game, "chatUpdate", "Rounds remaining: " + (game.maxRound - game.round + 1))
                    io.to(`${game["team" + game.right].p1.id}`).emit("alert", "Your team won the round!")
                    io.to(`${game["team" + game.right].p2.id}`).emit("alert", "Your team won the round!")
                    game.left = 0
                    game.right = 0
                }
                game.readyNextRound = true
                if (game.round > game.maxRound) {
                    if (game.team1.score > game.team2.score) {
                        gameEmit(game, "alert", {
                            title: "Team 1 wins!",
                            html: "Team 1 score: " + game.team1.score + "<br>Team 2 score: " + game.team2.score + "<br>Refresh to play again!"
                        })
                    } else if (game.team2.score > game.team1.score) {
                        gameEmit(game, "alert", {
                            title: "Team 2 wins!",
                            html: "Team 1 score: " + game.team1.score + "<br>Team 2 score: " + game.team2.score + "<br>Refresh to play again!"
                        })
                    } else {
                        //we shouldn't get here ever, but just in case...
                        gameEmit(game, "alert", {
                            title: "Tie!",
                            html: "Team 1 score: " + game.team1.score + "<br>Team 2 score: " + game.team2.score + "<br>Refresh to play again!"
                        })
                    }
                    games.splice(games.indexOf(game), 1)
                }
            } else {
                var filteredmsg = msg.slice(0, 200)
                filteredmsg = filteredmsg.replace(/\</g, "&lt;");
                filteredmsg = filteredmsg.replace(/\>/g, "&gt;");

                if (filteredmsg.slice(0, 3) === "/me") {
                    filteredmsg = "<i><b>" + player.username + "</b> " + filteredmsg.slice(3) + "</i>"
                } else {
                    filteredmsg = "<b>" + player.username + ":</b> " + filteredmsg;
                }
                gameEmit(game, "chatUpdate", filteredmsg)
            }

            callback()
        } else if (!game) {
            socket.emit("chatUpdate", "Get in a game first to chat.")
            callback()
        } else if (msg === "/me") {
            socket.emit("chatUpdate", "Invalid command.")
            callback()
        }
    })
    socket.on("getRandomTopic", function() {
        //suggest a topic
        socket.emit("receivedRandomTopic", sentencer.make("{{ an_adjective }} {{noun}}"))
    })
    socket.on("createGame", function (input, fill) {
        //create game handler
        var name = input.username
        var rounds = parseInt(input.rounds)
        var time = parseInt(input.gametime)
        var maxInkAmt = parseInt(input.maxInk)
        if (name.match("^(?=[A-Za-z_\\d]*[A-Za-z])[A-Za-z_\\d]{4,20}$") && name !== "nobody" && rounds <= 11 && rounds >= 1 && time >= 1 && time <= 5 && maxInkAmt <= 80 && maxInkAmt >= 20) {
            var game = getGameBySocketId(socket.id)
            if (!game) {
                var newPlayer = {
                    username: name,
                    id: socket.id,
                    team: "judge"
                }
                var newTeam1 = {
                    p1: {},
                    p2: {},
                    paths: [],
                    turn: 1,
                    ink: maxInkAmt,
                    maxInk: maxInkAmt,
                    score: 0
                }
                var newTeam2 = {
                    p1: {},
                    p2: {},
                    paths: [],
                    turn: 1,
                    ink: maxInkAmt,
                    maxInk: maxInkAmt,
                    score: 0
                }
                var newGame = {
                    team1: newTeam1,
                    team2: newTeam2,
                    judge: newPlayer,
                    round: 1,
                    maxTime: time * 60000,
                    timeout: time * 60000,
                    maxRound: rounds,
                    maxInk: maxInkAmt,
                    topic: "",
                    left: 0,
                    right: 0,
                    inGame: false,
                    paused: true,
                    readyNextRound: true,
                    id: getUniqueGameId(),
                    finishRound: function () {
                        if (this.round <= this.maxRound) {
                            var randomNum = getRandomInt(1, 3)
                            var hiddenGameObj = JSON.parse(JSON.stringify(this))
                            this.left = randomNum
                            this.right = (randomNum % 2) + 1
                            var players = getPlayers(this)
                            for (var x = 0; x < players.length; x++) {
                                if (!isEmpty(players[x])) {
                                    io.to(`${players[x].id}`).emit("roundOver", hiddenGameObj, this["team" + this.left].paths, this["team" + this.right].paths)
                                }
                            }
                            gameEmit(this, "chatUpdate", this.judge.username + ", please look at your screen and say <b>right</b> or <b>left</b> in the chat to decide the victor of this round.")
                            this.timeout = this.maxTime
                            this.team1.ink = this.maxInk
                            this.team2.ink = this.maxInk
                            this.team1.turn = 1
                            this.team2.turn = 1
                            this.team1.paths = []
                            this.team2.paths = []
                            this.round++
                            this.paused = true
                            this.readyNextRound = false
                        }
                    }
                }
                if (fill) {
                    fillGame(newGame)
                }
                games.push(newGame)

                socket.emit("joinedGame", newGame)
            } else {
                socket.emit("alert", "Already in a game. Reload to exit.")
            }
        } else {
            socket.emit("alert", "Bad input. Try again.")
            console.log(input)
        }
    })
    socket.on("joinGame", function (id, name) {
        //join game handler
        var gameExists = getGameBySocketId(socket.id)
        if (name.match("^(?=[A-Za-z_\\d]*[A-Za-z])[A-Za-z_\\d]{4,20}$") && name !== "nobody") {
            if (!gameExists) {
                console.log(findObjectByKey(games, "id", parseInt(id)))
                if (findObjectByKey(games, "id", parseInt(id)) && gameNameTaken(name, findObjectByKey(games, "id", parseInt(id))) === false) {
                    var game = findObjectByKey(games, "id", parseInt(id))
                    var playercount = 1
                    for (var x = 0; x < getPlayers(game); x++) {
                        if (!isEmpty(getPlayers(game)[x])) {
                            playercount++
                        }
                    }
                    if (playercount < 5) {
                        var newPlayer = {
                            username: name,
                            id: socket.id,
                            team: 0
                        }

                        if (!teamFilled(game.team1)) {
                            newPlayer.team = 1
                            if (isEmpty(game.team1.p1)) {

                                game.team1.p1 = newPlayer

                            } else if (isEmpty(game.team1.p2)) {
                                game.team1.p2 = newPlayer
                            }
                            gameEmit(game, "joinedGame", game)
                            gameEmit(game, "chatUpdate", newPlayer.username + " joined the game.")
                        } else {
                            newPlayer.team = 2
                            if (isEmpty(game.team2.p1)) {
                                game.team2.p1 = newPlayer
                                gameEmit(game, "joinedGame", game)
                                gameEmit(game, "chatUpdate", newPlayer.username + " joined the game.")
                            } else if (isEmpty(game.team2.p2)) {
                                game.team2.p2 = newPlayer
                                gameEmit(game, "joinedGame", game)
                                gameEmit(game, "chatUpdate", newPlayer.username + " joined the game.")
                            } else {
                                socket.emit("alert", "Game is full.")
                            }

                        }




                    } else {
                        socket.emit("alert", "Game is full.")
                    }
                } else {
                    socket.emit("alert", "Game doesn't exist or username taken.")
                }
            } else {
                socket.emit("alert", "Already in a game. Reload to exit.")
            }
        } else {
            socket.emit("alert", "Bad username. Try again.")
        }
    })
    socket.on("startGame", function (topicraw) {
        //start game event
        if (topicraw !== "") {
            var topic = topicraw.replace(/\</g, "&lt;");
            topic = topic.replace(/\>/g, "&gt;");
            var game = getGameBySocketId(socket.id)
            var members = 0
            if (game) {
                console.log("we have game")
                for (var x = 0; x < getPlayers(game).length; x++) {
                    if (!isEmpty(getPlayers(game)[x])) {
                        members++
                    }
                }
            }
            if (game && members === 5 && game.readyNextRound) {
                var player = getPlayerById(socket.id)
                if (player.team === "judge") {
                    game.topic = topic
                    game.inGame = true
                    game.paused = false
                    var timer = setInterval(function () {
                        gameEmit(game, "updateTime", game.timeout / 1000)

                        if (game.timeout <= 0) {
                            clearInterval(timer)
                            game.finishRound()

                        }

                        game.timeout -= 1000
                    }, 1000)
                    gameEmit(game, "gameStarted", game)

                } else {
                    socket.emit("alert", "Only a judge can start the game.")
                }
            } else {
                socket.emit("alert", "Game not ready.")
            }
        } else {
            socket.emit("alert", "Input a topic.")
        }
    })
    socket.on("pathDrawn", function (path) {
        //called on path completed
        var game = getGameBySocketId(socket.id)
        if (game && !game.paused) {

            var player = getPlayerById(socket.id)
            if (player.team !== "judge") {

                var team = game["team" + player.team]
                var playerRole;
                if (team.p1.id === player.id) {
                    playerRole = 1
                } else {
                    playerRole = 2
                }
                if (playerRole === team.turn) {

                    var newPath = path
                    if (path.length >= team.ink) {
                        newPath = path.slice(0, team.ink)
                    }
                    team.ink -= newPath.length
                    if (team.ink <= 0) {

                        if (playerRole === 1) {
                            team.turn = 2
                        } else {
                            team.turn = 1
                        }
                        team.paths.push(newPath)
                        team.ink = game.maxInk

                    } else {
                        team.paths.push(newPath)
                        console.log(team.ink)
                    }
                    io.to(`${team.p1.id}`).emit("updateInk", team.ink, team.paths, team.turn)
                    io.to(`${team.p2.id}`).emit("updateInk", team.ink, team.paths, team.turn)
                } else {
                    socket.emit("alert", "It's not your turn!")
                }
            }
        } else {
            socket.emit("alert", "Game does not exist or game has not resumed.")
        }
    })
});

function findObjectByKey(array, key, value) {
    //find an object using key value pair in an array
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] === value) {
            return array[i];
        }
    }
    return null;
}

function getRandomInt(min, max) {
    //random integer
    return Math.floor(Math.random() * (max - min)) + min;
}


function getUniqueGameId() {
    //generate game id
    var foundId = false
    var id
    while (!foundId) {
        var tempId = getRandomInt(100000, 999999)
        if (!findObjectByKey(games, "id", tempId)) {
            id = tempId
            foundId = true
        }
    }
    return id
}

function gameNameTaken(name, game) {
    //is the provided name taken in a game
    var players = getPlayers(game)
    var names = []
    for (var x = 0; x < players.length; x++) {
        names.push(players[x].username)
    }
    return names.includes(name);
}

function getPlayers(game) {
    //returns all players in a game
    var players = []
    players.push(game.judge)
    players.push(game.team1.p1)
    players.push(game.team1.p2)
    players.push(game.team2.p1)
    players.push(game.team2.p2)
    return players
}

function teamFilled(team) {
    //is the team full
    return !isEmpty(team.p1) && !isEmpty(team.p2);
}

function isEmpty(obj) {
    //is an object empty
    return Object.keys(obj).length === 0;
}

function getGameBySocketId(id) {
    //gets game by one of player's socket id
    for (var x = 0; x < games.length; x++) {
        var game = games[x]
        var players = getPlayers(game)
        for (var y = 0; y < players.length; y++) {
            console.log(id + " : " + players[y].id)
            if (!isEmpty(players[y]) && players[y].id === id) {
                return game
            }
        }
    }
    return null
}

function getPlayerById(id) {
    //gets a player object by socket id
    var game = getGameBySocketId(id)
    if (game) {
        var players = getPlayers(game)
        for (var x = 0; x < players.length; x++) {
            if (!isEmpty(players[x]) && players[x].id === id) {
                return players[x]
            }
        }
    } else {
        return null
    }
}

function gameEmit(game, toEmit, args) {
    //say to entire game
    var players = getPlayers(game)
    for (var x = 0; x < players.length; x++) {
        if (!isEmpty(players[x])) {
            io.to(`${players[x].id}`).emit(toEmit, args)
        }
    }
}

function objArrayToString(arr) {
    //only for debug
    var string = "[";
    for (var i = 0; i < arr.length; i++) {
        if (i !== arr.length - 1) {
            string += JSON.stringify(arr[i]) + ", "
        } else {
            string += JSON.stringify(arr[i])
        }
    }
    string += "]";
    return string
}

function fillGame(game) {
    //only for debug
    if (game) {
        game.team1.p1 = {
            username: getRandomInt(500001, 999999),
            id: getRandomInt(100000, 500000),
            team: 1
        }
        game.team1.p2 = {
            username: getRandomInt(500001, 999999),
            id: getRandomInt(100000, 500000),
            team: 1
        }
        game.team2.p1 = {
            username: getRandomInt(500001, 999999),
            id: getRandomInt(100000, 500000),
            team: 2
        }
        game.team2.p2 = {
            username: getRandomInt(500001, 999999),
            id: getRandomInt(100000, 500000),
            team: 2
        }
    }
}
