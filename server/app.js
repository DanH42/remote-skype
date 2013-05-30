var express = require('express');
var app = express();
var http = require('http');
var net = require('net');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');
var moment = require('moment');

var mongo = new (require("mongolian"))({log:{debug:function(){}}});
var skypedb = mongo.db("skype");
var db = {};
db.users = skypedb.collection("users");

var includeIP = function(req, res, next){
	req.addr = req.socket.remoteAddress;
    next();
}

app.configure(function(){
	app.use(includeIP);
});

server.listen(8080, '10.9.8.235');

var logStream = fs.createWriteStream('log.txt', {'flags': 'w'});
function log(message){
	console.log(getTimestamp() + " " + message);
	logStream.write(getLongTimestamp() + " " + message + '\n');
}function getTimestamp(){
	return moment().format("H:mm:ss");
}function getLongTimestamp(){
	return moment().format("MM/DD H:mm:ss");
}

app.get('/', function(req, res){
	log("REQUEST\t/\t" + req.addr);
	res.sendfile(__dirname + '/index.html');
});

app.get('/skype.js', function(req, res){
	res.sendfile(__dirname + '/skype.js');
});

function handleData(type, data){
	switch(type){
		case "AccountInfo":
			log("ACCOUNT\t" + data.handle);
			db.users.findOne({"account.handle": data.handle}, function(err, user){
				if(!err && user)
					db.users.update({"account.handle": data.handle}, {account: data});
				else
					db.users.insert({account: data, buddies: []});
			});
			break;
		case "BuddyList":
			log("BUDDIES\t" + data.account);
			db.users.findOne({"account.handle": data.account}, function(err, user){
				if(!err && user)
					db.users.update({"account.handle": data.account}, {'$set': {buddies: data.buddies}});
				else
					log("NO_USER\t" + data.account);
			});
			break;
		default:
			log("UNKNOWN\t" + type);
	}
}

net.createServer(function(sock){
	log("CONNECT\t" + sock.remoteAddress + ":" + sock.remotePort);
	sock.partialData = "";

	sock.on('data', function(data){
		data = sock.partialData + data;
		var index = data.indexOf("\r\n");
		if(index != -1){
			sock.partialData = "";
			data = JSON.parse(data.substr(0, index));
			if(data && data.type && data.data){
				log("DATA\t" + sock.remoteAddress + "\t" + data.type);
				handleData(data.type, data.data);
				//sock.write(JSON.stringify(data) + "\r\n");
			}
		}else
			sock.partialData += data;
	});

	sock.on('close', function(data){
		// Why do remoteAddress and remotePort not work? You got me...
		log("CLOSE\t" + sock._peername.address + ":" + sock._peername.port);
	});
}).listen(8081, '10.9.8.235');

log("Started.");
