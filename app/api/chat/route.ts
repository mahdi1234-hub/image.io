import { NextRequest, NextResponse } from "next/server";

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "";
const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";

const SYSTEM_PROMPT = `You are Image.io Vision Agent, an intelligent AI assistant specializing in computer vision and image analysis. You can:

1. Analyze images when provided with detection results (objects, classifications, labels)
2. Explain computer vision concepts clearly
3. Have natural conversations on any topic
4. Provide detailed, thoughtful responses

When image analysis data is provided, describe what you see in a natural, informative way. Mention the detected objects, their confidence levels, and the overall scene classification. Be conversational but precise.

For general questions, provide helpful, well-structured responses. You are knowledgeable across many domains.

Keep responses clear and well-formatted. Use markdown when helpful.`;

export async function GET() {
  return NextResponse.json({
    status: CEREBRAS_API_KEY ? "ok" : "no_api_key",
    model: "llama3.1-8b",
  });
}

export async function POST(req: NextRequest) {
  if (!CEREBRAS_API_KEY) {
    return NextResponse.json(
      { error: "CEREBRAS_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages, imageAnalysis } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // Build messages array, injecting image analysis as context
    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    // If image analysis is provided, inject it right before the last user message
    if (imageAnalysis) {
      const lastIdx = formattedMessages.length - 1;
      const lastMsg = formattedMessages[lastIdx];
      if (lastMsg && lastMsg.role === "user") {
        formattedMessages[lastIdx] = {
          role: "user",
          content: `[I uploaded an image. The computer vision system has already analyzed it and found the following results:\n${imageAnalysis}]\n\nMy question: ${lastMsg.content}\n\nPlease describe what was detected in the image based on the analysis results above. The bounding boxes and labels are already drawn on my screen, so focus on providing a natural description of the scene.`,
        };
      }
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...formattedMessages,
    ];

    const response = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: apiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Cerebras API error: ${errorText}` },
        { status: response.status }
      );
    }

    const encoder = new TextEncoder();
    const reader = response.body?.getReader();

    if (!reader) {
      return NextResponse.json(
        { error: "No response body" },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content })}\n\n`
                    )
                  );
                }
              } catch {}
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
