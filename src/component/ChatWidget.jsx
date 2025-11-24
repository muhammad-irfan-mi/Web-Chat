import { useState, useRef, useEffect } from "react";
import {
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    Collections as CollectionsIcon,
    Mic as MicIcon,
    Chat as ChatIcon,
    Close as CloseIcon,
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

                        switch (message.type) {
                            case 'webchat-message':
                                setMessages(prev => [...prev, message.data]);
                                break;
                            case 'registration-confirmed':
                                console.log("Client registration confirmed:", message.data);
                                break;
                            case 'pong':
                                console.log("🏓Pong received:", message.data);
                                break;
                            case 'test-message-response':
                                console.log("📤 Test message response:", message.data);
                                break;
                            case 'error':
                                console.error("WebSocket error:", message.data);
                                break;
                            default:
                                console.warn("Unknown message type:", message.type);
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

        setMessages((prev) => [...prev, data]);
        setMessage("");

        if (messagesContainerRef.current) {
            setTimeout(() => {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }, 100);
        }
    };

    return (
        <>
                <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
                    <div className="bg-white w-full h-full sm:rounded-l-2xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Chat</h2>
                         
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
                            {/* {messages.map((m, i) => {
                                if (m.message && m.message.content) {
                                    return (
                                        <div key={i} className="flex justify-start">
                                            <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                                {m.message.content}
                                            </span>
                                        </div>
                                    );
                                }
                                else if (m.text && m.text.body) {
                                    return (
                                        <div key={i} className="flex justify-end">
                                            <span className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
                                                {m.text.body}
                                            </span>
                                        </div>
                                    );
                                }
                                else {
                                    return (
                                        <div key={i} className="flex justify-start">
                                            <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                                                [Unknown message format]
                                            </span>
                                        </div>
                                    );
                                }
                            })} */}
                            {messages.map((m, i) => {
    // Handle incoming bot messages (from WebSocket)
    if (m.message && m.message.content) {
        return (
            <div key={i} className="flex justify-start">
                <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                    {m.message.content}
                </span>
            </div>
        );
    }
    // Handle outgoing user text messages
    else if (m.text && m.text.body) {
        return (
            <div key={i} className="flex justify-end">
                <span className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
                    {m.text.body}
                </span>
            </div>
        );
    }
    // Handle structured messages with messageType
    else if (m.messageType) {
        switch (m.messageType) {
            case "text":
                return (
                    <div key={i} className={`flex ${m.botMessage ? 'justify-start' : 'justify-end'}`}>
                        <div className={`p-2 px-5 inline-block rounded ${m.botMessage ? 'bg-gray-200' : 'bg-blue-200'}`}>
                            {m.content}
                        </div>
                    </div>
                );

            case "image":
                return (
                    <div key={i} className="flex justify-start">
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

            case "video":
                return (
                    <div key={i} className="flex justify-start">
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

            case "audio":
                return (
                    <div key={i} className="flex justify-start">
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

            case "file":
            case "document":
                return (
                    <div key={i} className="flex justify-start">
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

            case "button":
                return (
                    <div key={i} className="flex justify-start">
                        <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
                            {m.mediaUrl && (
                                <img
                                    src={m.mediaUrl}
                                    alt="media"
                                    className="rounded-lg w-full h-auto object-cover mb-2"
                                />
                            )}
                            
                            {m.button?.header?.type === "image" && m.button?.header?.mediaUrl && (
                                <img
                                    src={m.button.header.mediaUrl}
                                    alt="Header"
                                    className="rounded-lg w-full h-auto object-cover mb-2"
                                />
                            )}

                            {m.button?.header?.type === "text" && (
                                <h3 className="font-semibold text-lg mb-2">
                                    {m.button.header.text}
                                </h3>
                            )}

                            {m.button?.body && (
                                <p className="text-gray-800 mb-2">
                                    {m.button.body}
                                </p>
                            )}
                            
                            {m.button?.footer && (
                                <p className="text-gray-500 text-sm mb-3">
                                    {m.button.footer}
                                </p>
                            )}

                            <div className="flex flex-col gap-2">
                                {(m.button?.buttons || []).map((button, index) => (
                                    <button
                                        key={index}
                                        className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition text-sm"
                                        onClick={() => console.log("Button clicked:", button)}
                                    >
                                        {button.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "button_reply":
                return (
                    <div key={i} className="flex justify-end">
                        <div className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
                            {m.buttonReply?.buttonReply || m.content}
                        </div>
                    </div>
                );

            default:
                return (
                    <div key={i} className="flex justify-start">
                        <div className="p-2 px-5 inline-block bg-gray-200 rounded">
                            [Unknown message type: {m.messageType}]
                        </div>
                    </div>
                );
        }
    }
    // Fallback for unknown message formats
    else {
        return (
            <div key={i} className="flex justify-start">
                <span className="p-2 px-5 inline-block bg-gray-200 rounded">
                    [Unknown message format]
                </span>
            </div>
        );
    }
})}
                        </div>

                        {/* Media Preview */}
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
                                className="text-gray-600 hover:text-blue-600"
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
                                className="text-gray-600 hover:text-blue-600"
                            >
                                <CollectionsIcon />
                            </button>
                            <button
                                onClick={toggleRecording}
                                className={`text-gray-600 ${recording ? "text-red-600" : "hover:text-blue-600"
                                    }`}
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
                            <button className="text-blue-600" onClick={handleSend}>
                                <SendIcon fontSize="large" />
                            </button>
                        </div>
                    </div>
                </div>
        </>
    );
};

export default ChatWidget;




























// import { useState, useRef, useEffect } from "react";
// import {
//     Send as SendIcon,
//     AttachFile as AttachFileIcon,
//     Collections as CollectionsIcon,
//     Mic as MicIcon,
//     Chat as ChatIcon,
//     Close as CloseIcon,
//     SmartToy as SmartToyIcon,
//     PlayCircle,
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

//     // Auto-scroll to bottom when new messages arrive
//     useEffect(() => {
//         if (messagesContainerRef.current) {
//             messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//         }
//     }, [messages]);

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

//     // Render different message types
//     const renderMessageContent = (msg) => {
//         switch (msg.messageType) {
//             case "text":
//                 return (
//                     <div className="p-2 px-5 inline-block bg-gray-200 rounded">
//                         {msg.content}
//                     </div>
//                 );

//             case "image":
//                 return (
//                     <div className="flex justify-start">
//                         <div className="max-w-xs">
//                             <img
//                                 src={msg.mediaUrl}
//                                 alt="media"
//                                 className="rounded-lg w-full h-auto object-cover"
//                             />
//                             {msg.content && (
//                                 <p className="text-sm mt-1 p-2 bg-gray-200 rounded">
//                                     {msg.content}
//                                 </p>
//                             )}
//                         </div>
//                     </div>
//                 );

//             case "video":
//                 return (
//                     <div className="flex justify-start">
//                         <div className="max-w-xs">
//                             <video
//                                 controls
//                                 playsInline
//                                 className="rounded-lg w-full h-auto object-cover"
//                                 src={msg.mediaUrl}
//                             />
//                             {msg.content && (
//                                 <p className="text-sm mt-1 p-2 bg-gray-200 rounded">
//                                     {msg.content}
//                                 </p>
//                             )}
//                         </div>
//                     </div>
//                 );

//             case "audio":
//                 return (
//                     <div className="flex justify-start">
//                         <div className="bg-gray-200 rounded-lg p-3">
//                             <div className="flex items-center gap-3">
//                                 <button
//                                     onClick={(e) => {
//                                         e.stopPropagation();
//                                         const audio = document.getElementById(`audio-${msg._id}`);
//                                         if (audio) {
//                                             if (audio.paused) audio.play();
//                                             else audio.pause();
//                                         }
//                                     }}
//                                     className="cursor-pointer text-gray-700"
//                                 >
//                                     <PlayCircle />
//                                 </button>
//                                 <div className="flex-1 h-1 bg-gray-300 rounded">
//                                     <div
//                                         id={`progress-${msg._id}`}
//                                         className="h-1 bg-blue-500 rounded"
//                                         style={{ width: "0%" }}
//                                     />
//                                 </div>
//                                 <span
//                                     id={`duration-${msg._id}`}
//                                     className="text-xs text-gray-600"
//                                 >
//                                     0:00
//                                 </span>
//                                 <audio
//                                     id={`audio-${msg._id}`}
//                                     src={msg.mediaUrl}
//                                     onTimeUpdate={(e) => {
//                                         const audio = e.target;
//                                         if (audio && audio.duration) {
//                                             const progress = (audio.currentTime / audio.duration) * 100;
//                                             const progressEl = document.getElementById(`progress-${msg._id}`);
//                                             if (progressEl) progressEl.style.width = `${progress}%`;
//                                             const durationEl = document.getElementById(`duration-${msg._id}`);
//                                             if (durationEl) durationEl.innerText = new Date(audio.currentTime * 1000)
//                                                 .toISOString()
//                                                 .substring(14, 19);
//                                         }
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 );

//             case "file":
//             case "document":
//                 return (
//                     <div className="flex justify-start">
//                         <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
//                             <div className="flex items-center gap-2">
//                                 <AttachFileIcon fontSize="small" />
//                                 <div className="flex-1 min-w-0">
//                                     <p className="text-sm font-medium truncate">
//                                         {msg.content || "Document"}
//                                     </p>
//                                     <a
//                                         href={msg.mediaUrl}
//                                         target="_blank"
//                                         rel="noopener noreferrer"
//                                         className="text-xs text-blue-600 hover:underline"
//                                         onClick={(e) => e.stopPropagation()}
//                                     >
//                                         Download File
//                                     </a>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 );

//             case "button":
//                 return (
//                     <div className="flex justify-start">
//                         <div className="bg-gray-200 rounded-lg p-3 max-w-xs">
//                             {msg.mediaUrl && (
//                                 <img
//                                     src={msg.mediaUrl}
//                                     alt="media"
//                                     className="rounded-lg w-full h-auto object-cover mb-2"
//                                 />
//                             )}
                            
//                             {msg.button?.header?.type === "image" && msg.button?.header?.mediaUrl && (
//                                 <img
//                                     src={msg.button.header.mediaUrl}
//                                     alt="Header"
//                                     className="rounded-lg w-full h-auto object-cover mb-2"
//                                 />
//                             )}

//                             {msg.button?.header?.type === "text" && (
//                                 <h3 className="font-semibold text-lg mb-2">
//                                     {msg.button.header.text}
//                                 </h3>
//                             )}

//                             {msg.button?.body && (
//                                 <p className="text-gray-800 mb-2">
//                                     {msg.button.body}
//                                 </p>
//                             )}
                            
//                             {msg.button?.footer && (
//                                 <p className="text-gray-500 text-sm mb-3">
//                                     {msg.button.footer}
//                                 </p>
//                             )}

//                             <div className="flex flex-col gap-2">
//                                 {(msg.button?.buttons || []).map((button, index) => (
//                                     <button
//                                         key={index}
//                                         className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition text-sm"
//                                         onClick={() => console.log("Button clicked:", button)}
//                                     >
//                                         {button.title}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//                     </div>
//                 );

//             case "button_reply":
//                 return (
//                     <div className="flex justify-end">
//                         <div className="p-2 px-5 inline-block bg-blue-200 rounded text-right">
//                             {msg.buttonReply?.buttonReply || msg.content}
//                         </div>
//                     </div>
//                 );

//             default:
//                 return (
//                     <div className="flex justify-start">
//                         <div className="p-2 px-5 inline-block bg-gray-200 rounded">
//                             [Unknown message format: {msg.messageType}]
//                         </div>
//                     </div>
//                 );
//         }
//     };

//     // Send via WebSocket
//     const handleSend = async () => {
//         if (!message.trim() && media.length === 0) return;

//         let data = {};
        
//         if (media.length > 0) {
//             // Handle media messages
//             const mediaItem = media[0];
//             data = {
//                 from: "https://app.zing.tel/chat-room",
//                 clientId: "ZING_CLIENT_001",
//                 type: mediaItem.type,
//                 mediaUrl: mediaItem.url,
//                 ...(message.trim() && { text: { body: message } })
//             };
//         } else {
//             // Handle text messages
//             data = {
//                 from: "https://app.zing.tel/chat-room",
//                 clientId: "ZING_CLIENT_001",
//                 text: { body: message },
//                 type: "text",
//             };
//         }

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

//         // Add to local messages for immediate display
//         const newMessage = {
//             _id: Date.now().toString(),
//             messageType: media.length > 0 ? media[0].type : "text",
//             content: message,
//             mediaUrl: media.length > 0 ? media[0].url : null,
//             createdAt: new Date().toISOString(),
//             botMessage: false
//         };

//         setMessages((prev) => [...prev, newMessage]);
//         setMessage("");
//         setMedia([]);

//         if (messagesContainerRef.current) {
//             setTimeout(() => {
//                 messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
//             }, 100);
//         }
//     };

//     return (
//         <>
//             <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
//                 <div className="bg-white w-full h-full sm:rounded-l-2xl flex flex-col">
//                     <div className="flex items-center justify-between p-4 border-b">
//                         <div className="flex items-center gap-2">
//                             <div className="bg-gray-300 rounded-full p-1 flex items-center justify-center">
//                                 <SmartToyIcon fontSize="small" className="text-gray-600" />
//                             </div>
//                             <h2 className="text-lg font-semibold">Chat Support</h2>
//                         </div>
//                         <button
//                             onClick={onClose}
//                             className="text-gray-500 hover:text-gray-700"
//                         >
//                             <CloseIcon />
//                         </button>
//                     </div>

//                     <div
//                         ref={messagesContainerRef}
//                         className="flex-1 overflow-y-auto p-4 text-gray-600 space-y-4"
//                     >
//                         {messages.length === 0 && (
//                             <div className="text-center text-gray-400 py-8">
//                                 <SmartToyIcon fontSize="large" className="mb-2" />
//                                 <p>Start your conversation with our support bot</p>
//                             </div>
//                         )}
//                         {messages.map((msg, i) => (
//                             <div key={msg._id || i} className={`flex ${msg.botMessage ? 'justify-start' : 'justify-end'}`}>
//                                 {renderMessageContent(msg)}
//                             </div>
//                         ))}
//                     </div>

//                     {/* Media Preview */}
//                     {media.length > 0 && (
//                         <div className="p-2 flex flex-wrap gap-2 border-t">
//                             {media.map((item, i) => (
//                                 <div key={i} className="relative">
//                                     {item.type === "image" && (
//                                         <img
//                                             src={item.url}
//                                             alt="preview"
//                                             className="w-16 h-16 rounded-md object-cover"
//                                         />
//                                     )}
//                                     {item.type === "video" && (
//                                         <video
//                                             src={item.url}
//                                             className="w-20 h-16 rounded-md"
//                                             controls
//                                         />
//                                     )}
//                                     {item.type === "file" && (
//                                         <p className="text-sm text-gray-600 bg-gray-100 p-1 rounded max-w-[120px] truncate">
//                                             📎 {item.file.name}
//                                         </p>
//                                     )}
//                                     {item.type === "audio" && (
//                                         <audio controls src={item.url}></audio>
//                                     )}
//                                     <button
//                                         onClick={() => handleRemoveMedia(i)}
//                                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 px-2 text-sm"
//                                     >
//                                         ✕
//                                     </button>
//                                 </div>
//                             ))}
//                         </div>
//                     )}

//                     <div className="flex items-center gap-2 p-3 border-t">
//                         <button
//                             onClick={() => fileInputRef.current.click()}
//                             className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100"
//                         >
//                             <AttachFileIcon />
//                         </button>
//                         <input
//                             type="text"
//                             placeholder="Type a message..."
//                             value={message}
//                             onChange={(e) => setMessage(e.target.value)}
//                             onKeyPress={(e) => {
//                                 if (e.key === 'Enter') handleSend();
//                             }}
//                             className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                         />
//                         <button
//                             onClick={() => mediaInputRef.current.click()}
//                             className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100"
//                         >
//                             <CollectionsIcon />
//                         </button>
//                         <button
//                             onClick={toggleRecording}
//                             className={`p-2 rounded-full hover:bg-gray-100 ${recording ? "text-red-600" : "text-gray-600 hover:text-blue-600"
//                                 }`}
//                         >
//                             <MicIcon />
//                         </button>
//                         <input
//                             type="file"
//                             accept="image/*,video/*"
//                             ref={mediaInputRef}
//                             className="hidden"
//                             onChange={handleMediaChange}
//                         />
//                         <input
//                             type="file"
//                             ref={fileInputRef}
//                             className="hidden"
//                             onChange={handleFileChange}
//                         />
//                         <button 
//                             className="text-blue-600 p-2 rounded-full hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed"
//                             onClick={handleSend}
//                             disabled={!message.trim() && media.length === 0}
//                         >
//                             <SendIcon fontSize="medium" />
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default ChatWidget;