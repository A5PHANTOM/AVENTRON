from .schemas import Plan

DANGEROUS_KEYWORDS = [
    "delete_file", "shutdown", "reboot", "format", "rm -rf", "poweroff",
]

def is_safe(plan: Plan) -> tuple[bool, str | None]:
    text_blob = (plan.intent + " " + str(plan.arguments)).lower()
    for kw in DANGEROUS_KEYWORDS:
        if kw in text_blob:
            return False, f"Blocked dangerous keyword: {kw}"
    return True, None
