// import { io } from "socket.io-client";

// let socket = null;

// export const initSocket = (conversationId, token) => {
//   if (socket) {
//     socket.disconnect();
//   }

//   socket = io('wss://ddd80f4f8433.ngrok-free.app', {
//     transports: ["websocket"],
//     query: {
//       conversationId,
//       token
//     }
//   });

//   return socket;
// };

// export const getSocket = () => socket;

// export const disconnectSocket = () => {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
// };