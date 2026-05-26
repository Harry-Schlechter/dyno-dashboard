#!/usr/bin/env python3
"""
route-captures.py — Cron-driven router for the Dyno Cockpit extension captures.

Polls captures WHERE routing_status='pending'. For each:
  - If forced_agent is set, post to that agent's Telegram topic directly.
  - Else, classify via Groq (Llama) to pick the right agent, then post.
After posting, mark routing_status='routed' and fill routed_agents.

Idempotent + cheap: when no pending rows exist, returns in milliseconds with zero API calls.

Required env vars:
  SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, GROQ_API_KEY

Optional:
  DYNO_GROUP_ID — defaults to -1003941804652 (Dyno+ supergroup)
  CAPTURE_BATCH_SIZE — max rows per run (default 10)
"""

from __future__ import annotations
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from typing import Any

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GROUP_ID = os.environ.get("DYNO_GROUP_ID", "-1003941804652")
BATCH = int(os.environ.get("CAPTURE_BATCH_SIZE", "10"))

if not all([SUPABASE_URL, SUPABASE_KEY, TELEGRAM_TOKEN]):
    print("[route-captures] missing required env vars", file=sys.stderr)
    sys.exit(2)

# Agent → Telegram topic id in the Dyno+ supergroup. Keep in sync with
# the extension's src/lib/agents.ts and openclaw.json channels.telegram.groups.
AGENT_TOPICS: dict[str, int] = {
    "trainer": 8,
    "nutritionist": 9,
    "financial-advisor": 3,
    "career-coach": 4,
    "travel-agent": 5,
    "wedding-planner": 6,
    "health-wellness": 7,
    "personal-assistant": 87,
    "maintenance": 81,
    "builder": 82,
}

AGENT_DESCRIPTIONS = """
- trainer: workouts, fitness, basketball, recovery, lifting
- nutritionist: meals, macros, recipes, hydration, diet
- financial-advisor: money, transactions, investments, budgets, purchases, bills
- career-coach: job listings, career, professional development, resume, networking
- travel-agent: flights, hotels, restaurants, places, trips, dining recommendations
- wedding-planner: wedding planning, venues, vendors, guest list
- health-wellness: medical appointments, doctors, symptoms, mental health resources
- personal-assistant: tasks, calendar, scheduling, reminders, general life admin
- maintenance: data hygiene, cross-cutting observations, system upkeep, journaling
- builder: code, PRs, software projects, infrastructure, tools
"""

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
}


def sb_get(path: str, params: dict[str, str]) -> list[dict[str, Any]]:
    url = f"{SUPABASE_URL}/rest/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def sb_patch(path: str, params: dict[str, str], body: dict[str, Any]) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers=HEADERS, method="PATCH"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        r.read()


def telegram_send(topic_id: int, text: str) -> bool:
    """Send a message to the Dyno+ supergroup in a specific topic. Returns success."""
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": GROUP_ID,
        "message_thread_id": topic_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False,
    }
    try:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            resp = json.loads(r.read().decode())
            return bool(resp.get("ok"))
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode()
        except Exception:
            err_body = str(e)
        print(f"[route-captures] telegram error: {err_body}", file=sys.stderr)
        return False


def classify_with_groq(capture: dict[str, Any]) -> str:
    """Pick the best agent for this capture via a Groq LLM call. Falls back to 'maintenance' if anything fails."""
    if not GROQ_KEY:
        return "maintenance"
    content = (capture.get("content") or "").strip()
    ask = (capture.get("ask") or "").strip()
    page_url = capture.get("page_url") or ""
    page_title = capture.get("page_title") or ""
    selection = (capture.get("page_selection") or "").strip()

    parts = [f"User wrote: {content}"]
    if ask: parts.append(f"User asked: {ask}")
    if page_title: parts.append(f"From page: {page_title}")
    if page_url: parts.append(f"URL: {page_url}")
    if selection: parts.append(f"Selected text: {selection[:300]}")

    user_msg = "\n".join(parts)
    sys_msg = (
        "You route user captures to the right specialized agent. Respond with ONLY the agent id "
        "(lowercase, hyphenated), nothing else. Choose from:\n"
        + AGENT_DESCRIPTIONS
        + "\nIf nothing fits clearly, choose 'maintenance'."
    )

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps({
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.1,
                "max_tokens": 20,
            }).encode(),
            headers={
                "Authorization": f"Bearer {GROQ_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode())
            answer = data["choices"][0]["message"]["content"].strip().lower()
            # Strip anything that isn't the agent id (e.g. trailing punctuation, quotes).
            for line in answer.replace('"', '').replace("'", '').splitlines():
                line = line.strip().rstrip(".").rstrip(",")
                if line in AGENT_TOPICS:
                    return line
            return "maintenance"
    except Exception as e:
        print(f"[route-captures] groq classify failed: {e}", file=sys.stderr)
        return "maintenance"


def format_message(capture: dict[str, Any]) -> str:
    """Build the Telegram message body for an agent to react to."""
    lines = ["📥 *New capture from Cockpit*", ""]
    content = (capture.get("content") or "").strip()
    if content:
        lines.append(content)

    ask = (capture.get("ask") or "").strip()
    if ask:
        lines.append("")
        lines.append(f"_Ask:_ {ask}")

    page_url = capture.get("page_url")
    page_title = capture.get("page_title")
    if page_url:
        lines.append("")
        if page_title:
            lines.append(f"🔗 [{page_title}]({page_url})")
        else:
            lines.append(f"🔗 {page_url}")

    selection = (capture.get("page_selection") or "").strip()
    if selection:
        snippet = selection[:400] + ("…" if len(selection) > 400 else "")
        lines.append("")
        lines.append(f"> {snippet}")

    return "\n".join(lines)


def process_one(capture: dict[str, Any]) -> None:
    cap_id = capture["id"]
    forced = capture.get("forced_agent")

    if forced and forced in AGENT_TOPICS:
        target = forced
        notes = "forced"
    else:
        target = classify_with_groq(capture)
        notes = f"auto-routed via groq" if GROQ_KEY else "auto-routed (fallback to maintenance)"

    topic_id = AGENT_TOPICS[target]
    text = format_message(capture)

    ok = telegram_send(topic_id, text)
    new_status = "routed" if ok else "failed"
    routed_agents = [target] if ok else []

    sb_patch("captures", {"id": f"eq.{cap_id}"}, {
        "routing_status": new_status,
        "routed_agents": routed_agents,
        "routing_notes": notes if ok else f"{notes}; telegram_send failed",
    })
    print(f"[route-captures] {cap_id} → {target} (status={new_status})")


def main() -> None:
    pending = sb_get("captures", {
        "select": "id,content,ask,page_url,page_title,page_selection,forced_agent,focus_session_id",
        "routing_status": "eq.pending",
        "order": "created_at.asc",
        "limit": str(BATCH),
    })
    if not pending:
        return  # silent idle exit — keeps logs clean
    print(f"[route-captures] processing {len(pending)} pending captures")
    for cap in pending:
        try:
            process_one(cap)
        except Exception as e:
            print(f"[route-captures] {cap['id']} fatal error: {e}", file=sys.stderr)
            try:
                sb_patch("captures", {"id": f"eq.{cap['id']}"}, {
                    "routing_status": "failed",
                    "routing_notes": f"exception: {e}",
                })
            except Exception:
                pass


if __name__ == "__main__":
    main()
