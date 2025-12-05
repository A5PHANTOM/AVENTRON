import json
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)

import os
import requests
from .schemas import Plan

# Load Gemini API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SYSTEM_PROMPT = """
You are an automation planner for a local desktop assistant called Jarvis-AI.

User gives a natural language command like:
- "Open Chrome and go to Gmail"
- "Type hello in the current window"

Your job:
- If it's a system action, output JSON describing what to do.
- If it's just chat (like "hi" or "how are you"), output a chat intent.

You MUST return ONLY valid JSON with these keys:
- intent: one of [open_website, open_app, type_text, chat]
- actions: list of human-readable steps
- arguments: key-value details

Examples:

Input: Open Chrome and go to Gmail
Output:
{
  "intent": "open_website",
  "actions": ["Open Chrome", "Go to https://mail.google.com"],
  "arguments": {"browser": "chrome", "url": "https://mail.google.com"}
}

Input: Type hello world in the current window
Output:
{
  "intent": "type_text",
  "actions": ["Focus current window", "Type 'hello world'"],
  "arguments": {"text": "hello world"}
}

Input: Hello, how are you?
Output:
{
  "intent": "chat",
  "actions": ["reply"],
  "arguments": {"response": "Hey there! I'm Jarvis — ready to help you automate things!"}
}

Return ONLY pure JSON — no explanations or code blocks.
"""

def _dummy_plan() -> Plan:
    """Fallback if API fails."""
    return Plan(
        intent="open_website",
        actions=["Open browser", "Go to https://mail.google.com"],
        arguments={"browser": "chrome", "url": "https://mail.google.com"},
    )


def get_plan(user_text: str) -> Plan:
    """Send user command to Gemini API and parse structured JSON plan."""
    if not GEMINI_API_KEY:
        print("[gpt_client] Missing GEMINI_API_KEY — using dummy plan.")
        return _dummy_plan()

    try:
        gemini_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
        )

        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\nUser Input: {user_text}"}
                    ]
                }
            ]
        }

        response = requests.post(
            f"{gemini_url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=20,
        )

        data = response.json()

        # Try to extract model response safely
        content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not content:
            print("[gpt_client] Empty Gemini response, falling back to dummy plan.")
            return _dummy_plan()

        # Try parsing JSON
        try:
            json_data = json.loads(content)
            return Plan(**json_data)
        except json.JSONDecodeError:
            print("[gpt_client] Invalid JSON from Gemini, falling back.")
            return _dummy_plan()

    except Exception as e:
        print("[gpt_client] Gemini API error:", repr(e))
        return _dummy_plan()
