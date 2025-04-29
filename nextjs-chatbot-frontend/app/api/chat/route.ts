import { StreamingTextResponse } from "ai"

export async function POST(req: Request) {
  try {
    // Get the user's message from the request
    const { messages } = await req.json()

    if (!messages || !messages.length) {
      throw new Error("No messages provided in the request")
    }

    const userMessage = messages[messages.length - 1].content

    if (!userMessage) {
      throw new Error("Empty message content")
    }

    console.log("Sending to backend:", { message: userMessage })

    // Send the message to your backend API with proper timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch("https://test-vercel-sand-gamma.vercel.app/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Log the response status for debugging
      console.log("Backend response status:", response.status)
      console.log("Backend response headers:", Object.fromEntries(response.headers.entries()))

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error response:", errorText)
        throw new Error(`API request failed with status ${response.status}: ${errorText}`)
      }

      // Get the response data as text first for debugging
      const responseText = await response.text()
      console.log("Backend raw response:", responseText)

      if (!responseText.trim()) {
        throw new Error("Empty response from backend")
      }

      let responseMessage = responseText

      // Try to parse as JSON if it looks like JSON
      if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
        try {
          const responseData = JSON.parse(responseText)
          responseMessage = responseData.response || JSON.stringify(responseData)
        } catch (e) {
          console.log("Failed to parse JSON, using raw text:", e)
        }
      }

      // Create a stream from the API response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(responseMessage))
          controller.close()
        },
      })

      // Return the stream as a streaming response
      return new StreamingTextResponse(stream)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === "AbortError") {
        throw new Error("Request timed out after 10 seconds")
      }
      throw fetchError
    }
  } catch (error) {
    console.error("Error in API route:", error)

    // Return a more detailed error response
    return new Response(
      JSON.stringify({
        error: "Failed to get response from API",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
