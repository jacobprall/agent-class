# 00 — What Is an Agent?

A first-principles analysis of what an agent is, examined from three angles: the LLM call, the tools, and the harness.

## Definition

**An agent is a language model running in a loop, with access to tools that let it act on the world.**

This single sentence is the foundation of the entire field. Everything that sounds more advanced — MCP, subagents, memory, planning — is an elaboration on one of its three parts: the model, the loop, or the tools. The rest of this module derives the sentence in five layers, starting from the model in isolation and adding one capability at a time until an agent emerges.

## Layer 1 — The model is a stateless function

Beneath the chat interface and the marketing, a large language model is a function: it takes text as input and returns text as output. That is the whole of what it does.

```ts
type LLM = (prompt: string) => Promise<string>;

const reply = await llm("Write a tagline for a coffee brand.");
// => "Wake up to better mornings."
```

Two properties of this function dictate everything that follows, so it is worth stating them plainly.

First, the model is **stateless**. Each call is independent, and a second call retains no knowledge of the first. When an agent appears to remember an earlier turn, that is not the model recalling anything; it is the surrounding code re-sending the earlier text on every call.

Second, the model **only emits text**. It cannot send an email, query a database, or read a file. At most it can produce a sentence *describing* such an action. Closing the gap between describing an action and performing one is the problem the remaining layers solve.

## Layer 2 — Context is the conversation, resent on every call

Because the model is stateless, a "conversation" is not stored inside it. A conversation is simply a list of messages that we transmit, in full, on every call. The model reads the entire list each time and predicts what comes next.

```ts
type Role = "system" | "user" | "assistant" | "tool";

interface Message {
  role: Role;
  content: string;
}

const context: Message[] = [
  { role: "system", content: "You are an assistant for a coffee brand." },
  { role: "user", content: "Write a tagline." },
  { role: "assistant", content: "Wake up to better mornings." },
  { role: "user", content: "Make it punchier." },
];

const response = await client.chat({ model: "gpt-5", messages: context });
// => "Mornings, upgraded."
```

The `system` message establishes the rules and persona, and the `user` and `assistant` messages alternate to form the dialogue. This array is the agent's entire world: if a fact is not present in the context, the model has no way to know it. That constraint is why managing what goes into the context — later called context engineering — becomes a discipline of its own.

## Layer 3 — Tools convert text into requested action

To let the model act, we give it a menu of tools. Each tool is described by a name, a human-readable description, and a schema for its inputs. The description matters because the model relies on it to decide when the tool is appropriate.

```ts
interface ToolDefinition {
  name: string;
  description: string; // the model reads this to decide when to use it
  parameters: Record<string, unknown>; // JSON schema for the inputs
}

const tools: ToolDefinition[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
];
```

The model still cannot execute anything. When it decides a tool is needed, it returns a structured *request* to call that tool, and our own code performs the actual work.

```ts
// The model returns a request, not a result:
const call = { toolName: "get_weather", arguments: { city: "Tokyo" } };

async function executeTool(call: { toolName: string; arguments: any }) {
  switch (call.toolName) {
    case "get_weather":
      return await fetchWeather(call.arguments.city); // real API call
    default:
      throw new Error(`Unknown tool: ${call.toolName}`);
  }
}
```

This division of labor is the central idea of the field: the model is the brain that decides which action to take, and the tools are the hands that carry it out. The model proposes; your code disposes. Because execution lives in ordinary software you control, you also control what the agent is permitted to do.

**Where MCP fits.** In the example above we wire `get_weather` directly into the application, which does not scale when many tools are shared across many products. MCP (Model Context Protocol) is the standard that solves this: it lets a tool live in a separate server and be discovered, described, and executed over a common interface, rather than hardcoded into each application. In other words, MCP standardizes this third layer.

## Layer 4 — The loop is what makes it an agent

