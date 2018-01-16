// Tian Qi Jiang 101020433

// create socket server
var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var mime = require('mime-types');
var url = require('url');
var clients = [];

const ROOT = "./public_html";
// create http server
http.listen(2406);

console.log("Chat server listening on port 2406");


function handler(req,res){
	console.log(req.method+" request for: "+req.url);
	// parse the url
	var objUrl = url.parse(req.url, true);
	var filename = ROOT+objUrl.pathname;

	fs.stat(filename ,function(err, stats){
		if(err){   //try and open the file and handle the error, handle the error
			respondErr(err);
		}else{
			if(stats.isDirectory())	filename+="/index.html";
		
			fs.readFile(filename,"utf8",function(err, data){
				if(err)respondErr(err);
				else respond(200,data);
			});
		}
	});	
	//locally defined helper function
	//serves 404 files 
	function serve404(){
		fs.readFile(ROOT+"/404.html","utf8",function(err,data){ //async
			if(err)respond(500,err.message);
			else respond(404,data);
		});
	}
		
	//locally defined helper function
	//responds in error, and outputs to the console
	function respondErr(err){
		console.log("Handling error: ",err);
		if(err.code==="ENOENT"){
			serve404();
		}else{
			respond(500,err.message);
		}
	}
		
	//locally defined helper function
	//sends off the response message
	function respond(code, data){
		// content header
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});
		//res.writeHead(code, filename);
		// write message and signal communication is complete
		res.end(data);
	}	
	
};
// listen for connections over http server
io.on("connection", function(socket){
	console.log("Got a connection");

	socket.on("intro",function(data){
		socket.username = data;
		socket.blockedUsers = []; // empty list for blocked users
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		socket.emit("message","Welcome, "+socket.username+".");
		clients.push(socket);
		io.emit("userList", getUserList());
	});
	// handle message event
	socket.on("message", function(data){
		console.log("got message: "+data);
		socket.broadcast.emit("message",timestamp()+", "+socket.username+": "+data);
		
	});
	// handle disconnect event
	socket.on("disconnect", function(){
		console.log(socket.username+" disconnected");
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");
		// remove user from clients
		clients = clients.filter(function(ele){  
       		return ele!==socket;
		});
		io.emit("userList", getUserList());
	});
	// handle private message event
    socket.on("privateMessage", function(data){
        //console.log();
		// loop through clients list
		var blocked = false;
		for (var i = 0; i < clients.length; i++){
			// if person recieving is a client 
			if(data.username === clients[i].username){
				// if the person recieving has no blocked users
				if(clients[i].blockedUsers.length === 0){
					// send message to person recieving
					clients[i].emit("privateMessage", {'username': socket.username, 'message': data.message});
				}
				else{
					// loop through the person recieving's blocked user list
					for(var j = 0; j < clients[i].blockedUsers.length; j++){
						// if current user is in person recieving's blocked list
						if (socket.username === clients[i].blockedUsers[j]){
							// send blocked message to current user
							socket.emit("message", timestamp()+": "+clients[i].username+" has blocked you.");
							blocked = true;
						}
					}
					if(blocked != true){
						// send message to person recieving
						clients[i].emit("privateMessage", {'username': socket.username, 'message': data.message});
					}
				}
			}
		}
    });
	// handle blockUser event
	socket.on("blockUser", function(data){
		var unblocked= false;

		// if the current user's block list is empty
		if (socket.blockedUsers.length === 0){
			// add the person clicked to the current users's blocked list
			socket.blockedUsers.push(data);
			socket.emit("message", timestamp()+": "+data+" has been blocked.");
		}
		else{
			// loop through current user's blocked list
			for(var i = 0; i < socket.blockedUsers.length; i++){
				// if the person clicked is in the current user's blocked list
				if(data == socket.blockedUsers[i]){
					// remove the person clicked from the user's blocked list and send message to user
					socket.blockedUsers.splice(i,1);
					socket.emit("message", timestamp()+": "+data+" has been unblocked.");
					unblocked = true;
					break;
				}
			}
			// else add the person clicked to the blocked list
			if (unblocked != true){
				socket.blockedUsers.push(data);
				socket.emit("message", timestamp()+": "+data+" has been blocked.");
			}
		}
	});
});

function timestamp(){
	return new Date().toLocaleTimeString();
}

function getUserList(){
    var ret = [];
    for(var i=0;i<clients.length;i++){
        ret.push(clients[i].username);
    }
    return ret;
}