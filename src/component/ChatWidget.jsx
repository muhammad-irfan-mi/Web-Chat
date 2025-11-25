// import { useState, useRef, useEffect } from "react";
// import {
//     Send as SendIcon,
//     AttachFile as AttachFileIcon,
//     Collections as CollectionsIcon,
//     Mic as MicIcon,
//     Chat as ChatIcon,
//     Close as CloseIcon,
// } from "@mui/icons-material";

// const ChatWidget = ({ open, onClose }) => {
//     const [media, setMedia] = useState([]);
//     const [message, setMessage] = useState("");
//     const [recording, setRecording] = useState(false);
//     const [uploadedFiles, setUploadedFiles] = useState("");
//     const [messageType, setMessageType] = useState("text");
//     const [mediaLink, setMediaLink] = useState(null);
//     const [messages, setMessages] = useState([]);
//     const [isConnected, setIsConnected] = useState(false);

//     const messagesContainerRef = useRef(null);
//     const mediaInputRef = useRef(null);
//     const fileInputRef = useRef(null);
//     const mediaRecorderRef = useRef(null);
//     const audioChunksRef = useRef([]);
//     const wsRef = useRef(null);

//     const WS_URL = "wss://wswebchat.botnflow.com";
//     const WEBCHAT_TOKEN = "C8AAD2AA295C90618389F6EF32A98CABCC8AD0EA68D10117";
//     const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTExNjJlMDk2ZDA5Y2EyODFkNWQwZiIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzU2MzU5NjQ2LCJleHAiOjE3NTY5NjQ0NDZ9.hBcngXVL4RxLtU5pQbqQA-gd33bR8QFYHxj53Fsexkc";

//     // WebSocket Connection
//     useEffect(() => {
//         const connectWebSocket = () => {
//             try {
//                 const wsUrl = `${WS_URL}?x-webchat-token=${WEBCHAT_TOKEN}`;
//                 const ws = new WebSocket(wsUrl);
//                 wsRef.current = ws;

//                 ws.onopen = () => {
//                     console.log("WebSocket connected");
//                     setIsConnected(true);

//                     ws.send(JSON.stringify({
//                         type: 'register-client',
//                         data: { clientId: 'ZING_CLIENT_001' }
//                     }));
//                 };

//                 ws.onmessage = (event) => {
//                     try {
//                         const message = JSON.parse(event.data);
//                         console.log("Received WebSocket message:", message);

//                         switch (message.type) {
//                             case 'webchat-message':
//                                 setMessages(prev => [...prev, message.data]);
//                                 break;
//                             case 'registration-confirmed':
//                                 console.log("Client registration confirmed:", message.data);
//                                 break;
//                             case 'pong':
//                                 console.log("🏓Pong received:", message.data);
//                                 break;
//                             case 'test-message-response':
//                                 console.log("📤 Test message response:", message.data);
//                                 break;
//                             case 'error':
//                                 console.error("WebSocket error:", message.data);
//                                 break;
//                             default:
//                                 console.warn("Unknown message type:", message.type);
//                         }
//                     } catch (error) {
//                         console.error("Error parsing WebSocket message:", error);
//                     }
//                 };

//                 ws.onclose = () => {
//                     console.log("WebSocket disconnected");
//                     setIsConnected(false);

//                     setTimeout(() => {
//                         console.log("Attempting to reconnect WebSocket...");
//                         connectWebSocket();
//                     }, 3000);
//                 };

//                 ws.onerror = (error) => {
//                     console.error("WebSocket error:", error);
//                 };
//             } catch (error) {
//                 console.error("Error creating WebSocket:", error);
//             }
//         };

//         connectWebSocket();

//         return () => {
//             if (wsRef.current) {
//                 wsRef.current.close();
//             }
//         };
//     }, []);

//     const handleRemoveMedia = (index) => {
//         setMedia((prev) => prev.filter((_, i) => i !== index));
//     };

//     const handleFileChange = (e) => {
//         const file = e.target.files[0];
//         if (!file) return;
//         setMedia((prev) => [
//             ...prev,
//             { type: "file", file, url: URL.createObjectURL(file) },
//         ]);
//     };

//     const uploadFile = async (file, type) => {
//         if (type) {
//             setMessageType(type);
//         }
//         const formData = new FormData();
//         formData.append("file", file);

