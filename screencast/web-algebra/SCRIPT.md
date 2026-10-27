# Web-Algebra in action — narration script (draft 1)

A short film for the Web-Algebra README's Demo section, replacing "Agentic Content Management
with Web-Algebra MCP" on YouTube. About two minutes, cut from the overview's Flow H takes: the
MCP half (an agent in Claude Code) leads, because the README is the MCP server's, and the
LinkedDataHub assistant follows as the same operations in a second client.

It opens on the page the agent wrote, then shows how it was written. Voice, synthesis,
pacing and mix are the overview's (`overview/SCRIPT.md`, Production notes):

```bash
node overview/voice.mjs web-algebra/SCRIPT.md
node render/overview.mjs web-algebra/cut.json
```

## The agent

| # | On screen | Narration |
|---|---|---|
| W1 | The offers container on Northwind: the chart of offer prices | An AI agent built this page: a container of new offers, three discounted products, and a chart of their prices. It was asked in one sentence. |
| W2 | Terminal: `claude mcp add web-algebra …`, then `claude`, `/mcp` listing it connected | Web-Algebra is an open-source MCP server of composable operations for Linked Data: loading, querying and writing RDF. One command registers it with Claude Code. |
| W3 | The prompt typed, aimed at the Northwind dataspace | The request is one sentence, aimed at the Northwind dataspace: a container for new offers, a twenty percent discount on three Beverages products, and a chart of the offer prices. |
| W4 | The tool calls going by; "Items use sioc:has_container, not has_parent. Fixing the query." | The agent reads the data first: a product, then the shape of an existing offer. When its query misses, it checks the model and fixes it. |
| W5 | Claude Code's summary: the three products, list and offer prices | It reports what it wrote: three offers at twenty percent off, and the query behind the chart. |
| W6 | The browser: the offers container, its items, the chart | In LinkedDataHub they are ordinary documents. You can browse them, query them, and keep editing them by hand. |

## Inside LinkedDataHub

| # | On screen | Narration |
|---|---|---|
| W7 | A Northwind page; the create bar's Assistant; "Chart the five customers who ordered the most"; the steps report as the plan runs | The same operations run inside LinkedDataHub. Its assistant writes a question as a Web-Algebra plan, and a plan that only reads runs right away. |
| W8 | The answer in words; the rows as a bar chart; the trace, its three steps | The answer comes back in words, the rows drawn as a chart, and every step of the plan in its trace. |
| W9 | "Add the chart to this page"; the plan waits with its operations listed; Execute; the chart becomes a block of the page | A plan that writes waits for you to press Execute. This one adds the chart to the page. |
| Z1 | The page with the chart block; the closing card fades in | Web-Algebra: composable Linked Data operations, for agents and for people. Open source, on GitHub. |

## Takes

| Take | Shots | Notes |
|---|---|---|
| `overview-h-agent` | W1, W6 | the browser half of `scenes/overview-h-agent.mjs`, 2026-10-15 |
| `overview-h-agent-terminal` | W2–W5 | `tapes/overview-h-agent.tape`, Web-Algebra 2.0.0 built from the local checkout |
| `overview-h-assistant-take2` | W7–W9, Z1 | `scenes/overview-h-assistant.mjs` |

## Pronunciation

| Written | Spoken |
|---|---|
| LinkedDataHub | Linked Data Hub |
| MCP | M C P |
| RDF | R D F |
