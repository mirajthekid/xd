const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

// Import typing debug logger
const { logTypingEvent } = require('./debug_typing_server');

// Initialize express app
const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Add headers for WebSocket support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server with proper configuration for production
const wss = new WebSocket.Server({ 
  server,
  // Handle upgrade events properly
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Below options specified as default values
    concurrencyLimit: 10,
    threshold: 1024 // Size in bytes below which messages should not be compressed
  }
});

// In-memory data structures
const waitingUsers = []; // Queue for users waiting to be matched
const activeRooms = new Map(); // Map of active chat rooms
const userConnections = new Map(); // Map of user IDs to their WebSocket connections
const userSockets = new Map(); // Map of WebSocket to user IDs

// Function to broadcast online users count to all connected clients
function broadcastOnlineCount() {
  // Count all connected WebSocket clients instead of just logged-in users
  let totalVisitors = 0;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      totalVisitors++;
    }
  });
  
  const message = JSON.stringify({
    type: 'online_count',
    count: totalVisitors
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  console.log(`Broadcasting online count: ${totalVisitors} visitors`);
}

// Set up a periodic matchmaking check (every 5 seconds)
setInterval(() => {
  if (waitingUsers.length >= 2) {
    console.log('Running periodic matchmaking check...');
    matchUsers();
  }
}, 5000);

// Broadcast online count periodically (every 10 seconds)
setInterval(() => {
  broadcastOnlineCount();
}, 10000);

// Clean up inactive connections every 30 seconds
setInterval(() => {
  console.log('Cleaning up inactive connections...');
  userConnections.forEach((ws, userId) => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.log(`Cleaning up inactive connection for user ${userId}`);
      userConnections.delete(userId);
      
      // Also remove from waiting queue if present
      const waitingIndex = waitingUsers.findIndex(u => u.id === userId);
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1);
        console.log(`Removed inactive user ${userId} from waiting queue`);
      }
    }
  });
}, 30000);

