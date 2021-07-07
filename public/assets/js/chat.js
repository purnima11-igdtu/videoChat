let socket = io();
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");

// let startButton = document.getElementById("start");
let roomName=null;
let host = false;
let rtcPC;
let myStream;
// let purnima= document.getElementById("chat_app");

// adding chat 
// var message = document.getElementById("message");
// var button = document.getElementById("send");
// var username = document.getElementById("username");
// var output = document.getElementById("output");

// button.addEventListener("click", function () {
//   socket.emit("sendingmessage", {
//     message: message.value,
//     username: username.value,
//   });
// });

// socket.on("broadcast", function (data) {
//   output.innerHTML +=
//     "<p><strong>" + data.username + ":</strong>" + data.message + "</p>";
// });

//ending chat code

let divButtonGroup = document.getElementById("btn-group");
let muteB = document.getElementById("muteB");
let hideB = document.getElementById("hideB");
let leaveB = document.getElementById("leaveB");

let muteF = false;
let hideF = false;

// Contains the stun server URL we will be using.
let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};


// startButton.addEventListener("click", function () {
//  window.location.replace('./video');
// });

joinButton.addEventListener("click", function () {
  console.log("hey");
  let roomInput = document.getElementById("roomName");
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    roomName = roomInput.value;
    socket.emit("join", roomName);

  }
});


muteB.addEventListener("click", function () {
  muteF = !muteF;
  if (muteF) {
    myStream.getTracks()[0].enabled = false;
    muteB.textContent = "UNMUTE";
  } else {
    myStream.getTracks()[0].enabled = true;
    muteB.textContent = "MUTE";
  }
});

hideB.addEventListener("click", function () {
  hideF = !hideF;
  if (hideF) {
    myStream.getTracks()[1].enabled = false;
    hideB.textContent = "SHOW";
  } else {
    myStream.getTracks()[1].enabled = true;
    hideB.textContent = "HIDE";
  }
});

leaveB.addEventListener("click", function () {
  socket.emit("leave", roomName); //Let's the server know that user has left the room.

  divVideoChatLobby.style = "display:block"; //Brings back the Lobby UI
  divButtonGroup.style = "display:none";

  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of User.
    userVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of User
  }
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of Peer.
  }

  //Checks if there is peer on the other side and safely closes the existing connection established with the peer.
  if (rtcPC) {
    rtcPC.ontrack = null;
    rtcPC.onicecandidate = null;
    rtcPC.close();
    rtcPC = null;
  }
});

// Triggered when a room is succesfully created.

socket.on("created", function () {
  host = true;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 500, height: 500 },
    })
    .then(function (stream) {
      /* use the stream */
       
       myStream = stream;
       divVideoChatLobby.style = "display:none";
       divButtonGroup.style = "display:flex";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is succesfully joined.

socket.on("joined", function () {
  host = false;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 500, height: 500 },
    })
    .then(function (stream) {
      /* use the stream */
      myStream = stream;
      divVideoChatLobby.style = "display:none";
      divButtonGroup.style = "display:flex";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomName);
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is full (meaning has 2 people).

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

// Triggered when a peer has joined the room and ready to communicate.

socket.on("ready", function () {
  if (host) {
    rtcPC = new RTCPeerConnection(iceServers);
    rtcPC.onicecandidate = OnIceCandidateFunction;
    rtcPC.ontrack = OnTrackFunction;
    rtcPC.addTrack(myStream.getTracks()[0], myStream);
    rtcPC.addTrack(myStream.getTracks()[1], myStream);


    rtcPC
      .createOffer()
      .then((offer) => {
        rtcPC.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
      })

      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an ice candidate from the peer.

socket.on("candidate", function (candidate) {
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPC.addIceCandidate(icecandidate);
});

// Triggered on receiving an offer from the person who created the room.

socket.on("offer", function (offer) {
  if (!host) {
    rtcPC = new RTCPeerConnection(iceServers);
    rtcPC.onicecandidate = OnIceCandidateFunction;
   rtcPC.ontrack = OnTrackFunction;
    rtcPC.addTrack(myStream.getTracks()[0], myStream);
   rtcPC.addTrack(myStream.getTracks()[1], myStream);
   rtcPC.setRemoteDescription(offer);

   rtcPC
      .createAnswer()
      .then((answer) => {
        rtcPC.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an answer from the person who joined the room.

socket.on("answer", function (answer) {
 rtcPC.setRemoteDescription(answer);
});

// Triggered when the other peer in the room has left the room.

socket.on("leave", function () {
  host = true; //This person is now the creator because they are the only person in the room.
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving video track of Peer.
  }

  //Safely closes the existing connection established with the peer who left.

  if (rtcPC) {
    rtcPC.ontrack = null;
    rtcPC.onicecandidate = null;
    rtcPC.close();
    rtcPC = null;
  }
});

// Implementing the OnIceCandidateFunction which is part of the RTCPeerConnection Interface.

function OnIceCandidateFunction(event) {
  console.log("Candidate");
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

// Implementing the OnTrackFunction which is part of the RTCPeerConnection Interface.

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}