We now have a model that can hold a conversation and request tools, but it still acts only once per call. An agent emerges when we wrap the model in a loop: call the model; if it requests a tool, execute the tool, append the result to the context, and call the model again; repeat until the model responds with plain text instead of a tool request. The code that runs this loop is called the **harness**, or runtime, and it — not the model — is the actual source of an agent's autonomy.

```ts
async function runAgent(userInput: string): Promise<string> {
  const context: Message[] = [
    { role: "system", content: "You are an assistant with tools." },
    { role: "user", content: userInput },
  ];

  while (true) {
    const response = await client.chat({ messages: context, tools });

    if (response.type === "text") {
      return response.content; // base case: the model answered, so the job is done
    }

    const result = await executeTool(response);
    context.push({ role: "assistant", content: JSON.stringify(response) });
    context.push({ role: "tool", content: JSON.stringify(result) });
  }
}
```

To see why the loop matters, trace the request *"What should I wear in Tokyo today?"*:

1. The model recognizes it needs data and requests `get_weather({ city: "Tokyo" })`.
2. The harness runs the real API and appends the result, `{ temp: 12, rain: true }`, to the context.
3. The model is called again. This time it can see the weather, so it replies, "12°C and raining — bring a jacket."
4. That reply is plain text, which ends the loop.

This cycle — **think, act, observe, then think again** — is precisely what makes behavior "agentic." A chatbot performs the first step once and stops. An agent repeats the cycle, each pass informed by the results of the last, until the task is complete.

## Layer 5 — The complete minimal agent

Assembled, the pieces form a working agent in roughly forty lines. Production systems add more tools, sharper prompts, error handling, and guardrails, but they are built on this same skeleton; the spine does not change.

```ts
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
];

async function executeTool(call: { toolName: string; arguments: any }) {
  if (call.toolName === "get_weather") return await fetchWeather(call.arguments.city);
  throw new Error(`Unknown tool: ${call.toolName}`);
}

async function runAgent(userInput: string): Promise<string> {
  const context: Message[] = [
    { role: "system", content: "You are an assistant. Use tools when needed." },
    { role: "user", content: userInput },
  ];

  for (let step = 0; step < 10; step++) { // bound the loop so it cannot run forever
    const response = await client.chat({ messages: context, tools });
    if (response.type === "text") return response.content;

    const result = await executeTool(response);
    context.push({ role: "assistant", content: JSON.stringify(response) });
    context.push({ role: "tool", content: JSON.stringify(result) });
  }

  return "Stopped: step limit reached.";
}
```

When a vendor demonstrates something far more capable, what they have added is more and better tools — frequently supplied through MCP — along with stronger prompting, memory, and planning. The underlying loop is the one shown here.

## The three angles, reconciled

The same agent looks different depending on where you stand, and understanding all three views is what it means to understand an agent.

| Angle | What you see | Key insight |
|---|---|---|
| **The LLM call** | A stateless text-in, text-out function | It has no memory and takes no actions; it only predicts text |
| **The harness** | A loop that calls the model and runs tools | The loop, not the model, is what makes the system an agent |
| **The tools** | A menu of functions the model can request | The model decides and your code executes; MCP standardizes that menu |

## Vocabulary

- **Agent** — a language model running in a loop with tools; a system built around a model, not the model itself.
- **Harness / runtime** — the code that runs the loop and executes tool calls.
- **Context (window)** — the list of messages resent on every call; the agent's working memory.
- **Tool / function calling** — a capability the model can request and your code executes.
- **Tool call** — the model's structured request to use a specific tool.
- **MCP** — an open standard for exposing tools and data to agents over a common interface; it standardizes the tool layer.
- **Agentic** — describing a system that loops through think, act, and observe autonomously, as opposed to answering in a single shot.

## Takeaway

An agent is not a smarter model. It is an ordinary model wrapped in a loop that lets it call tools and react to the results. Once that loop is visible, agents stop being mysterious and become a concrete architecture you can reason about — and MCP resolves cleanly into place as the standardized plumbing for the tools the loop depends on.
