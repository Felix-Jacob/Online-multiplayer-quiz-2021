const mqtt = require("mqtt");
const http = require('http');

// Datentypen für die Implementierung	

//Hilfsklasse implementiert Warteschlange

//implementiert ID Management für die Klassen
class sID
{
	constructor()
	{
		this.idQ = []
		for(let i=0; i<1000;i++){
				this.idQ.push(i);
		}
	}
	
	getID(){
		return this.idQ.shift();	
	}	

	setID(id){
		this.idQ.push(id);	
	}	
		
}


//kümmert sich um das Matchmaking
class Matchmaking
{
	constructor()
	{
		this.playerQ = [];
	}
	
	addPlayer(id)
	{
		this.playerQ.push(id);
		if(this.playerQ.length>=3){
			return [this.playerQ.shift(), this.playerQ.shift(), this.playerQ.shift()];				
		}
		return null;
			
	}

	leaveQueue(id)
	{
		let pid = this.playerQ.indexOf(id);
		if(id!=-1)
			this.playerQ.splice(pid, 1);
	}	
		
	
}


//alle Informationen über eine Session werden gespeichert
class Session
{
	constructor(sID, players)
	{
		this.sID = sID;
		this.state = 1;
		this.master = 0;
		this.players = players;
		this.playersAnswersRight = new Array(this.players.length);
		this.playersAnsweredYet = new Array(this.players.length);
		this.playersAnswers = new Array(this.players.length);
		this.playersAnswersRound = new Array(this.players.length);
		this.question = 0;
		this.questionSend = false;
		this.playersReady = new Array(this.players.length);
		this.playersSetRoleReady = new Array(this.players.length);
		this.playersQuestionsReceived = new Array(this.players.length);
		this.playersRoundQuestionReceived = new Array(this.players.length);
	}	
	
	addPlayer(nickname, playerID)
	{
		this.players.push([nickname, playerID]);
	}	
	 
	swapMaster(ID)
	{
		this.masterID = ID;
	}	

	slotOpen()
	{
		return this.players.length == this.playercount;
	}	
	
	resetreadySessionStart()
	{
		this.playersReady.forEach(element => element=false);
	}
	
	resetQuestionsReceived()
	{
		this.playersQuestionsReceived.forEach(element => element=false);
	}

	questionsReceived()
	{
		for(var r in this.playersQuestionsReceived) {
			if(r==false) return false;	
		}
		return true;
	}	
	
	setQuestionReceived(pID){
		let index = this.players.indexOf(pID);
		if(index!=-1)
			this.playersQuestionsReceived[index] = true;
	}
	
	resetPlayersRoundQuestionReceived(){
		this.playersRoundQuestionReceived.forEach(element => element=false);
	}	
	
	
	setPlayersRoundQuestionReceived(pID){
		let index = this.players.indexOf(pID);
		if(index!=-1)
			this.playersRoundQuestionReceived[index] = true;
	}	
	
	arePlayersRoundQuestionReceived(){
		for(var r in this.playersRoundQuestionReceived) {
			if(r==false) return false;	
		}
		return true;
	}	

	setRoleSet(){
		let index = this.players.indexOf(pID);
		if(index!=-1)
			this.playersSetRoleReady[index] = true;

	}	
	
	resetRoleSet(){
		this.playersSetRoleReady.forEach(element => element=false);
	}	
	
	areRolesSet(){
		for(var r in playersSetRoleReady) {
			if(r==false) return false;	
		}
		return true;
	}	
	
	arePlayersReady()
	{
		console.log(this.playersReady);
		this.playersReady.forEach(element => console.log(element));
		for(let i=0; i < this.playersReady; i++)
			console.log(element);
		return true;
	}	
	
	setPlayerReady(pid){
		let index = this.players.indexOf(pid);
		if(index!=-1)
			this.playersReady[index] = true;
	}	

	
	checkMaster(){
		let dummy = Math.floor((this.state-1)/3) + 1;		
		if(dummy!=this.master){
			this.master = dummy;
			return true 
		}
		return false;
	}	
	
	handleAnswer(answer, player)
	{
		for(let i=0; i<this.players.length; i++){
			if(this.players[i]==player && this.playersAnsweredYet[i]==false){
				this.playersAnsweredYet[i] = true;
				if(this.playerAnswers[i].length == 0){
					let a = new Array(1);
					a[0] = answer;
					this.playerAnswers[i] = a;
						
				} else {
					this.playerAnswers[i].push(answer);
				}	
				if(answer == this.roundSolution)
					this.playersAnswersRight[i] += 1;
				break;
			}	
		}	
	}	
	
	
	questionSelected(question)
	{
		this.question = question;
	}	
	
