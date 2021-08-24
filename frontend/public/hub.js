// Hub related
var findGameButton;
var stopSearchingButton;
var joinMatchButton;
var searchStatus;
// Game related
var timerRunning = false;
var isGameMaster = false;
var currentRole;
var questions;
// general or for both
var client;
var userName;
var matchTopic;

// Hub

window.onload = async function() { // Hub - perspective is loaded by default
    userName = await authorize(); 

    if(!userName)
        return;
        
    document.getElementById('username').innerHTML = userName;

    setupMQTT();

    findGameButton = document.getElementById("findGame");
    findGameButton.addEventListener("click", onFindMatchClicked);
    stopSearchingButton = document.getElementById("stopSearching");
    stopSearchingButton.addEventListener("click", onStopSearchingClicked);
    joinMatchButton = document.getElementById('joinMatch');
    joinMatchButton.addEventListener('click', onJoinMatchClicked);
    searchStatus = document.getElementById('status');

    timerRunning = false;
}

function setupMQTT() {
    client = new Paho.MQTT.Client("localhost", 8080, "/mqtt/", "quizHubClient");
    client.onMessageArrived = onMessageArrivedHub;

    client.connect(
        {onSuccess: onConnectionSuccess},
        {onFailure: onConnectionFailure}
    )
}

function onFindMatchClicked() {
    let message = new Paho.MQTT.Message("queueing " + userName);
    message.destinationName = "quiz/queue";
    client.send(message);
    searchStatus.innerHTML = "Searching for match...";
    findGameButton.style.visibility='hidden';
    stopSearchingButton.style.visibility="visible";
}

function onStopSearchingClicked() {
    searchStatus.innerHTML='';
    findGameButton.style.visibility="visible";
    stopSearchingButton.style.visibility="hidden";
    let message = new Paho.MQTT.Message("exiting " + userName);
    message.destinationName = "quiz/queue";
    client.send(message);
}

async function onJoinMatchClicked(){
    console.log('quiz/'+matchTopic);
    subscribe('quiz/'+matchTopic, async () => {
        publishMessage(0, 'quiz/'+matchTopic, 'joining ' + userName);
        searchStatus.innerHTML = 'Waiting for the other player to join ...'
        joinMatchButton.style.visibility='hidden';
        let result = await fetch('http://localhost:3000/test');
        let html = await result.text();
        console.log(html);
        document.querySelector('html').innerHTML = html;
        
    });
}

function onMessageArrivedHub(msg) {
    console.log("received message: " + msg.payloadString);

    var splittedMsg = msg.payloadString.split(' ');

    if(splittedMsg[0] == 'foundMatch') {
        matchTopic = splittedMsg[1]; 

        searchStatus.innerHTML = "Found a match! Waiting for you to join..."
        stopSearchingButton.style.visibility='hidden';
        joinMatchButton.style.visibility='visible';
    }
}

function startCountdown(countdownTime) {
    if(!timerRunning) {
        var countdownVisualisation = document.getElementById("countdown");
        var intervalId = setInterval(secondExpired, 1000);
        timerRunning = true;

        function secondExpired() {
            if(countdownTime < 0) {
                clearInterval(intervalId);
                timerRunning = false;
                if(!isGameMaster)
                    roundOver();
                countdownVisualisation.innerHTML = "Round over";
            } 
            else {
                countdownVisualisation.innerHTML = countdownTime.toString();
                countdownTime -= 1;
            }
        }
    }
}


// Game

function onMessageArrivedGame(msg) {
    console.log("received message: " + msg.destinationName);
    if(msg.destinationName == "quiz/match/timer") {
        let convertedMsg = parseInt(msg.payloadString);
        if(convertedMsg) {
            console.log("starting timer");
            startCountdown(convertedMsg);
        }
    }

    if(msg.destinationName == "quiz/match/questions") {
        var questions = null;

        try {
            questions = JSON.parse(msg.payloadString);
        } catch (err) {
            console.log("payload is no proper JSON");
            console.log(msg.payloadString);
        }

        if(questions) 
            setQuestions(questions);
    }

    if(msg.destinationName == "quiz/match/roles") {
        if(msg.payloadString == "player"){ // TODO: Add check for username so that you know what role is yours
            setToPlayerView();
            subscribe("quiz/match/players", () => {
                publishMessage(0, "quiz/match/status", "sucessfully subscribed to players");
            })
        }
        if(msg.payloadString == "gameMaster") {
            setToGameMasterView();
            subscribe("quiz/match/gameMaster", () => {
                publishMessage(0, "quiz/match/status", "sucessfully subscribed to gameMaster");
            })
        }
    }
}


// General or both

function publishMessage(qos, destination, payload) {
    try {
        let message = new Paho.MQTT.Message(payload);
        message.destinationName = destination;
        message.qos = qos;
        client.send(message)
    } catch  {
        console.log("client is not connected");
    }
}

function subscribe(topic, onSuccess) {
    client.subscribe(topic, {
        onSuccess: onSuccess,
        onFailure: function(err) {
            console.log("Couldn't subscribe to topic: " + JSON.stringify(err.errorMessage));
            setTimeout(2000, subscribe(topic, onSuccess));
        }
    });
}

function onConnectionSuccess() {
    console.log("sucessfully connected");
    client.subscribe("quiz/joinGame/"+userName);
}

function onConnectionFailure(err) {
    console.log("connection failure: " + err);
    setTimeout(setupMQTT, 2000);
}