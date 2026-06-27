/**
 * agent.ts — the minimal agent skeleton from Module 1.
 *
 * An agent is a language model running in a loop, with access to tools that
 * let it act on the world. 
 *
 * It is intentionally dependency-free: the `client.chat` call below is a mock
 * so the loop runs without an API key. To make it real, replace `mockChat`
 * with a call to an actual provider (OpenAI, Anthropic, etc.) — the harness
 * around it does not change.
 *
 * Run it:  npx tsx agent.ts
 */

// ----------------------------------------------------------------------------
// Layer 2 — Context: the conversation we resend in full on every call.
// ----------------------------------------------------------------------------

type Role = "system" | "user" | "assistant" | "tool";

interface Message {
  role: Role;
  content: string;
}

// ----------------------------------------------------------------------------
// Layer 3 — Tools: a menu of actions the model can *request*. Our code, not
// the model, actually executes them.
// ----------------------------------------------------------------------------

interface ToolDefinition {
  name: string;
  description: string; // the model reads this to decide when to use the tool
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

interface ToolCall {
  toolName: string;
  arguments: Record<string, any>;
}

// The real-world side effects live here. This is ordinary software we control,
// which is also where permissions and guardrails would go.
async function executeTool(call: ToolCall): Promise<unknown> {
  switch (call.toolName) {
    case "get_weather":
      return fetchWeather(call.arguments.city);
    default:
      throw new Error(`Unknown tool: ${call.toolName}`);
  }
}

// Stand-in for a real weather API.
async function fetchWeather(city: string): Promise<{ temp: number; rain: boolean }> {
  return { temp: 12, rain: true };
}

// ----------------------------------------------------------------------------
// Layer 1 — The model: a stateless text-in / structured-out function.
//
// A real provider returns either plain text (it's done) or a request to call a
// tool. We model that as a tagged union. `mockChat` fakes one round-trip so the
// loop is runnable; swap it for a real client to make the agent real.
// ----------------------------------------------------------------------------

type ModelResponse =
  | { type: "text"; content: string }
  | ({ type: "tool_call" } & ToolCall);

const client = {
  async chat(_args: { messages: Message[]; tools: ToolDefinition[] }): Promise<ModelResponse> {
    return mockChat(_args.messages);
  },
};

// A scripted two-step exchange: first ask for the weather, then answer once the
// tool result is in context. A real model decides this for itself.
function mockChat(messages: Message[]): ModelResponse {
  const alreadyHasWeather = messages.some((m) => m.role === "tool");
  if (!alreadyHasWeather) {
    return { type: "tool_call", toolName: "get_weather", arguments: { city: "Tokyo" } };
  }
  return { type: "text", content: "It's 12°C and raining in Tokyo — bring a jacket." };
}

// ----------------------------------------------------------------------------
// Layer 4 — The loop (the "harness"). This is what turns a model into an agent:
// call the model, run any tool it asks for, feed the result back, and repeat
// until it answers in plain text.
// ----------------------------------------------------------------------------

async function runAgent(userInput: string): Promise<string> {
  // In-memory list of messages
  const context: Message[] = [
    { role: "system", content: "You are an assistant. Use tools when needed." },
    { role: "user", content: userInput },
  ];

  // Bound the loop so a misbehaving model cannot run forever.
  for (let step = 0; step < 10; step++) {
    const response = await client.chat({ messages: context, tools });

    // Base case: plain text means the model is done.
    if (response.type === "text") {
      return response.content;
    }

    // Otherwise the model requested a tool. Execute it and append the result
    // back into the context list so the next call can "see" it.
    const { type, ...call } = response;
    const result = await executeTool(call);
    context.push({ role: "assistant", content: JSON.stringify(call) });
    context.push({ role: "tool", content: JSON.stringify(result) });
  }

  return "Stopped: step limit reached.";
}

// ----------------------------------------------------------------------------
// Entry point.
// ----------------------------------------------------------------------------

async function main() {
  const answer = await runAgent("What should I wear in Tokyo today?");
  console.log(answer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
