"use client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, AlertCircle } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const testDirectApi = async () => {
    setTestResult("Testing direct API connection...")
    try {
      const response = await fetch("https://test-vercel-sand-gamma.vercel.app/", {
        method: "GET"
      })

      const statusText = `Status: ${response.status} ${response.statusText}`
      console.log(statusText)

      const text = await response.text()
      console.log("Response:", text)

      setTestResult(`${statusText}\n\nResponse: ${text}`)
    } catch (err) {
      console.error("Direct API test error:", err)
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    setError(null)
    setIsLoading(true)

    // Create a new message object
    const newMessage = {
      role: "user",
      content: input,
      id: Date.now().toString(),
    }

    // Add the message to the UI immediately
    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)

    // Clear input
    setInput("")

    try {
      console.log("Sending message:", input)

      const response = await fetch("https://test-vercel-sand-gamma.vercel.app/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
        }),
      })

      // Check if the response is OK
      if (!response.ok) {
        // Try to get error details, but handle non-JSON responses
        const contentType = response.headers.get("content-type")
        let errorMessage = `Error ${response.status}`

        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.details || errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
        }

        throw new Error(errorMessage)
      }

      // Get the response text
      const responseText = await response.json()
      console.log("Response text:", responseText)

      // Try to parse as JSON if it looks like JSON
      let responseContent = responseText
      if (responseText.trim().startsWith("{") || responseText.trim().startsWith("[")) {
        try {
          const responseData = JSON.parse(responseText)
          responseContent = responseData.response || responseData.text || JSON.stringify(responseData)
        } catch (e) {
          console.log("Failed to parse JSON, using raw text")
        }
      }

      // Add the assistant's response to the messages
      const assistantMessage = {
        role: "assistant",
        content: responseContent,
        id: (Date.now() + 1).toString(),
      }

      // Update messages with the assistant's response
      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      console.error("Submit error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-center">Chat Assistant</CardTitle>
        </CardHeader>

        <CardContent className="p-4 h-[60vh] overflow-y-auto flex flex-col space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-500">
              <p>Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                  <div
                    className="h-2 w-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="h-2 w-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>

      <div className="mt-4 text-center">
        <Button variant="outline" onClick={testDirectApi} type="button" className="text-xs">
          Test Direct API Connection
        </Button>
        {testResult && (
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-left overflow-auto max-h-40">{testResult}</pre>
        )}
      </div>
    </div>
  )
}
