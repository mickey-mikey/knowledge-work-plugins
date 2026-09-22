# Productivity Plugin

A productivity plugin primarily designed for [Cowork](https://claude.com/product/cowork), Anthropic's agentic desktop application — though it also works in Claude Code. Task management, workplace memory, and a visual dashboard — Claude learns your people, projects, and terminology so it can act like a colleague, not a chatbot.

## Installation

```
claude plugin marketplace add anthropics/knowledge-work-plugins
claude plugin install productivity@knowledge-work-plugins
```

## What It Does

This plugin gives Claude a persistent understanding of your work:

- **Task management** — A markdown task list (`TASKS.md`) that Claude reads, writes, and executes against. Add tasks naturally, and Claude tracks status, triages stale items, and syncs with external tools.
- **Workplace memory** — A two-tier memory system that teaches Claude your shorthand, people, projects, and terminology. Say "ask todd to do the PSR for oracle" and Claude knows exactly who, what, and which deal.
- **Visual dashboard** — A local HTML file that gives you a board view of your tasks and a live view of what Claude knows about your workplace. Edit from the board or the file — they stay in sync.

### Dashboard appearance

The **Theme** selector offers **System**, **Light**, and **Dark**. System is the default and follows your device's appearance, including changes while the dashboard is open. Choosing Light or Dark overrides the device setting. Your choice is remembered in this browser when browser storage is available; otherwise it lasts for the current page. Appearance changes do not modify tasks or memory files.

Existing dashboards are standalone copies: update your local `dashboard.html` from `productivity/skills/dashboard.html` to receive these controls.

Theme regression tests run without additional dependencies:

```sh
node --test productivity/tests/dashboard-theme.test.cjs
```

For browser checks, open a test copy of the dashboard in `playwright-cli`, then run `playwright-cli run-code --filename=productivity/tests/dashboard-theme.browser.js`. This uses synthetic tasks, tests both palettes across the dashboard, and opens no user files.

## Commands

| Command | What it does |
|---------|--------------|
| `/start` | Initialize tasks + memory, open the dashboard |
| `/update` | Triage stale items, check memory for gaps, sync from external tools if applicable |
| `/update --comprehensive` | Deep scan email, calendar, chat — flag missed todos and suggest new memories |

## Skills

| Skill | Description |
|-------|-------------|
| `memory-management` | Two-tier memory system — CLAUDE.md for working memory, memory/ directory for deep storage |
| `task-management` | Markdown-based task tracking using a shared TASKS.md file |

## Example Workflows

### Getting Started

```
You: /start

Claude: [Creates TASKS.md, CLAUDE.md, memory/ directory, and dashboard.html]
        [Opens the dashboard in your browser]
        [Asks about your role, team, and current priorities to seed memory]
```

### Adding Tasks Naturally

```
You: I need to review the budget proposal for Sarah by Friday,
     draft the Q2 roadmap after syncing with Greg, and follow up
     on the API spec from the Platform team

Claude: [Adds all three tasks to TASKS.md with context]
        [Dashboard updates automatically]
```

### Morning Sync

```
You: /update --comprehensive

Claude: [Scans email, calendar, and chat for new action items]
        [Flags: "Budget proposal review is due tomorrow — still open"]
        [Suggests: "New person mentioned in 3 threads: Jamie Park,
         Design Lead — add to memory?"]
        [Updates stale tasks and fills memory gaps]
```

### Workplace Shorthand

Once memory is populated, Claude decodes your shorthand instantly:

```
You: ask todd to do the PSR for oracle

Claude: "Ask Todd Martinez (Finance lead) to prepare the Pipeline
         Status Report for the Oracle Systems deal ($2.3M, closing Q2)"
```

No clarifying questions. No round trips.

## Data Sources

> If you see unfamiliar placeholders or need to check which tools are connected, see [CONNECTORS.md](CONNECTORS.md).

Connect your communication and project management tools for the best experience. Without them, manage tasks and memory manually.

**Included MCP connections:**
- Chat (Slack) for team context and message scanning
- Email and calendar (Microsoft 365) for action item discovery
- Knowledge base (Notion) for reference documents
- Project tracker (Asana, Linear, Atlassian, monday.com, ClickUp) for task syncing
- Office suite (Microsoft 365) for documents

**Additional options:**
- See [CONNECTORS.md](CONNECTORS.md) for alternative tools in each category
