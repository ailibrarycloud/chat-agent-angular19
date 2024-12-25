// app/playground-assistant-stream.component.ts

import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DomSanitizer } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

const namespace = "default-agent"; // Replace with your agent's namespace
const XLibraryKey = "d4qgdcs2lgUBvwWDFjC6NeOIrLS87cpoDHlwPL5a"; // Replace with your API key

@Component({
  selector: "app-root", // Changed from "app-playground-assistant-stream" to "app-root"
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule], // Add any other modules your component needs
})
export class PlaygroundAssistantStreamComponent implements OnInit {
  @ViewChild("textarea") textareaRef!: ElementRef;

  loader: boolean = false;
  messageLoader: boolean = false;
  latency: string = "";
  knowledge: any[] = [];
  sessionId: string = "";
  prompt: string = "";
  agent: any = {};
  response: string = "";
  messages: any[] = [];
  domain: string = "https://api.ailibrary.ai";

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    const streamId =
      sessionStorage.getItem("stream_id") || Date.now().toString();
    sessionStorage.setItem("stream_id", streamId);
    this.sessionId = streamId;
    this.getAgent(namespace); // Replace with actual logic
  }

  getAgent(name: string): void {
    this.loader = true;
    const headers = {
      "X-Library-Key": XLibraryKey,
    }; // Add your header here
    this.http
      .get(`https://api.ailibrary.ai/v1/agent/${name}`, {
        headers,
      })
      .subscribe(
        (res: any) => {
          this.agent = res;
          this.messages.push({
            id: Date.now(),
            role: "assistant",
            content: res.intromessage,
          });

          this.loader = false;
        },
        (error) => {
          console.error("Error fetching agent info:", error);
          this.loader = false;
        }
      );
  }

  handleInput(): void {
    const textarea = this.textareaRef.nativeElement;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  handleKeyDown(event: KeyboardEvent): void {
    const textarea = this.textareaRef.nativeElement;
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "\n" +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      this.handleInput();
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.messageLoader = true;
      this.makeRequest(this.prompt);
    }
  }

  makeRequest(prompt: string): void {
    this.textareaRef.nativeElement.value = "";
    this.handleInput();
    this.messages.push({ id: Date.now(), role: "user", content: prompt });
    const llmMessages = this.messages
      .sort((a, b) => a.id - b.id)
      .map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      }));
    const headers = {
      "X-Library-Key": XLibraryKey,
    };

    this.http
      .post(
        `https://api.ailibrary.ai/v1/agent/${namespace}/chat`,
        {
          stream: "true",
          session_id: this.sessionId,
          messages: llmMessages,
        },
        { headers, responseType: "text" }
      )
      .subscribe(
        (response: any) => {
          const reader = new Response(response).body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let result = "";

            const processChunk = ({
              done,
              value,
            }: ReadableStreamReadResult<Uint8Array>) => {
              if (done) {
                this.messageLoader = false;
                this.messages.push({
                  id: Date.now(),
                  role: "assistant",
                  content: result,
                  latency: this.latency,
                  knowledge: this.knowledge.length > 0 ? this.knowledge : null,
                });
                this.response = "";
                return;
              }

              if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const jsonStrings = chunk.split("\n");

                jsonStrings.forEach((jsonString) => {
                  if (jsonString.trim() !== "") {
                    try {
                      const parsed = JSON.parse(jsonString);
                      if (parsed.object === "chat.completion.chunk") {
                        result += parsed.content;
                        this.response += parsed.content;
                      } else if (parsed.object === "chat.completion.latency") {
                        this.latency = parsed.content;
                      } else if (
                        parsed.object === "chat.completion.knowledge"
                      ) {
                        this.knowledge = parsed.content;
                      }
                    } catch (error) {
                      console.error("Error parsing chunk:", error);
                    }
                  }
                });
              }

              reader.read().then(processChunk);
            };

            reader.read().then(processChunk);
          }
        },
        (error) => {
          console.error("Error making request:", error);
        }
      );
  }

  clearMessages(): void {
    this.messages = [];
  }

  getMiddleCharacters(text: string, length: number = 25): string {
    if (!text || text.length <= length) {
      return text;
    }

    const start = Math.max(0, Math.floor((text.length - length) / 2));
    const end = start + length;

    return text.slice(start, end);
  }
}
