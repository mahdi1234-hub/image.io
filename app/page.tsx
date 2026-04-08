"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

interface Classification {
  className: string;
  probability: number;
}

interface VisionResult {
  detections: Detection[];
  classifications: Classification[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  visionResult?: VisionResult;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#2F5D50]" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#2F5D50]" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#2F5D50]" />
    </div>
  );
}

function ImageWithDetections({
  src,
  detections,
}: {
  src: string;
  detections: Detection[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !detections.length) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const displayW = img.clientWidth;
      const displayH = img.clientHeight;
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      canvas.width = displayW;
      canvas.height = displayH;
      setDimensions({ w: displayW, h: displayH });

      const scaleX = displayW / naturalW;
      const scaleY = displayH / naturalH;

      ctx.clearRect(0, 0, displayW, displayH);

      const colors = [
        "#2F5D50",
        "#8B5E3C",
        "#4A6FA5",
        "#9B4DCA",
        "#D4A843",
        "#C75050",
      ];

      detections.forEach((det, i) => {
        const [x, y, width, height] = det.bbox;
        const sx = x * scaleX;
        const sy = y * scaleY;
        const sw = width * scaleX;
        const sh = height * scaleY;
        const color = colors[i % colors.length];

        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, sw, sh);

        // Label background
        const label = `${det.class} ${(det.score * 100).toFixed(0)}%`;
        ctx.font = "500 10px 'Plus Jakarta Sans', sans-serif";
        ctx.letterSpacing = "0.14em";
        const textW = ctx.measureText(label.toUpperCase()).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy - 20, textW, 20);

        // Label text
        ctx.fillStyle = "#f5f1ea";
        ctx.fillText(label.toUpperCase(), sx + 6, sy - 6);
      });
    };

    if (img.complete) draw();
    else img.onload = draw;

    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [detections]);

  return (
    <div className="relative inline-block max-w-full">
      <img
        ref={imgRef}
        src={src}
        alt="Uploaded"
        className="max-w-full max-h-[400px] object-contain rounded-sm"
        crossOrigin="anonymous"
      />
      {detections.length > 0 && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: dimensions.w || "100%", height: dimensions.h || "100%" }}
        />
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-5 fade-in-up`}>
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "" : ""}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#2F5D50]" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#6f675f] font-sans">
              Vision Agent
            </span>
          </div>
        )}

        <div
          className={`rounded-sm px-5 py-4 ${
            isUser
              ? "bg-[#181512] text-[#f5f1ea]"
              : "bg-white border border-[#d9d1c5] text-[#181512]"
          }`}
        >
          {message.image && (
            <div className="mb-3">
              <ImageWithDetections
                src={message.image}
                detections={message.visionResult?.detections || []}
              />
            </div>
          )}

          {/* Vision results inline */}
          {message.visionResult && (
            <div className="mb-3 border-t border-[#d9d1c5] pt-3 mt-2">
              {message.visionResult.detections.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178] mb-2">
                    Objects Detected
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {message.visionResult.detections.map((d, i) => (
                      <div
                        key={i}
                        className="border border-[#d9d1c5] rounded-sm px-3 py-2"
                      >
                        <p className="text-[13px] font-sans text-[#181512] capitalize">
                          {d.class}
                        </p>
                        <p className="text-[10px] text-[#8a8178]">
                          {(d.score * 100).toFixed(1)}% confidence
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.visionResult.classifications.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178] mb-2">
                    Scene Classification
                  </p>
                  <div className="space-y-1">
                    {message.visionResult.classifications.slice(0, 5).map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[13px] text-[#1f1b18] font-sans capitalize">
                          {c.className}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#ebe5dc] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2F5D50] rounded-full"
                              style={{ width: `${c.probability * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#8a8178] w-10 text-right">
                            {(c.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="prose-chat text-[15px] leading-7 font-light whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cocoModelRef = useRef<any>(null);
  const mobilenetModelRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load TF models on first interaction
  const loadModels = async () => {
    if (modelsLoaded || loadingModels) return;
    setLoadingModels(true);
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const [cocoSsd, mobilenet] = await Promise.all([
        import("@tensorflow-models/coco-ssd"),
        import("@tensorflow-models/mobilenet"),
      ]);
      const [cocoModel, mobileModel] = await Promise.all([
        cocoSsd.load(),
        mobilenet.load(),
      ]);
      cocoModelRef.current = cocoModel;
      mobilenetModelRef.current = mobileModel;
      setModelsLoaded(true);
    } catch (err) {
      console.error("Failed to load TF models:", err);
    } finally {
      setLoadingModels(false);
    }
  };

  const analyzeImage = async (
    imageElement: HTMLImageElement
  ): Promise<VisionResult> => {
    const result: VisionResult = { detections: [], classifications: [] };

    if (cocoModelRef.current) {
      const predictions = await cocoModelRef.current.detect(imageElement);
      result.detections = predictions.map((p: any) => ({
        class: p.class,
        score: p.score,
        bbox: p.bbox,
      }));
    }

    if (mobilenetModelRef.current) {
      const classifications = await mobilenetModelRef.current.classify(imageElement);
      result.classifications = classifications.map((c: any) => ({
        className: c.className,
        probability: c.probability,
      }));
    }

    return result;
  };

  const handleImageUpload = async (file: File) => {
    await loadModels();

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;

      // Create image element for TF analysis
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = dataUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      setIsLoading(true);

      // Run vision analysis
      let visionResult: VisionResult = { detections: [], classifications: [] };
      try {
        visionResult = await analyzeImage(img);
      } catch (err) {
        console.error("Vision analysis failed:", err);
      }

      // Build description from vision results
      const detLabels = visionResult.detections
        .map((d) => `${d.class} (${(d.score * 100).toFixed(0)}%)`)
        .join(", ");
      const classLabels = visionResult.classifications
        .slice(0, 3)
        .map((c) => `${c.className} (${(c.probability * 100).toFixed(1)}%)`)
        .join(", ");

      const parts = [
        detLabels ? `Objects detected: ${detLabels}.` : "",
        classLabels ? `Scene classification: ${classLabels}.` : "",
      ].filter(Boolean);

      const imageDescription = parts.length > 0
        ? parts.join(" ")
        : "The image was uploaded and processed. The computer vision models were unable to identify specific objects or classify the scene with high confidence, but an image has been provided by the user. Please acknowledge the image was received and describe what a typical analysis might find, or ask the user to describe what is in the image.";

      // Add user message with image
      const userMsg: Message = {
        role: "user",
        content: input.trim() || "Analyze this image",
        image: dataUrl,
        visionResult,
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");

      // Send to LLM for natural language response
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            imageAnalysis: imageDescription,
          }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        if (reader) {
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((l) => l.trim());
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    assistantContent += parsed.content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        role: "assistant",
                        content: assistantContent,
                      };
                      return updated;
                    });
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${msg}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  return (
    <main
      className="relative w-full h-screen flex"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Left Rail */}
      <aside className="hidden lg:flex flex-col w-[280px] border-r border-[#d9d1c5] bg-[#f5f1ea] px-8 py-12">
        <div className="lg:sticky lg:top-8">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[#6f675f] font-sans mb-8">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#2F5D50]" />
            Vision Agent
          </div>

          <h1 className="font-serif text-[#181512] tracking-[-0.04em] leading-[1.04] text-[1.8rem] mb-6">
            Image<span className="italic text-[#2F5D50]">.io</span>
          </h1>

          <p className="text-[13px] leading-7 text-[#7a7268] font-sans font-light mb-8">
            An AI-powered computer vision agent. Upload images for automatic
            object detection, classification, and labeling. Or just chat about
            anything.
          </p>

          <div className="space-y-4 pt-6 border-t border-[#d9d1c5]">
            <div className="border-t border-[#d9d1c5] pt-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178] font-sans mb-1">
                01
              </p>
              <p className="text-[13px] leading-6 text-[#1f1b18] font-sans">
                Object Detection
              </p>
            </div>
            <div className="border-t border-[#d9d1c5] pt-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178] font-sans mb-1">
                02
              </p>
              <p className="text-[13px] leading-6 text-[#1f1b18] font-sans">
                Scene Classification
              </p>
            </div>
            <div className="border-t border-[#d9d1c5] pt-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178] font-sans mb-1">
                03
              </p>
              <p className="text-[13px] leading-6 text-[#1f1b18] font-sans">
                Natural Conversation
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#d9d1c5]">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  modelsLoaded
                    ? "bg-[#2F5D50]"
                    : loadingModels
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-[#d9d1c5]"
                }`}
              />
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
                {modelsLoaded
                  ? "TF Models Ready"
                  : loadingModels
                  ? "Loading Models..."
                  : "Models Idle"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f5f1ea]">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#d9d1c5]">
          <div className="flex items-center gap-3">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#2F5D50]" />
            <h1 className="font-serif text-[#181512] text-xl tracking-[-0.04em]">
              Image<span className="italic text-[#2F5D50]">.io</span>
            </h1>
          </div>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8178]">
            Vision Agent
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto chat-scroll px-6 md:px-10 py-6">
          <div className="max-w-[800px] mx-auto">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[500px] text-center fade-in-up">
                <h2 className="font-serif text-[#181512] tracking-[-0.04em] leading-[1.04] text-[2.2rem] sm:text-[2.8rem] md:text-[3.4rem] mb-6">
                  See what AI <span className="italic text-[#2F5D50]">sees</span>
                </h2>
                <p className="text-[15px] leading-8 text-[#5f5851] font-sans font-light max-w-lg mb-10">
                  Upload an image to detect objects, classify scenes, and
                  generate auto-labels. Or simply start a conversation about
                  anything.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] bg-[#2F5D50] text-[#f5f1ea] px-6 py-3 rounded-sm font-medium hover:bg-[#1f4538] transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Upload Image
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    "What can you detect in images?",
                    "Explain computer vision",
                    "How does object detection work?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-[10px] uppercase tracking-[0.14em] border border-[#d9d1c5] text-[#6f675f] px-4 py-2 rounded-sm hover:bg-white hover:text-[#181512] transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-[#d9d1c5] rounded-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-[#d9d1c5] px-6 md:px-10 py-5 bg-[#f5f1ea]">
          <div className="max-w-[800px] mx-auto">
            <div className="flex items-end gap-3 bg-white border border-[#d9d1c5] rounded-sm px-5 py-3">
              <button
                onClick={() => {
                  loadModels();
                  fileInputRef.current?.click();
                }}
                className="flex-shrink-0 p-2 text-[#7a7268] hover:text-[#2F5D50] transition-colors"
                title="Upload image"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or upload an image..."
                rows={1}
                className="flex-1 bg-transparent text-[15px] text-[#181512] font-sans font-light placeholder:text-[#b5ad9e] resize-none outline-none max-h-32 leading-relaxed"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 128) + "px";
                }}
              />

              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 text-[10px] uppercase tracking-[0.14em] bg-[#181512] text-[#f5f1ea] px-5 py-2.5 rounded-sm font-medium hover:bg-[#2F5D50] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            <p className="text-center text-[#b5ad9e] text-[10px] uppercase tracking-[0.14em] mt-3">
              Drop an image anywhere &middot; Enter to send &middot; Shift+Enter
              for new line
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </main>
  );
}