//         try {
//             const res = await fetch(
//                 "https://backendv2.botnflow.com/v2/helper/upload",
//                 {
//                     method: "POST",
//                     body: formData,
//                 }
//             );

//             const data = await res.json();
//             console.log(`${type} uploaded:`, data);
//             const urls = data.files.map((file) => file.url);
//             setUploadedFiles(urls);
//             console.log("urls", urls);

//             if (data.success && data.files.length > 0) {
//                 const fileInfo = data.files[0];
//                 const mainFormData = new FormData();

//                 const fileExtension = file.name.split(".").pop();
//                 const key = `923156318530/${type}/${fileInfo.fileName}`;

//                 mainFormData.append("key", key);
//                 mainFormData.append("extension", fileExtension);
//                 mainFormData.append("contentType", file.type);
//                 mainFormData.append("mediaFile", file);

//                 const mainRes = await fetch(
//                     "https://backendv2.botnflow.com/api/inbox/whatsapp/handle-media",
//                     {
//                         method: "POST",
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                         },
//                         body: mainFormData,
//                     }
//                 );

//                 const mainData = await mainRes.json();
//                 setMediaLink(mainData?.mediaId);
//                 console.log("Second API response:", mainData);
//             }

//             return data;
//         } catch (err) {
//             console.error(`Error uploading ${type}:`, err);
//         }
//     };

//     const handleMediaChange = async (e) => {
//         const file = e.target.files[0];
//         if (!file) return;

//         const localUrl = URL.createObjectURL(file);
//         const type = file.type.startsWith("image/") ? "image" : "video";

//         setMedia((prev) => [...prev, { type, url: localUrl, file }]);

//         const uploaded = await uploadFile(file, type);
//         if (uploaded?.url) {
//             setMedia((prev) =>
//                 prev.map((m) => (m.file === file ? { ...m, url: uploaded.url } : m))
//             );
//         }
//     };

