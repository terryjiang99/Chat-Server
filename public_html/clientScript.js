// Tian Qi Jiang 101020433

$(document).ready(function(){

	var userName = prompt("What's your name?")||"User";

	var socket = io(); //connect to the server that sent this page
	// connect user socket to server
	socket.on('connect', function(){
		socket.emit("intro", userName);
	});
	// handle inputtext event
	$('#inputText').keypress(function(ev){
		if(ev.which===13){
			//send message
			socket.emit("message",$(this).val());
			ev.preventDefault(); //if any
			$("#chatLog").append((new Date()).toLocaleTimeString()+", "+userName+": "+$(this).val()+"\n");
			$(this).val(""); //empty the input
		}
	});
	// handle message event
	socket.on("message",function(data){
		$("#chatLog").append(data+"\n");
		$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
	});
	// handle userlist event
	socket.on("userList",function(data){
		$("#userList").empty();
		// loop through list and add name as ordered list in userlist 
		for (var i = 0; i < data.length; i++){
			var list = ("<li id='"+data[i]+"' data-user='"+data[i]+"'>"+data[i]+"</li>");
			$('#userList').append(list+"<br>");
			// call double click event handler
			onDblClick(data[i]);
		}
	});
	// function handles double click event
	function onDblClick(data){
		var name = data;
		// add event listener for double click
		// use data-user as jquery selector to allow whitespace in name
		$('[data-user="'+name+'"]').dblclick(function(event){
			if (name === userName){
				return;
			}
			// if current user is pressing alt key, block the user clicked
			else if(event.altKey){
				socket.emit("blockUser", name);
			}
			else{
				// send message to user clicked
				var message = window.prompt("Enter the message you want to send to: "+name+"");
				// if no message, return
				if(!message){
					return;
				}
				else{
					socket.emit("privateMessage", {'username': name, 'message': message});
				}
			}
		});
	}
	// handle private message event
	socket.on("privateMessage", function(data){
		// show user the message and get reply
		var message = window.prompt(data.username+" has sent you a message: \n"+data.message);
		if(!message){
			return;
		}else{
			// send user the reply
			socket.emit("privateMessage", {'username': data.username, 'message': message});
		}
	});
});