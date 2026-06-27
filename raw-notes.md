A course on agents - what they are, how they work, and how to build them. 

Topics:
- LLMs and context
Harness (loop orchestration)
- The loop
- Tools and Skills
- Subagents

- Architectural patterns
  - Single agent, in process
  - Multi-agent, Background workers and queue
  - Multi-agent, workflows

Research list - The Agentic Application Stack
What is an Agent?
- Harness
  - Loops, Tools, Skills, and Environments
  - Hooks / lifecycle middleware
  - Planning and self-verification loops
  - Permissions and governance
- Agent Definitions
- Agent Composition 
  - Design patterns for common use cases
  - framing splits into two orthogonal axes — execution topology (Chain, Route, Parallel, Orchestrate, Loop, Hierarchy) and cognitive function (Perception, Memory, Reasoning, Action, Reflection, Collaboration, Governance) 
- Subagents - context isolation
- Context engineering
  - offloading
  - retrieval
  - isolation
  - reduction
  - compaction
  - tool-result clearing
  - external memory
- Protocols and MCP clients

Agent infrastructure
- Observability
- Runtime
Durable execution — checkpoint/resume across crashes, deploys, and indefinite blocking waits The Runtime Behind Production Deep Agents, Agent Runtime (Augment Code).
Runtime enforcement / policy control — deny-by-default authorization evaluated per-call, runtime-enforced budgets, circuit breakers Gartner Confirms 2026 AI Agent Stack Layers, 40 agent-action control tests.
Human-in-the-loop — interrupt/resume, approval queues, double-texting/concurrency control The Runtime Behind Production Deep Agents.
Multi-tenancy — authentication, authorization, RBAC, per-agent process/resource isolation The Runtime Behind Production Deep Agents, Agent Runtime (Augment Code).
Scheduling — cron / scheduled and event-triggered (webhook) runs The Runtime Behind Production Deep Agents.
Under Observability, specify: execution traces, time-travel/replay, append-only audit trails, event sourcing Agent Runtime (Augment Code), 40 agent-action control tests.
Under Sandboxes, specify: gVisor / microVM isolation, on-demand fan-out + teardown, network isolation + command allow-listing; common providers are Modal, Daytona, Runloop The Anatomy of an Agent Harness, The Runtime Behind Production Deep Agents.
Under Networking, the big gap is protocols — MCP for agent-to-tool, A2A for agent-to-agent. A2A (now Linux Foundation, 150+ orgs) uses Agent Cards at /.well-known/agent-card.json, JSON-RPC 2.0 / gRPC / HTTP+SSE, and Task/Message/Artifact units; the two are complementary A2A Protocol Surpasses 150 Organizations, What Is Agent2Agent (IBM), Google A2A Protocol (Atlan).
- Sandboxes
- Networking
- Security, Identity & Governance
- Evals & Testing 

Data layers
- Memory
- Storage
- Databases
- RAG
  - Semantic and hybrid search
- Just-in-time retrieval and vectorless rag

Priority use cases
- Autonomous coding agents
- Customer service agents
- Intelligence pipelines