import { useState, useRef, useEffect } from "react";
import {
    Send as SendIcon,
    AttachFile as AttachFileIcon,
    Collections as CollectionsIcon,
    Mic as MicIcon,
    Chat as ChatIcon,
    Close as CloseIcon,
} from "@mui/icons-material";

const ChatWidget = ({onClose}) => {
    const [open, setOpen] = useState(false);
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

    const WS_URL = "wss://72d57cd72974.ngrok-free.app";
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
            {/* <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg"
            >
                <ChatIcon fontSize="large" />
            </button> */}

            {/* {open && ( */}
                <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
                    <div className="bg-white w-full max-w-md h-full sm:rounded-l-2xl flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Chat</h2>
                            <button onClick={onClose}>
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Update the message display section */}
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
             {/* )} */}
        </>
    );
};

export default ChatWidget;