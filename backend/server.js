const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// In-memory data structures
const waitingUsers = []; // Queue for users waiting to be matched
const activeRooms = new Map(); // Map of active chat rooms
const userConnections = new Map(); // Map of user IDs to their WebSocket connections
const userSockets = new Map(); // Map of WebSocket to user IDs

// Set up a periodic matchmaking check (every 5 seconds)
setInterval(() => {
  if (waitingUsers.length >= 2) {
    console.log('Running periodic matchmaking check...');
    matchUsers();
  }
}, 5000);

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
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Generate a unique ID for this connection
  const userId = uuidv4();
  
  // Associate this WebSocket with the userId
  userSockets.set(ws, userId);
  
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
          // Find the room and notify partner that user is typing
          activeRooms.forEach((room) => {
            if (room.users.some(u => u.id === userId)) {
              const partner = room.users.find(u => u.id !== userId);
              const partnerConnection = userConnections.get(partner.id);
              
              if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
                partnerConnection.send(JSON.stringify({
                  type: 'typing',
                  isTyping: data.isTyping,
                  username: data.username
                }));
              }
            }
          });
          break;
          
        case 'skip':
          // Find the room - either by roomId if provided, or by searching for the user
          let roomToClose = null;
          let partnerToNotify = null;
          
          // If client provided a roomId, use it directly
          if (data.roomId && activeRooms.has(data.roomId)) {
            roomToClose = data.roomId;
            const room = activeRooms.get(data.roomId);
            partnerToNotify = room.users.find(u => u.id !== userId);
          } else {
            // Otherwise search for the room containing this user
            activeRooms.forEach((room, roomId) => {
              if (room.users.some(u => u.id === userId)) {
                roomToClose = roomId;
                partnerToNotify = room.users.find(u => u.id !== userId);
              }
            });
          }
          
          if (roomToClose && partnerToNotify) {
            console.log(`User ${userId} skipped chat in room ${roomToClose}`);
            
            // Notify partner about skip
            const partnerConnection = userConnections.get(partnerToNotify.id);
            
            if (partnerConnection && partnerConnection.readyState === WebSocket.OPEN) {
              partnerConnection.send(JSON.stringify({
                type: 'partner_skipped',
                message: 'Your chat partner has left the conversation'
              }));
              
              // Add partner back to waiting queue if they're still connected
              // Remove from any existing queue first to prevent duplicates
              const partnerWaitingIndex = waitingUsers.findIndex(u => u.id === partnerToNotify.id);
              if (partnerWaitingIndex !== -1) {
                waitingUsers.splice(partnerWaitingIndex, 1);
              }
              
              waitingUsers.push(partnerToNotify);
              console.log(`Added user ${partnerToNotify.id} back to waiting queue after partner skip`);
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
});