//     const toggleRecording = async () => {
//         if (recording) {
//             mediaRecorderRef.current.stop();
//             setRecording(false);
//         } else {
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             mediaRecorderRef.current = new MediaRecorder(stream, {
//                 mimeType: "audio/webm",
//             });
//             audioChunksRef.current = [];
//             mediaRecorderRef.current.ondataavailable = (e) =>
//                 audioChunksRef.current.push(e.data);
//             mediaRecorderRef.current.onstop = () => {
//                 const audioBlob = new Blob(audioChunksRef.current, {
//                     type: "audio/webm",
//                 });
//                 const audioFile = new File([audioBlob], "recording.wav", {
//                     type: "audio/wav",
//                 });
//                 setMedia((prev) => [
//                     ...prev,
//                     { type: "audio", url: URL.createObjectURL(audioBlob), file: audioFile },
//                 ]);
//             };
//             mediaRecorderRef.current.start();
//             setRecording(true);
//         }
//     };

//     // Send via WebSocket
//     const handleSend = async () => {
//         if (!message.trim()) return;

//         const data = {
//             from: "https://app.zing.tel/chat-room",
//             clientId: "ZING_CLIENT_001",
//             text: { body: message },
//             type: "text",
//         };

//         try {
//             const response = await fetch(
//                 "https://backendv2.botnflow.com/webhook/webchat",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         "x-webchat-token": WEBCHAT_TOKEN,
//                     },
//                     body: JSON.stringify(data),
//                 }
//             );

//             const mainData = await response.json();
//             console.log("REST response:", mainData);
//         } catch (err) {
//             console.error("REST API error:", err);
//         }

//         if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//             const wsMessage = {
//                 type: 'test-message',
//                 data: { message: message }
//             };
//             wsRef.current.send(JSON.stringify(wsMessage));
//             console.log("Sent via WebSocket:", wsMessage);
//         } else {
//             console.error("WebSocket is not connected");
//         }

//         setMessages((prev) => [...prev, data]);
//         setMessage("");

//         if (messagesContainerRef.current) {
//             setTimeout(() => {
//                 messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//             }, 100);
//         }
//     };

//     return (
//         <>
//                 <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
//                     <div className="bg-white w-full h-full sm:rounded-l-2xl flex flex-col">
//                         <div className="flex items-center justify-between p-4 border-b">
//                             <h2 className="text-lg font-semibold">Chat</h2>

//                         </div>

//                         <div
//                             ref={messagesContainerRef}
//                             className="flex-1 overflow-y-auto p-4 text-gray-600 space-y-2"
//                         >
//                             {messages.length === 0 && (
//                                 <p className="text-center text-gray-400">
//                                     Start your conversation...
//                                 </p>
//                             )}
//                             {messages.map((m, i) => {
//                                 if (m.message && m.message.content) {
//                                     return (
//                                         <div key={i} className="flex justify-start">
//                                             <span className="p-2 px-5 inline-block bg-gray-200 rounded">
//                                                 {m.message.content}
//                                             </span>
//                                         </div>
//                                     );
//                                 }
//                                 else if (m.text && m.text.body) {
//                                     return (
//                                         <div key={i} className="flex justify-end">
//                                             <span className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
//                                                 {m.text.body}
//                                             </span>
//                                         </div>
//                                     );
//                                 }
//                                 else {
//                                     return (
//                                         <div key={i} className="flex justify-start">
//                                             <span className="p-2 px-5 inline-block bg-gray-200 rounded">
//                                                 [Unknown message format]
//                                             </span>
//                                         </div>
//                                     );
//                                 }
//                             })}
//                         </div>

//                         {/* Media Preview */}
//                         {media.length > 0 && (
//                             <div className="p-2 flex flex-wrap gap-2 border-t">
//                                 {media.map((item, i) => (
//                                     <div key={i} className="relative">
//                                         {item.type === "image" && (
//                                             <img
//                                                 src={item.url}
//                                                 alt="preview"
//                                                 className="w-16 h-16 rounded-md object-cover"
//                                             />
//                                         )}
//                                         {item.type === "video" && (
//                                             <video
//                                                 src={item.url}
//                                                 className="w-20 h-16 rounded-md"
//                                                 controls
//                                             />
//                                         )}
//                                         {item.type === "file" && (
//                                             <p className="text-sm text-gray-600 bg-gray-100 p-1 rounded max-w-[120px] truncate">
//                                                 📎 {item.file.name}
//                                             </p>
//                                         )}
//                                         {item.type === "audio" && (
//                                             <audio controls src={item.url}></audio>
//                                         )}
//                                         <button
//                                             onClick={() => handleRemoveMedia(i)}
//                                             className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 px-2 text-sm"
//                                         >
//                                             ✕
//                                         </button>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}

//                         <div className="flex items-center gap-2 p-3 border-t">
//                             <button
//                                 onClick={() => fileInputRef.current.click()}
//                                 className="text-gray-600 hover:text-blue-600"
//                             >
//                                 <AttachFileIcon />
//                             </button>
//                             <input
//                                 type="text"
//                                 placeholder="Type a message..."
//                                 value={message}
//                                 onChange={(e) => setMessage(e.target.value)}
//                                 onKeyPress={(e) => {
//                                     if (e.key === 'Enter') handleSend();
//                                 }}
//                                 className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             />
//                             <button
//                                 onClick={() => mediaInputRef.current.click()}
//                                 className="text-gray-600 hover:text-blue-600"
//                             >
//                                 <CollectionsIcon />
//                             </button>
//                             <button
//                                 onClick={toggleRecording}
//                                 className={`text-gray-600 ${recording ? "text-red-600" : "hover:text-blue-600"
//                                     }`}
//                             >
//                                 <MicIcon />
//                             </button>
//                             <input
//                                 type="file"
//                                 accept="image/*,video/*"
//                                 ref={mediaInputRef}
//                                 className="hidden"
//                                 onChange={handleMediaChange}
//                             />
//                             <input
//                                 type="file"
//                                 ref={fileInputRef}
//                                 className="hidden"
//                                 onChange={handleFileChange}
//                             />
//                             <button className="text-blue-600" onClick={handleSend}>
//                                 <SendIcon fontSize="large" />
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//         </>
//     );
// };

// export default ChatWidget;


















import { useState, useRef, useEffect } from "react";
import {
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    Collections as CollectionsIcon,
    Mic as MicIcon,
    Chat as ChatIcon,
    Close as CloseIcon,
    PlayCircle,
    SmartToy as SmartToyIcon,
} from "@mui/icons-material";

const ChatWidget = ({ open, onClose }) => {
    const [media, setMedia] = useState([]);
    const [message, setMessage] = useState("");
    const [recording, setRecording] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState("");
    const [messageType, setMessageType] = useState("text");
    const [mediaLink, setMediaLink] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    const messagesContainerRef = useRef(null);
    const mediaInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const wsRef = useRef(null);

    const WS_URL = "wss://wswebchat.botnflow.com";
    const WEBCHAT_TOKEN = "C8AAD2AA295C90618389F6EF32A98CABCC8AD0EA68D10117";
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NTExNjJlMDk2ZDA5Y2EyODFkNWQwZiIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzU2MzU5NjQ2LCJleHAiOjE3NTY5NjQ0NDZ9.hBcngXVL4RxLtU5pQbqQA-gd33bR8QFYHxj53Fsexkc";

    // WebSocket Connection
    useEffect(() => {
        const connectWebSocket = () => {
            try {
                const wsUrl = `${WS_URL}?x-webchat-token=${WEBCHAT_TOKEN}`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log("WebSocket connected");
                    setIsConnected(true);

                    ws.send(JSON.stringify({
                        type: 'register-client',
                        data: { clientId: 'ZING_CLIENT_001' }
                    }));
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log("Received WebSocket message:", message);

                        // Handle different message formats
                        if (message.type === 'webchat-message' && message.data) {
                            setMessages(prev => [...prev, message.data]);
                        }
                        else if (message.event === 'new_message' && message.messageData) {
                            // Handle new_message event format
                            setMessages(prev => [...prev, message.messageData]);
                        }
                        else if (message.message && message.message.content) {
                            // Direct message format
                            setMessages(prev => [...prev, message]);
                        }
                        else if (message.type === 'registration-confirmed') {
                            console.log("Client registration confirmed:", message.data);
                        }
                        else if (message.type === 'pong') {
                            console.log("Pong received:", message.data);
                        }
                        else if (message.type === 'test-message-response') {
                            console.log("Test message response:", message.data);
                        }
                        else if (message.type === 'error') {
                            console.error("WebSocket error:", message.data);
                        }
                        else {
                            console.warn("Unknown message type:", message);
                            // Add unknown message for debugging
                            setMessages(prev => [...prev, {
                                _id: Date.now().toString(),
                                content: JSON.stringify(message),
                                messageType: 'unknown',
                                botMessage: true
                            }]);
                        }
                    } catch (error) {
                        console.error("Error parsing WebSocket message:", error);
                    }
                };

                ws.onclose = () => {
                    console.log("WebSocket disconnected");
                    setIsConnected(false);

                    setTimeout(() => {
                        console.log("Attempting to reconnect WebSocket...");
                        connectWebSocket();
                    }, 3000);
                };

                ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                };
            } catch (error) {
                console.error("Error creating WebSocket:", error);
            }
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleRemoveMedia = (index) => {
        setMedia((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMedia((prev) => [
            ...prev,
            { type: "file", file, url: URL.createObjectURL(file) },
        ]);
    };

    const uploadFile = async (file, type) => {
        if (type) {
            setMessageType(type);
        }
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(
                "https://backendv2.botnflow.com/v2/helper/upload",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await res.json();
            console.log(`${type} uploaded:`, data);
            const urls = data.files.map((file) => file.url);
            setUploadedFiles(urls);
            console.log("urls", urls);

            if (data.success && data.files.length > 0) {
                const fileInfo = data.files[0];
                const mainFormData = new FormData();

                const fileExtension = file.name.split(".").pop();
                const key = `923156318530/${type}/${fileInfo.fileName}`;

                mainFormData.append("key", key);
                mainFormData.append("extension", fileExtension);
                mainFormData.append("contentType", file.type);
                mainFormData.append("mediaFile", file);

                const mainRes = await fetch(
                    "https://backendv2.botnflow.com/api/inbox/whatsapp/handle-media",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: mainFormData,
                    }
                );

                const mainData = await mainRes.json();
                setMediaLink(mainData?.mediaId);
                console.log("Second API response:", mainData);
            }

            return data;
        } catch (err) {
            console.error(`Error uploading ${type}:`, err);
        }
    };

    const handleMediaChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        const type = file.type.startsWith("image/") ? "image" : "video";

        setMedia((prev) => [...prev, { type, url: localUrl, file }]);

        const uploaded = await uploadFile(file, type);
        if (uploaded?.url) {
            setMedia((prev) =>
                prev.map((m) => (m.file === file ? { ...m, url: uploaded.url } : m))
            );
        }
    };

    const toggleRecording = async () => {
        if (recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: "audio/webm",
            });
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) =>
                audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                const audioFile = new File([audioBlob], "recording.wav", {
                    type: "audio/wav",
                });
                setMedia((prev) => [
                    ...prev,
                    { type: "audio", url: URL.createObjectURL(audioBlob), file: audioFile },
                ]);
            };
            mediaRecorderRef.current.start();
            setRecording(true);
        }
    };

    // Send via WebSocket
    const handleSend = async () => {
        if (!message.trim()) return;

        const data = {
            from: "https://app.zing.tel/chat-room",
            clientId: "ZING_CLIENT_001",
            text: { body: message },
            type: "text",
        };

        try {
            const response = await fetch(
                "https://backendv2.botnflow.com/webhook/webchat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-webchat-token": WEBCHAT_TOKEN,
                    },
                    body: JSON.stringify(data),
                }
            );

            const mainData = await response.json();
            console.log("REST response:", mainData);
        } catch (err) {
            console.error("REST API error:", err);
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const wsMessage = {
                type: 'test-message',
                data: { message: message }
            };
            wsRef.current.send(JSON.stringify(wsMessage));
            console.log("Sent via WebSocket:", wsMessage);
        } else {
            console.error("WebSocket is not connected");
        }

        // Add user message to local state immediately
        setMessages((prev) => [...prev, {
            _id: Date.now().toString(),
            text: { body: message },
            botMessage: false,
            createdAt: new Date().toISOString()
        }]);
        setMessage("");

        if (messagesContainerRef.current) {
            setTimeout(() => {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }, 100);
        }
    };

    // Render message content based on message type
    const renderMessageContent = (m) => {
        // User text messages
        if (m.text && m.text.body) {
            return (
                <div className="flex justify-end">
                    <span className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
                        {m.text.body}
                    </span>
                </div>
            );
        }

        // Bot text messages
        else if (m.message && m.message.content) {
            return (
                <div className="flex justify-start">
                    <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                        {m.message.content}
                    </span>
                </div>
            );
        }

        // Direct content messages
        else if (m.content && m.messageType === "text") {
            return (
                <div className="flex justify-start">
                    <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                        {m.content}
                    </span>
                </div>
            );
        }

        // Image messages
        else if (m.messageType === "image" && m.mediaUrl) {
            return (
                <div className="flex justify-start">
                    <div className="max-w-xs">
                        <img
                            src={m.mediaUrl}
                            alt="media"
                            className="rounded-lg w-full h-auto object-cover"
                        />
                        {m.content && (
                            <p className="text-sm mt-1 p-2 bg-gray-200 rounded">
                                {m.content}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // Video messages
        else if (m.messageType === "video" && m.mediaUrl) {
            return (
                <div className="flex justify-start">
                    <div className="max-w-xs">
                        <video
                            controls
                            playsInline
                            className="rounded-lg w-full h-auto object-cover"
                            src={m.mediaUrl}
                        />
                        {m.content && (
                            <p className="text-sm mt-1 p-2 bg-gray-200 rounded">
                                {m.content}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // Audio messages
        else if (m.messageType === "audio" && m.mediaUrl) {
            return (
                <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const audio = document.getElementById(`audio-${m._id}`);
                                    if (audio) {
                                        if (audio.paused) audio.play();
                                        else audio.pause();
                                    }
                                }}
                                className="cursor-pointer text-gray-700"
                            >
                                <PlayCircle />
                            </button>
                            <div className="flex-1 h-1 bg-gray-300 rounded">
                                <div
                                    id={`progress-${m._id}`}
                                    className="h-1 bg-blue-500 rounded"
                                    style={{ width: "0%" }}
                                />
                            </div>
                            <span
                                id={`duration-${m._id}`}
                                className="text-xs text-gray-600"
                            >
                                0:00
                            </span>
                            <audio
                                id={`audio-${m._id}`}
                                src={m.mediaUrl}
                                onTimeUpdate={(e) => {
                                    const audio = e.target;
                                    if (audio && audio.duration) {
                                        const progress = (audio.currentTime / audio.duration) * 100;
                                        const progressEl = document.getElementById(`progress-${m._id}`);
                                        if (progressEl) progressEl.style.width = `${progress}%`;
                                        const durationEl = document.getElementById(`duration-${m._id}`);
                                        if (durationEl) durationEl.innerText = new Date(audio.currentTime * 1000)
                                            .toISOString()
                                            .substring(14, 19);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        // Document/File messages
        else if ((m.messageType === "file" || m.messageType === "document") && m.mediaUrl) {
            return (
                <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                        <div className="flex items-center gap-2">
                            <AttachFileIcon fontSize="small" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {m.content || "Document"}
                                </p>
                                <a
                                    href={m.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Download File
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Unknown message format for debugging
        else if (m.messageType === 'unknown') {
            return (
                <div className="flex justify-start">
                    <span className="p-2 px-5 inline-block bg-yellow-200 rounded text-xs">
                        Debug: {m.content}
                    </span>
                </div>
            );
        }

        // Fallback for unknown message formats
        else {
            return (
                <div className="flex justify-start">
                    <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                        [Unknown message format]
                    </span>
                </div>
            );
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
                <div className="bg-white w-full h-full sm:rounded-l-2xl flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <div className="bg-gray-300 rounded-full p-1 flex items-center justify-center">
                                <SmartToyIcon fontSize="small" className="text-gray-600" />
                            </div>
                            <h2 className="text-lg font-semibold">Chat Support</h2>
                            <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 text-gray-600 space-y-2"
                    >
                        {messages.length === 0 && (
                            <p className="text-center text-gray-400">
                                Start your conversation...
                            </p>
                        )}
                        {messages.map((m, i) => {
                            console.log("message in webchat", messages)
                            if (m.message && m.message.content) {
                                return (
                                    <div key={i} className="flex justify-start mb-2">
                                        <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                            {m.message.content}
                                        </span>
                                    </div>
                                );
                            }
                            else if (m.message && m.message?.type === "button") {
                                return (
                                    <div key={i} className="flex flex-col justify-start mb-2 w-[80%] bg-gray-100 p-3 rounded-lg">
                                        {m.message?.mediaUrl && (
                                            <img
                                                src={m.message?.mediaUrl}
                                                alt="button media"
                                                className="w-[90%] h-auto rounded mb-1 ml-5"
                                            />
                                        )}

                                        {m.message?.header?.text && (
                                            <span className="p-2 px-5 inline-block rounded font-semibold mb-1">
                                                {m.message?.header?.text}
                                            </span>
                                        )}

                                        {m.message?.body && (
                                            <span className=" px-5 inline-block rounded mb-1">
                                                {m.message?.body}
                                            </span>
                                        )}

                                        {m.message?.footer && (
                                            <span className=" px-5 inline-block rounded mb-1">
                                                {m.message?.footer}
                                            </span>
                                        )}

                                        {m.message?.buttons && m.message?.buttons.length > 0 && (
                                            <div className="flex gap-2 mt-1 ml-5">
                                                {m.message.buttons.map((b) => (
                                                    <button
                                                        key={b.id}
                                                        className="px-3 py-1 rounded bg-blue-500 text-white text-sm"
                                                    >
                                                        {b.title || b.text}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            else if (m.message && m.message?.type === "image") {
                                return (
                                    <div key={i} className="flex flex-col justify-start mb-2 w-[80%] bg-gray-100 p-3 rounded-lg">
                                        {m.message?.mediaUrl && (
                                            <img
                                                src={m.message?.mediaUrl}
                                                alt="button media"
                                                className="w-[90%] h-auto rounded mb-1 ml-5"
                                            />
                                        )}
                                    </div>
                                );
                            }

                            else if (m.message && m.message?.type === "video") {
                                return (
                                    <div className="w-full">
                                        <video
                                            controls
                                            playsInline
                                            className="rounded-lg w-full max-h-60 object-cover cursor-pointer"
                                            src={m.message?.mediaUrl}
                                        />
                                        {m.message?.content && (
                                            <p
                                                className="text-sm mt-1 px-2 pr-12"
                                                style={{ whiteSpace: "pre-line" }}
                                            >
                                                {m.message?.content}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            else if (m.message && m.message?.type === "audio") {
                                return (
                                    <div className="w-full">
                                        <audio
                                            controls
                                            playsInline
                                            className="rounded-lg w-full max-h-60 object-cover cursor-pointer"
                                            src={m.message?.mediaUrl}
                                        />
                                        {m.message?.content && (
                                            <p
                                                className="text-sm mt-1 px-2 pr-12"
                                                style={{ whiteSpace: "pre-line" }}
                                            >
                                                {m.message?.content}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            else if (m.message && m.message?.type === "document") {
                                return (
                                    <>
                                        <h1>Document</h1>
                                        <div>
                                            <a
                                                href={m.message?.mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-600 underline cursor-pointer"
                                            >
                                                Download File
                                            </a>
                                        </div>
                                    </>
                                );
                            }

                            else if (m.text && m.text.body) {
                                return (
                                    <div key={i} className="flex justify-end mb-2">
                                        <span className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
                                            {m.text.body}
                                        </span>
                                    </div>
                                );
                            }

                            else if (m.data && m.data.message) {
                                const msg = m.data.message;
                                console.log('msg in webchat', msg)


                                if (msg.type === "image" && msg.mediaUrl) {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <img
                                                src={msg.mediaUrl}
                                                alt="webchat image"
                                                className="w-40 h-auto rounded"
                                            />
                                        </div>
                                    );
                                }

                                // Video type
                                else if (msg.type === "video" && msg.mediaUrl) {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <video controls className="w-60 rounded">
                                                <source src={msg.mediaUrl} type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    );
                                }

                                // Audio type
                                else if (msg.type === "audio" && msg.mediaUrl) {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <audio controls className="w-60">
                                                <source src={msg.mediaUrl} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    );
                                }

                                // Document type
                                else if (msg.type === "document" && msg.mediaUrl) {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <a
                                                href={msg.mediaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 inline-block bg-gray-200 rounded text-blue-600 underline"
                                            >
                                                {msg.body || "Document"}
                                            </a>
                                        </div>
                                    );
                                }

                                // Text type in data.message
                                else if (msg.type === "text" && msg.body) {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                                {msg.body}
                                            </span>
                                        </div>
                                    );
                                }

                                // Fallback for unknown types
                                else {
                                    return (
                                        <div key={i} className="flex justify-start mb-2">
                                            <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                                [Unknown webchat message]
                                            </span>
                                        </div>
                                    );
                                }
                            }

                            else {
                                return (
                                    <div key={i} className="flex justify-start mb-2">
                                        <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                            [Unknown message format]
                                        </span>
                                    </div>
                                );
                            }
                        })}
                    </div>

                    {media.length > 0 && (
                        <div className="p-2 flex flex-wrap gap-2 border-t">
                            {media.map((item, i) => (
                                <div key={i} className="relative">
                                    {item.type === "image" && (
                                        <img
                                            src={item.url}
                                            alt="preview"
                                            className="w-16 h-16 rounded-md object-cover"
                                        />
                                    )}
                                    {item.type === "video" && (
                                        <video
                                            src={item.url}
                                            className="w-20 h-16 rounded-md"
                                            controls
                                        />
                                    )}
                                    {item.type === "file" && (
                                        <p className="text-sm text-gray-600 bg-gray-100 p-1 rounded max-w-[120px] truncate">
                                            📎 {item.file.name}
                                        </p>
                                    )}
                                    {item.type === "audio" && (
                                        <audio controls src={item.url}></audio>
                                    )}
                                    <button
                                        onClick={() => handleRemoveMedia(i)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 px-2 text-sm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2 p-3 border-t">
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100"
                        >
                            <AttachFileIcon />
                        </button>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleSend();
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={() => mediaInputRef.current.click()}
                            className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100"
                        >
                            <CollectionsIcon />
                        </button>
                        <button
                            onClick={toggleRecording}
                            className={`p-2 rounded-full hover:bg-gray-100 ${recording ? "text-red-600" : "text-gray-600 hover:text-blue-600"}`}
                        >
                            <MicIcon />
                        </button>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            ref={mediaInputRef}
                            className="hidden"
                            onChange={handleMediaChange}
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            className="text-blue-600 p-2 rounded-full hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            onClick={handleSend}
                            disabled={!message.trim()}
                        >
                            <SendIcon fontSize="medium" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatWidget;