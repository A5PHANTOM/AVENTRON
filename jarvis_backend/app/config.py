import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ENV = os.getenv("ENV", "dev")

AUTOMATION_DIR = os.path.join(BASE_DIR, "automation")
GENERATED_DIR = os.path.join(AUTOMATION_DIR, "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)
