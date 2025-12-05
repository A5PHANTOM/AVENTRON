from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import platform as py_platform
import os
import requests
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)


from .schemas import CommandRequest, CommandResponse
from .gpt_client import get_plan
from .script_generator import generate_script
from .executor import execute_script
from .safety import is_safe

app = FastAPI(title="Jarvis-AI Backend (Gemini 1.5 Edition)")

# Allow all origins (for hackathon testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🩺 Health Check
@app.get("/health")
def health():
    return {"status": "ok"}


# 🧠 AUTOMATION ENDPOINT
@app.post("/command", response_model=CommandResponse)
def handle_command(req: CommandRequest):
    target_platform = req.platform
    if not target_platform:
        sys_name = py_platform.system().lower()
        if "windows" in sys_name:
            target_platform = "windows"
        elif "darwin" in sys_name:
            target_platform = "mac"
        else:
            target_platform = "unknown"

    # Get plan from Gemini-based automation planner
    plan = get_plan(req.text)
    safe, reason = is_safe(plan)

    # 🚫 Safety check
    if not safe:
        return CommandResponse(
            message="Blocked potentially dangerous command.",
            platform=target_platform,
            actions=plan.actions,
            blocked=True,
            reason=reason,
        )

    # 💬 If it's a normal chat, just reply instead of automating
    if plan.intent == "chat":
        chat_text = plan.arguments.get("response", "I'm here to help you automate things!")
        return CommandResponse(
            message=chat_text,
            platform=target_platform,
            actions=["reply"],
            blocked=False,
            reason=None,
        )

    # 🧰 Otherwise → generate and execute automation script
    gen_info = generate_script(plan, target_platform)
    script_path = gen_info.get("script_path")

    if script_path:
        execute_script(script_path, target_platform)
        msg = "Command executed successfully."
    else:
        msg = "No script generated (unsupported platform)."

    return CommandResponse(
        message=msg,
        platform=target_platform,
        script_path=script_path,
        actions=plan.actions,
        blocked=False,
        reason=None,
    )


# 💬 NORMAL CHAT ENDPOINT (Gemini 1.5 or fallback)
@app.post("/chat")
def chat_endpoint(req: CommandRequest):
    """
    Basic chatbot endpoint using Gemini 1.5 Flash (with fallback logic).
    """
    user_text = req.text
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # 🧠 If API key exists, use Gemini 1.5 Flash (free)
    if GEMINI_API_KEY:
        try:
            gemini_url = (
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            )
            response = requests.post(
                f"{gemini_url}?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": user_text}]}]},
                timeout=20,
            )
            data = response.json()
            msg = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "I'm here to help you automate things!")
            )
            return {"message": msg.strip(), "from": "Jarvis"}
        except Exception as e:
            print("[chat] Gemini API error:", repr(e))
            # fallback below

    # 🧩 Fallback: simple offline responses
    fallback_responses = {
        "hi": "Hello! I'm Jarvis — ready to help you automate your system.",
        "hello": "Hey there! What can I do for you today?",
        "how are you": "I'm doing great — ready to open apps for you!",
        "who are you": "I'm Jarvis, your personal AI assistant.",
        "what can you do": "I can open websites, launch apps, and type messages for you.",
    }

    for key, val in fallback_responses.items():
        if key in user_text.lower():
            return {"message": val, "from": "Jarvis"}

    return {"message": "I'm Jarvis — say 'Open Chrome' or just chat with me!", "from": "Jarvis"}