	isQuestionSelected()
	{
		return this.question != 0;
	}	
		
	everyoneAnswered()
	{
		for(var r in this.playersAnsweredYet) {
			if(r==false) return false;	
		}
		return true;
	}	
		
	resetPlayersAnsweredYet(){
		this.playersAnsweredYet.forEach(element => element = false);
	}	
		
}

	

//organisiert alle Sessions
class sessionHandler
{
	constructor(cache)
	{		
		this.cache = require("memory-cache");
		this.IDs = new sID();
	}	
	
	createNewGame(players)
	{
		var sID = this.IDs.getID();	
		var playerAnswers = [];
		var session = new Session(sID , players); 
		session.resetreadySessionStart();
		this.cache.put(sID, session);
		return session;
	}

	deleteGame(id)
	{
		return this.cache.del(id);
	}

	getSession(id)
	{	
		return this.cache.get(id);
	}	
	
	setSession(sID, session)
	{
		this.cache.put(sID, session);	
	}	
	
	
}	


var questions;
// cache für laufende Spiele: Positionen: Spieler --> Quizz Master --> Lobby voll
var matchmaking = new Matchmaking();
var sHandler = new sessionHandler();

var gameStartText = "game is starting";


var topicNameGame = "quiz";
var topicQueue = "queue";
var topicJoinGame = "joinGame"
var topicMatch = "playGame";


var timeOut = 300000;
var gameStartDelay = 1;

var connectOptions = {
	host: "localhost",
	port: 1883,
	protocol: "mqtt"
};





//interpretiet alle Anfragen der Clients
function onMessage(topic, message) {
	var msg = JSON.parse(message);
	var mode = topic.split("/")[1];
	switch(mode){
		case topicQueue:
			if(msg.command == "queueing")
				joinQueue(msg, matchmaking, sHandler);	
			else if(msg.command == "exiting"){
				leaveQueue(msg, matchmaking, sHandler);
			}
			break;
		case topicMatch:
			var sessionID = topic.split("/")[2];
			if(msg.command == "joining"){
				joinGame(msg, sessionID, sHandler);	
			}
			else if(msg.command == "questionsReceived" ){
				questionReceived(msg, sessionID, sHandler);
			}
			else if(msg.command == "roleSet"){
				roleSet(msg, sessionID, sHandler);
			}
			else if(msg.command == "questionSelected"){
				questionSelected(msg, sessionID, sHandler);
			}
			else if(msg.command == "receivedSelectedQuestion"){
				receivedSelectedQuestion(msg, sessionID, sHandler);
			}	
			
			
			
			
			
			
			
			else if(msg.command == "answer"){
				sHandler.handleAnswer(msg.answer, msg.player, msg.sID);
			}
			break;
			
	}	
}

function sendError(sID){
	res = {
		command:"error",
		content:"-"
	}
	
	client.publish(topicNameGame + "/" + topicMatch + "/" + sID, JSON.stringify(res));

}

function questionReceived(msg, sessionID, sHandler){
	let session = sHandler.getSession(sessionID);
	session.setQuestionReceived(msg.content);
	sHandler.setSession(sessionID, session);
}	

//Funktion die einen Spieler in die Warteschlange einreiht und ggf. ein neues Spiel erzeugt 
function joinQueue(msg, matchmaking, sHandler){
	var res = null;
	var id = msg.id;
	let r = matchmaking.addPlayer(msg.content);
	if(r!=null)	{
		var session = sHandler.createNewGame(r);
		res = {
			"command": "foundMatch",
			"content": session.sID
		}
		for(let i=0; i<session.players.length; i++){
			client.publish(topicNameGame + "/" + topicJoinGame + "/" + session.players[i],JSON.stringify(res));			
		}
		client.subscribe(topicNameGame + "/" + topicMatch + "/" + session.sID + "/server");
		session.resetreadySessionStart();
		setTimeout(joinMatchTimer, 8000, sHandler, session.sID);
	}	
}

function joinMatchTimer(sHandler,sID){
	console.log("joinMatchTimer");
	var session = sHandler.getSession(sID);
	console.log(session);
	let test = session.arePlayersReady();
	//console.log("test: " + test);
	
	if(test==true){
		startSession(session);
	} else {
		sendError(session.sID);
	}	
}	



function leaveQueue(msg, matchmaking){
	matchmaking.leaveQueue(msg);
}	

function joinGame(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);	
	session.setPlayerReady(msg.content);
	sHandler.setSession(sessionID, session);
}	


function readySession(sHandler, msg){
	var session = sHandler.getSession(msg.sessionID);
	if(session != null && session.arePlayersReady()){
		startSession(session);
	}else if(msg.content == true){
		session.setPlayerReady(true, msg.player);
	}	
}

