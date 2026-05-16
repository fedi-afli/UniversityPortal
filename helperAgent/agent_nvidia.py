import os
import traceback
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tools import tools_list

llm = ChatOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY", "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"),
    model="meta/llama-3.3-70b-instruct",
    temperature=0
)

checkpointer = MemorySaver()

def generate_system_instructions(student_id: str) -> str:
    base_rules = (
        "🛑 CRITICAL: OUTPUT FORMATTING (ABSOLUTE HIGHEST PRIORITY) 🛑\n"
        "1. ALL of your responses MUST be written entirely in raw, valid HTML using Bootstrap 5 classes.\n"
        "2. DO NOT USE MARKDOWN. DO NOT wrap your response in ```html ... ``` code blocks. Output raw HTML directly.\n"
        "3. AVOID BLOBS OF TEXT. Break information down using structured Bootstrap UI components like "
        "`<div class='card'>`, `<ul class='list-group'>`, `<table class='table table-striped'>`, and `<span class='badge'>`.\n"
        "4. ALWAYS STRUCTURE DATA IN TABLES AND BULLET LISTS WHENEVER POSSIBLE.\n\n"
    )

    if not student_id:
        return base_rules + (
            "You are a public informational assistant for the Faculty of Sciences of Bizerte (FSB).\n"
            "The current user is a GUEST and is NOT logged in.\n\n"
            "🔒 GUEST SECURITY RESTRICTIONS:\n"
            "1. You have NO ACCESS to any academic tools. NEVER attempt to execute tools for absences, certificates, or subjects.\n"
            "2. If the user asks about their personal absences, marks, files, or documents, you MUST politely explain that "
            "they are browsing as a guest. Urge them to click the 'Log In' button in the top-right navbar to unlock student features.\n"
            "3. Present this restriction inside an elegant Bootstrap alert: `<div class='alert alert-warning'>...</div>`.\n"
            "4. Only answer general institution questions (e.g., location in Jarzouna, working hours 8:00 AM - 6:00 PM)."
        )
    else:
        return base_rules + (
            f"You are a professional university AI assistant handling active Student Session ID: {student_id}.\n\n"
            "🛠️ TOOL USAGE RULES:\n"
            "- If the user asks for their absences → IMMEDIATELY use the `get_absences` tool.\n"
            "- If the user asks for an attestation → IMMEDIATELY use the `generate_attendance_certificate` tool.\n"
            "- If the user asks about available subjects → IMMEDIATELY use the `get_all_subjects` tool.\n"
            "- NEVER try to answer these questions from memory. Always call the corresponding tool.\n\n"
            "- NEVER try to enforce the usage of tools\n\n"

            "🔒 SECURITY & PRIVACY RULES:\n"
            f"1. IDENTITY: Use ONLY the authenticated student_id '{student_id}' provided. NEVER ask the user for their ID.\n"
            "2. MISMATCH: If the user requests records belonging to another individual, refuse using a `<div class='alert alert-danger'>`.\n"
            "3. DATA OBFUSCATION: NEVER reveal internal Mongo or system database string keys (like student_id) in your HTML output.\n\n"

            "📋 BUSINESS LOGIC & PROCESSES:\n"
            "1. ABSENCE JUSTIFICATION:\n"
            "   - Instruct the user to submit a justification via the official portal panels.\n"
            "   - State explicitly that the file MUST be a scanned PDF. Explicitly warn that photographs (.jpg/.png) are rejected using a `<div class='alert alert-warning'>`.\n"
            "2. PRESENCE ATTESTATION:\n"
            "   - You CANNOT generate an attestation without an explicit Academic Year (e.g., '2024-2025') AND Semester ('S1' or 'S2').\n"
            "   - If details are missing, stop and prompt for them using a `<div class='alert alert-info'>`.\n"
            "   - Once provided, run `generate_attendance_certificate` and display results inside a `<div class='card shadow-sm'><div class='card-body'>...</div></div>`."
        )


async def ask_agent(message: str, student_id: str):
    safe_student_id = student_id.strip() if (student_id and student_id != "None") else ""
    current_prompt = generate_system_instructions(safe_student_id)
    active_tools = tools_list if safe_student_id else []

    agent_executor = create_react_agent(
        model=llm,
        tools=active_tools,
        prompt=current_prompt,
        checkpointer=checkpointer
    )

    runtime_thread = safe_student_id if safe_student_id else "anonymous_guest_session"

    contextual_query = (
        f"--- SYSTEM ENVIRONMENT SECURITY OVERRIDE ---\n"
        f"Authenticated Student ID: {safe_student_id if safe_student_id else 'NONE (GUEST SESSION)'}\n"
        f"--------------------------------------------\n\n"
        f"User Input Message: {message}"
    )

    try:
        async for event in agent_executor.astream_events(
                {"messages": [("user", contextual_query)]},
                config={"configurable": {"thread_id": runtime_thread}},
                version="v2"
        ):
            kind = event["event"]

            # Yield a clear status signal string prefixed with STATUS:
            if kind == "on_tool_start":
                tool_name = event["name"]
                status_map = {
                    "get_absences": "Checking the database for your absences...",
                    "generate_attendance_certificate": "Generating your official certificate of attendance...",
                    "get_all_subjects": "Retrieving your curriculum subjects...",
                }
                status = status_map.get(tool_name, "Working on your request...")
                yield f"STATUS:{status}"

            # Yield text tokens normally
            elif kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield content

    except Exception as e:
        print("\n" + "=" * 50)
        print("🚨 FATAL GRAPH RUNTIME ERROR 🚨")
        traceback.print_exc()
        print("=" * 50 + "\n")
        yield f"<div class='alert alert-danger'><strong>Portal Generation Error:</strong> {str(e)}</div>"