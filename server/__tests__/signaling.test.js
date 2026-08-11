const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const { setupSocketHandlers } = require("../src/server");

describe("WebRTC Signaling Server", () => {
  let io, serverSocket, clientSocket1, clientSocket2;
  let httpServer;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    setupSocketHandlers(io);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket1 = new Client(`http://localhost:${port}`);
      clientSocket2 = new Client(`http://localhost:${port}`);
      
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      
      let connections = 0;
      const checkDone = () => {
        connections++;
        if (connections === 2) done();
      };
      
      clientSocket1.on("connect", checkDone);
      clientSocket2.on("connect", checkDone);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket1.close();
    clientSocket2.close();
  });

  test("clients can join a room and receive peer-connected events", (done) => {
    const roomName = "test-room";

    clientSocket1.on("peer-connected", (peerId) => {
      expect(peerId).toBeDefined();
      done();
    });

    clientSocket1.emit("join-room", roomName);
    
    // Give client1 a moment to join before client2 joins
    setTimeout(() => {
      clientSocket2.emit("join-room", roomName);
    }, 100);
  });

  test("clients can exchange WebRTC offer/answer", (done) => {
    const sdpData = { type: "offer", sdp: "dummy-sdp" };
    
    clientSocket2.on("webrtc-offer", (data) => {
      expect(data.sdp).toEqual(sdpData);
      done();
    });

    // Assume they are already in the same room from the previous test
    clientSocket1.emit("webrtc-offer", { target: clientSocket2.id, sdp: sdpData });
  });
});