function startSession(session){
	let res = {
		command:"gameStart",
		content:"-"
	}	
		
	var questions = [
		{
			id:1,
			text:"Was ist 3 * 3 ?",
			a:9,
			b:6,
			c:-9,
			d:0
		},
		{	
			id:2,
			text:"Was ist 10 - 2 * 3  ?",
			a:24,
			b:4,
			c:12,
			d:7
		}			
	];
	
	let que = {
		command:"questions",
		content: {
			questions:questions 		
		}
	}	
	
	
	
	client.publish(topicNameGame + "/" + topicMatch + "/" + session.sID, JSON.stringify(res));

	client.publish(topicNameGame + "/" + topicMatch + "/" + session.sID, JSON.stringify(questions));
		
	setTimeout(questionsReceivedTimer, 8000, sHandler, session.sID);	
	
}	


function questionsReceivedTimer(sHandler, sID){
	var session = sHandler.getSession(sID);
	if(session.questionsReceived()){
		startRound(session);
	} else {
		
	}	
}	


function startRound(session){
		res = {
			command:"setGameMaster",
			content:session.players[session.master]
		};
		client.publish(topicNameGame + "/" + topicMatch + "/" + seession.sID, JSON.stringify(res));	
		setTimeout(roleSetTimer, 8000, sHandler, session.sID);
}	

function roleSetTimer(sHandler, sID){
	var session = sHandler. getSession(sID);
	if(session.areRolesSet()){
		let res = {
			command:"newRound",
			content:"-"
		}			
		client.publish(topicNameGame + "/" + topicMatch + "/" + session.sID, JSON.stringify(res));
		setTimeout(questionSelectedTimer, 8000, sHandler, sID);
		
	} else {
		sendError(session.sID);
	}	
}	

function questionSelectedTimer(sHandler, sID){
	var session = sHandler.getSession(sID);
	if(session.isQuestionSelected()){
		selectedQuestion();
	} else {
		sendError(session.sID);
	}
	
}	

function roleSet(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);
	session.setRoleSet();	
	sHandler.setSession(sessionID, session);
}	




function questionSelected(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);
	session.questionSelected(msg.content);
	sHandler.setSession(sessionID, session);
}	


function selectedQuestion(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);
	session.sendQuestion(msg.content);
	let res = {
		command:"selectedQuesiton",
		content:"questionID"		
	}
	sHandler.setSession(sessionID, session);

	client.publish(topicNameGame + "/" + topicMatch + "/" + session.sID, JSON.stringify(res));
	setTimeout(selectedQuestionTimer, 8000, sHandler, sessionID);
}	

function selectedQuestionTimer(sHandler, sID){
	var session = sHandler.getSession(sID);
	if(session.arePlayersRoundQuestionReceived()){
		startRound(session);
	} else{
		sendError(session.sID);	
	}	
}	

function selectedQuestionReceived(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);
	session.setPlayersRoundQuestionReceived(msg.content);	
	sHandler.setSession(sessionID, session);
}	

function handleAnswer(msg, sessionID, sHandler){
	var session = sHandler.getSession(sessionID);
	session.handleAnswer(msg.answer, msg.userName);	
	sHandler.setSession(sessionID, session);
}	

function startRound(sHandler, sessionID){
	let res = {
		command:"startRound",
		content:"-"		
	}

	client.publish(topicNameGame + "/" + topicMatch + "/" + sessionID, JSON.stringify(res));
	setTimeout(answerTimer, 8000, sHandler, sessionID);
	
}	

function answerTimer(sHandler, sessionID){
	var session = sHandler.getSession(session.ID);
	if(session.playersAnsweredYet()){
		session.state += 1;
		sHandler.setSession(sessionID, session);
		isGamedone(session);
	} else {
		sendError(session.sID);
	}		
}	

function isGamedone(session){
	if(session.state > 3 * this.players.length){
		endSession();	
	} else {
		resetFlags(session);
		
	}	
	
}	




function endSession(session){
	


}	




function getQuestions(questions){

	http.get('http://localhost:5984', (resp) => {
	let data = '';

		// A chunk of data has been received.
		resp.on('data', (chunk) => {
			data += chunk;
		});

		  // The whole response has been received. Print out the result.
		  resp.on('end', () => {
			console.log(JSON.parse(data).explanation);
		  });

		}).on("error", (err) => {
		  console.log("Error: " + err.message);
	});
	
	
	
}


(async function main(questions) {
	console.log("Go");
	client = mqtt.connect(connectOptions)
	.on("connect", function() {
		console.log("connected");
		client.on('message', onMessage);
		client.subscribe(topicNameGame + "/" + topicQueue);
		}
	)
	//getQuestions(questions);
	
})();


	