// Matchmaking function
function matchUsers() {
  console.log(`Attempting to match users. Current queue size: ${waitingUsers.length}`);
  
  // Only try to match if we have at least 2 users
  if (waitingUsers.length >= 2) {
    // Filter out users with closed connections before matching
    const activeWaitingUsers = waitingUsers.filter(user => {
      const conn = userConnections.get(user.id);
      return conn && conn.readyState === WebSocket.OPEN;
    });
    
    // Update the waiting queue with only active users
    waitingUsers.length = 0;
    waitingUsers.push(...activeWaitingUsers);
    
    console.log(`Active waiting users: ${waitingUsers.length}`);
    
    if (waitingUsers.length >= 2) {
      // Get the first two users from the queue
      const user1 = waitingUsers.shift();
      const user2 = waitingUsers.shift();
      
      console.log(`Matching ${user1.username} with ${user2.username}`);
      
      // Create a new room with a unique ID
      const roomId = uuidv4();
      
      // Store room information
      activeRooms.set(roomId, {
        id: roomId,
        users: [user1, user2],
        createdAt: Date.now()
      });
      
      // Get WebSocket connections for both users
      const user1Connection = userConnections.get(user1.id);
      const user2Connection = userConnections.get(user2.id);
      
      // Send match notification to both users
      if (user1Connection && user1Connection.readyState === WebSocket.OPEN) {
        user1Connection.send(JSON.stringify({
          type: 'matched',
          roomId: roomId,
          partner: user2.username
        }));
      }
      
      if (user2Connection && user2Connection.readyState === WebSocket.OPEN) {
        user2Connection.send(JSON.stringify({
          type: 'matched',
          roomId: roomId,
          partner: user1.username
        }));
      }
      
      console.log(`Successfully matched users: ${user1.username} and ${user2.username} in room ${roomId}`);
    }
  } else {
    console.log('Not enough users in queue to match yet');
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log(`New client connected from ${req.socket.remoteAddress}`);
  
  // Log connection information for debugging
  console.log(`WebSocket protocol: ${ws.protocol}`);
  
  // Generate a unique ID for this connection
  const userId = uuidv4();
  
  // Associate this WebSocket with the userId
  userSockets.set(ws, userId);
  
  // Broadcast updated count immediately when a new client connects
  broadcastOnlineCount();
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'login':
          // Validate username
          const username = data.username.trim();
          if (!username || username.length < 3) {
            ws.send(JSON.stringify({
              type: 'login_error',
              message: 'Username must be at least 3 characters'
            }));
            return;
          }
          
          // Store user connection
          userConnections.set(userId, ws);
          
          // Create user object
          const user = {
            id: userId,
            username: username,
            joinedAt: Date.now()
          };
          
          // Add user to waiting queue
          waitingUsers.push(user);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'login_success',
            userId: userId
          }));
          
          console.log(`User ${username} (${userId}) logged in and added to queue`);
          
          // Broadcast updated online count
          broadcastOnlineCount();
          
          // Try to match users
          setTimeout(() => matchUsers(), 500); // Slight delay to ensure connection is fully established
          break;
          
        case 'cancel_search':
          // Remove user from waiting queue
          const waitingIndex = waitingUsers.findIndex(u => u.id === userId);
          if (waitingIndex !== -1) {
            waitingUsers.splice(waitingIndex, 1);
            console.log(`User ${userId} removed from waiting queue`);
          }
          break;
          
        case 'message':
          // Find the room
          let targetRoom = null;
          let targetUser = null;
          
          activeRooms.forEach((room) => {
            if (room.users.some(u => u.id === userId)) {
              targetRoom = room;
              targetUser = room.users.find(u => u.id !== userId);
            }
          });
          
          if (targetRoom && targetUser) {
            const targetConnection = userConnections.get(targetUser.id);
            
            if (targetConnection && targetConnection.readyState === WebSocket.OPEN) {
              targetConnection.send(JSON.stringify({
                type: 'message',
                content: data.content,
                sender: data.username,
                timestamp: Date.now()
              }));
            }
          }
          break;
          
        case 'typing':
          logTypingEvent(`SERVER: Heard someone typing! Message: ${JSON.stringify(data)}`);
          console.log(`Typing event received from ${userId}, isTyping: ${data.isTyping}, username: ${data.username}`);
          
          // If roomId is provided, use it directly
          let typingTargetRoom = null;
          let typingTargetPartner = null;
          
          if (data.roomId && activeRooms.has(data.roomId)) {
            typingTargetRoom = activeRooms.get(data.roomId);
            typingTargetPartner = typingTargetRoom.users.find(u => u.id !== userId);
            logTypingEvent(`Using provided roomId ${data.roomId} to find partner`);
            console.log(`Using provided roomId ${data.roomId} to find partner`);
            
            // Verify the sender is actually in this room
            const senderInRoom = typingTargetRoom.users.some(u => u.id === userId);
            logTypingEvent(`Sender ${userId} is in room ${data.roomId}: ${senderInRoom}`);
            
            if (!senderInRoom) {
              logTypingEvent(`WARNING: Sender ${userId} is not in room ${data.roomId}!`);
            }
          } else {
            // Otherwise search for the room containing this user
            activeRooms.forEach((room, roomId) => {
              if (room.users.some(u => u.id === userId)) {
                typingTargetRoom = room;
                typingTargetPartner = room.users.find(u => u.id !== userId);
                logTypingEvent(`Fallback: Found room ${roomId} with user ${userId}`);
                console.log(`Found room with user ${userId}`);
              }
            });
          }
          
          if (typingTargetRoom && typingTargetPartner) {
            logTypingEvent(`SERVER: Telling friend ${typingTargetPartner.username} that ${data.username} is typing.`);
            console.log(`Found partner: ${typingTargetPartner.username} (${typingTargetPartner.id})`);
            
            const partnerConnection = userConnections.get(typingTargetPartner.id);
            const connectionOpen = partnerConnection && partnerConnection.readyState === WebSocket.OPEN;
            
            logTypingEvent(`Friend's connection open? ${connectionOpen}`);
            logTypingEvent(`Friend's connection state: ${partnerConnection ? partnerConnection.readyState : 'No connection'} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`);
            
            if (connectionOpen) {
              const typingMessage = {
                type: 'typing',
                isTyping: data.isTyping,
                username: data.username
              };
              logTypingEvent(`Sending typing message to partner: ${JSON.stringify(typingMessage)}`);
              console.log(`Sending typing message to partner: ${JSON.stringify(typingMessage)}`);
              
              try {
                partnerConnection.send(JSON.stringify(typingMessage));
                logTypingEvent(`Successfully sent typing message to partner`);
              } catch (error) {
                logTypingEvent(`ERROR sending typing message to partner: ${error.message}`);
                console.error(`Error sending typing message to partner:`, error);
              }
            } else {
              logTypingEvent(`Partner connection not available or not open`);
              console.log(`Partner connection not available or not open`);
            }
          } else {
            logTypingEvent(`No room or partner found for user ${userId}`);
            console.log(`No room or partner found for user ${userId}`);
          }
          break;
          
        case 'skip_notification':
          console.log(`Skip notification received from ${userId}, username: ${data.username}`);
          
          // Find the room and notify partner about the skip intention
          let skipRoomFound = false;
          let roomToNotify = data.roomId ? data.roomId : null;
          let partnerToNotify = null;
          
          // If roomId is provided, use it directly
          if (roomToNotify && activeRooms.has(roomToNotify)) {
            skipRoomFound = true;
            const room = activeRooms.get(roomToNotify);
            partnerToNotify = room.users.find(u => u.id !== userId);
          } else {
            // Otherwise search for the room containing this user
            activeRooms.forEach((room, roomId) => {
              if (room.users.some(u => u.id === userId)) {
                skipRoomFound = true;
                roomToNotify = roomId;
                partnerToNotify = room.users.find(u => u.id !== userId);
              }
            });
          }
          
          if (skipRoomFound && partnerToNotify) {
            console.log(`Found partner ${partnerToNotify.username} for skip notification`);
            
            const partnerConnection = userConnections.get(partnerToNotify.id);
            
            if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
              partnerConnection.send(JSON.stringify({
                type: 'partner_skipped',
                message: `${data.username} wants to skip`,
                username: data.username
              }));
              console.log(`Sent skip notification to partner ${partnerToNotify.username}`);
            } else {
              console.log(`Partner connection not available for skip notification`);
            }
          } else {
            console.log(`No room or partner found for skip notification`);
          }
          break;
          
        case 'skip':
          // Find the room - either by roomId if provided, or by searching for the user
          let roomToClose = null;
          let partnerToNotifyOnSkip = null;
          
          // If client provided a roomId, use it directly
          if (data.roomId && activeRooms.has(data.roomId)) {
            roomToClose = data.roomId;
            const room = activeRooms.get(data.roomId);
            partnerToNotifyOnSkip = room.users.find(u => u.id !== userId);
          } else {
            // Otherwise search for the room containing this user
            activeRooms.forEach((room, roomId) => {
              if (room.users.some(u => u.id === userId)) {
                roomToClose = roomId;
                partnerToNotifyOnSkip = room.users.find(u => u.id !== userId);
              }
            });
          }
          
          if (roomToClose && partnerToNotifyOnSkip) {
            console.log(`User ${userId} skipped chat in room ${roomToClose}`);
            
            // Notify partner about skip
            const partnerConnection = userConnections.get(partnerToNotifyOnSkip.id);
            
            if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
              // Find the username of the user who initiated the skip
              const skipperUsername = data.username || 'Your chat partner';
              
              partnerConnection.send(JSON.stringify({
                type: 'partner_skipped',
                message: `${skipperUsername} wants to skip`,
                username: skipperUsername
              }));
              
              // Add partner back to waiting queue if they're still connected
              // Remove from any existing queue first to prevent duplicates
              const partnerWaitingIndex = waitingUsers.findIndex(u => u.id === partnerToNotifyOnSkip.id);
              if (partnerWaitingIndex !== -1) {
                waitingUsers.splice(partnerWaitingIndex, 1);
              }
              
              waitingUsers.push(partnerToNotifyOnSkip);
              console.log(`Added user ${partnerToNotifyOnSkip.id} back to waiting queue after partner skip`);
            }
            
            // Remove room
            activeRooms.delete(roomToClose);
            console.log(`Removed room ${roomToClose} after skip`);
            
            // Try to match users again with a delay to ensure state is updated
            setTimeout(() => matchUsers(), 1000);
          } else {
            console.log(`Skip request from user ${userId} but no active room found`);
          }
          break;
          
        case 'report':
          // Simple report handling (in a real app, you'd store this information)
          console.log(`User reported: ${data.reportedUser} by ${data.reportingUser}`);
          
          // Acknowledge report
          ws.send(JSON.stringify({
            type: 'report_acknowledged',
            message: 'Report received. Thank you for helping keep the platform safe.'
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log(`Client disconnected: ${userId}`);
    
    // Broadcast updated online count after a short delay to ensure cleanup is complete
    setTimeout(() => broadcastOnlineCount(), 100);
    
    // Remove user from waiting queue if they're there
    const waitingIndex = waitingUsers.findIndex(u => u.id === userId);
    if (waitingIndex !== -1) {
      waitingUsers.splice(waitingIndex, 1);
      console.log(`Removed disconnected user ${userId} from waiting queue`);
    }
    
    // Check if user is in an active room
    let roomToClose = null;
    let partnerToNotify = null;
    
    activeRooms.forEach((room, roomId) => {
      if (room.users.some(u => u.id === userId)) {
        roomToClose = roomId;
        partnerToNotify = room.users.find(u => u.id !== userId);
      }
    });
    
    if (roomToClose && partnerToNotify) {
      // Notify partner about disconnection
      const partnerConnection = userConnections.get(partnerToNotify.id);
      
      if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
        partnerConnection.send(JSON.stringify({
          type: 'partner_disconnected',
          message: 'Your chat partner has disconnected'
        }));
      }
      
      // Remove room
      activeRooms.delete(roomToClose);
      
      // Add partner back to waiting queue if they're still connected
      if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
        waitingUsers.push(partnerToNotify);
        
        // Try to match users again
        matchUsers();
      }
    }
    
    // Remove user connection
    userConnections.delete(userId);
    userSockets.delete(ws);
    
    // Run matchmaking again in case there are users waiting
    setTimeout(() => {
      if (waitingUsers.length >= 2) {
        console.log('Running matchmaking after user disconnection...');
        matchUsers();
      }
    }, 1000);
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    waitingUsers: waitingUsers.length,
    activeRooms: activeRooms.size
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend files at /chat route
app.use('/chat', express.static(path.join(__dirname, '../frontend')));

// Specific route for the chat application
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
