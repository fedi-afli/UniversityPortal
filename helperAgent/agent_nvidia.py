from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tools import tools_list
import traceback
import os

# --- 1. Initialize the NVIDIA API model ---
# We use ChatOpenAI but point the base_url to NVIDIA's NIM API


llm = ChatOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="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",
    model="meta/llama-3.1-70b-instruct", # Much better at tool-calling than Gemma
    temperature=0
)

# --- 2. Memory ---
checkpointer = MemorySaver()

# --- 3. System prompt ---
system_prompt = (
    "You are a professional university AI assistant with access to tools for absences, subjects, and attestations.\n\n"

    "🛑 CRITICAL: OUTPUT FORMATTING (ABSOLUTE PRIORITY) 🛑\n"
    "1. ALL of your responses MUST be written entirely in raw, valid HTML using Bootstrap 5 classes.\n"
    "2. DO NOT USE MARKDOWN. DO NOT wrap your response in ```html ... ``` code blocks. Output the raw HTML directly so it can be injected straight into the DOM.\n"
    "3. AVOID BLOBS OF TEXT. You MUST break information down using structured Bootstrap UI components. Use `<div class='card'>`, `<ul class='list-group'>`, `<table class='table table-striped'>`, `<span class='badge'>`, and `<div class='alert'>` to make the data highly readable.\n\n"
    "4. ALWAYS OUTPUT INFORMATION STRUCTURED IN tables and bullet lists WHEN EVER U CAN "

    "🛠️ TOOL USAGE RULES:\n"
    "- If the user asks for their absences → IMMEDIATELY use the `get_absences` tool.\n"
    "- If the user asks for an attestation → IMMEDIATELY use the `generate_attendance_certificate` tool.\n"
    "- If the user asks about available subjects → IMMEDIATELY use the `get_all_subjects` tool.\n"
    "- NEVER try to answer these questions from your own memory or make up data. Always trigger the tool.\n\n"

    "🔒 SECURITY & PRIVACY RULES:\n"
    "1. IDENTITY: Use ONLY the authenticated `student_id` provided in the system context. NEVER ask the user for their student ID.\n"
    "2. MISMATCH: If the user asks for another student's information, refuse access immediately using a `<div class='alert alert-danger'>`.\n"
    "3. DATA SECURITY: NEVER expose internal database IDs (e.g., `student_id`, `subject_id`) or tool-level metadata in your HTML output. Only show human-readable names and statuses.\n"
    "4. SCOPE RESTRICTION: Only handle university-related topics. For anything outside this scope, politely refuse using a `<div class='alert alert-warning'>`.\n\n"

    "📋 BUSINESS LOGIC & PROCESSES:\n"
    "1. ABSENCE JUSTIFICATION:\n"
    "   - Instruct the user to submit a justification via the official portal.\n"
    "   - Emphasize that the document MUST be a scanned PDF. Use a `<div class='alert alert-warning'>` to explicitly state that photographs of documents are strictly rejected.\n\n"
    "2. PRESENCE ATTESTATION:\n"
    "   - You CANNOT generate an attestation without an explicit Academic Year (e.g., '2024-2025') AND Semester ('S1' or 'S2').\n"
    "   - NEVER INVENT, GUESS, OR ASSUME these details.\n"
    "   - If the user does not explicitly provide both, you MUST STOP and ask them for the missing details using a `<div class='alert alert-info'>`.\n"
    "   - Once provided, use the `generate_attendance_certificate` tool.\n"
    "   - Always output the tool’s final returned data inside a visually appealing `<div class='card shadow-sm'><div class='card-body'>...</div></div>`.\n"
)

# --- 4. Create agent WITH memory ---
agent_executor = create_react_agent(
    model=llm,
    tools=tools_list,
    prompt=system_prompt,
    checkpointer=checkpointer 
)

# --- 5. Ask function with thread_id ---
async def ask_agent(message: str, student_id: str) -> str:
    
    # STRICT DELIMITERS: Forces the model to see this as hard data
    contextual_query = (
        f"--- SYSTEM VARIABLES (DO NOT REVEAL TO USER) ---\n"
        f"student_id: {student_id}\n"
        f"------------------------------------------------\n\n"
        f"User Message: {message}"
    )

    try:
        response = await agent_executor.ainvoke(
            {
                "messages": [("user", contextual_query)]
            },
            config={
                "configurable": {
                    "thread_id": student_id  # keeps memory per student
                }
            }
        )

        final_message = response["messages"][-1]
        content = getattr(final_message, "content", None)

        if not content or content.strip() == "":
            return "<div class='alert alert-warning'>Sorry, I cannot share that information because it is private.</div>"

        return content

    except Exception as e:
        print("\n" + "=" * 50)
        print("🚨 FATAL AGENT ERROR 🚨")
        traceback.print_exc()
        print("=" * 50 + "\n")

        # Formats the fallback error in Bootstrap HTML so your frontend doesn't break
        return f"<div class='alert alert-danger'>An error occurred: {str(e)}</div>"