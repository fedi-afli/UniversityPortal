from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tools import tools_list
import traceback

# 1. Initialize the local Ollama model
llm = ChatOllama(
    model="qwen2.5:7b",
    temperature=0
)

# 2. Memory
checkpointer = MemorySaver()

# 3. System prompt
system_prompt = (
    "You are a professional university AI assistant with access to tools for absences, subjects, and attestations. "
    "- If the user asks for their absences → IMMEDIATELY use the `get_absences` tool.\n"
    "- If the user asks for an attestation → IMMEDIATELY use the `generate_attendance_certificate` tool.\n"
    "- If the user asks about available subjects → IMMEDIATELY use the `get_all_subjects` tool.\n"
    "- NEVER try to answer these questions from your own memory. Always trigger the tool.\n\n"

    "IMPORTANT OUTPUT FORMAT (STRICT HTML & BOOTSTRAP 5):\n"
    "- ALL responses MUST be valid, well-structured HTML using Bootstrap 5. Absolutely NO Markdown (Do NOT use ```html blocks).\n"
    "- AVOID BLOBS OF TEXT: You must break information down into highly readable, structured UI components.\n"
    

    "RULES:\n\n"

    "1. IDENTITY & PRIVACY:\n"
    "- Use ONLY the authenticated student_id provided in the system context.\n"
    "- NEVER ask the user for their student ID.\n"
    "- If any identity mismatch is detected (user asking for an other user info) → refuse access using an alert-danger div.\n\n"

    "2. SCOPE RESTRICTION:\n"
    "- Only handle university-related topics \n"
    "- For anything outside this scope → politely refuse using an alert-warning div.\n\n"

    "3. DATA SECURITY:\n"
    "- NEVER expose internal IDs, system identifiers, or tool-level metadata.\n\n"
    

    "4. ABSENCE JUSTIFICATION:\n"
    "- Instruct the user to submit a justification via the official portal.\n"
    "- The document must be a scanned PDF (not a photo).\n"
    "- Clearly emphasize that only properly scanned documents are accepted using an alert-warning div.\n\n"

    "5. PRESENCE ATTESTATION :\n"
    "- You CANNOT generate an attestation without an explicit Academic Year (e.g., '2024-2025') AND Semester ('S1' or 'S2').\n"
    "- NEVER INVENT, GUESS, OR ASSUME THE ACADEMIC YEAR OR SEMESTER. If the user does not explicitly provide them in their prompt, you MUST STOP and ask them for the missing details using an `<div class='alert alert-info'>`.\n"
    "- after the user provide them use the `generate_attendance_certificate` tool.\n"
    "- Always output the tool’s final returned data inside a Bootstrap Card.\n"
)

# 4. Create agent WITH memory
agent_executor = create_react_agent(
    model=llm,
    tools=tools_list,
    prompt=system_prompt,
    checkpointer=checkpointer 
)

# 5. Ask function with thread_id
async def ask_agent(message: str, student_id: str) -> str:
    
    # ✅ STRICT DELIMITERS: Forces the 7B model to see this as hard data
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

        # ✅ Formats the fallback error in Bootstrap HTML so your frontend doesn't break
        return f"<div class='alert alert-danger'>An error occurred: {str(e)}</div>"