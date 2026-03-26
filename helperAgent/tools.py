from langchain_core.tools import tool
from bson import ObjectId
from db import db
import os





@tool
async def get_stduent_info(student_id: str) -> dict:
    """
    Fetches basic information about the student with that stdudent id .

    Use this tool ONLY when the user asks about their own personal information 
    (e.g., name, email, ID).

    You MUST use this tool to verify the identity of the current user and ensure 
    that the request is about their own data.

    If the request involves accessing another student's information, DO NOT use this tool. 
    Instead, refuse the request and clearly state that student data is private and cannot be shared.
   
    """
    print(f"[DEBUG] Fetching user info for student ID: {student_id}")

    students_collection = db["users"]

    try:
        student_object_id = ObjectId(student_id)
    except Exception as e:
        print(f"[ERROR] Invalid ObjectId: {e}")
        return {"error": "Invalid student ID"}

    student = await students_collection.find_one({"_id": student_object_id})

    if not student:
        return {"error": "Student not found"}

    # ✅ Only return SAFE fields (no sensitive data)
    return {
        "firstName": student.get("firstName", ""),
        "lastName": student.get("lastName", ""),
        "email": student.get("email", ""),
        "nationalId": student.get("nationalId", ""),
        "isBlocked": student.get("isBlocked", False)
    }


@tool
async def get_absences(student_id: str) -> list[dict]:
    """
    Fetches all recorded absences for a specific student.
    Returns a list of subjects with the student's total absences, unjustified absences, 
    and the specific maximum allowed absences for that course.
    """
    absences_collection = db["absences"]
    subjects_collection = db["subjects"]

    print(f"[DEBUG] Fetching absences for student ID: {student_id}")

    try:
        student_object_id = ObjectId(student_id)
    except Exception as e:
        print(f"[ERROR] Invalid ObjectId: {e}")
        return []

    cursor = absences_collection.find({"student": student_object_id})

    # Step 1: Count absences and group by subject ID
    # Format: { "subject_id_string": {"total": 0, "unjustified": 0} }
    stats = {}
    async for doc in cursor:
        subj_id = str(doc.get("subject"))
        is_justified = doc.get("isJustified", False)

        if subj_id not in stats:
            stats[subj_id] = {"total": 0, "unjustified": 0}

        stats[subj_id]["total"] += 1
        if not is_justified:
            stats[subj_id]["unjustified"] += 1

    # Step 2: Enrich with actual Subject data (Name, Code, Max Limit)
    enriched_results = []
    for subj_id, counts in stats.items():
        subject_doc = await subjects_collection.find_one({"_id": ObjectId(subj_id)})
        
        if subject_doc:
            subj_name = subject_doc.get("name", "Unknown Subject")
            subj_code = subject_doc.get("code", "N/A")
            # Pull the dynamic limit straight from your schema, default to 3 if missing
            max_limit = subject_doc.get("maxAbsencesLimit", 3) 
        else:
            subj_name = "Deleted/Unknown Subject"
            subj_code = "N/A"
            max_limit = 3

        enriched_results.append({
            "subject": subj_name,
            "code": subj_code,
            "total_absences": counts["total"],
            "unjustified_absences": counts["unjustified"],
            "max_allowed": max_limit
        })

    print(f"[DEBUG] Enriched results: {enriched_results}")
    return enriched_results


@tool
async def check_excessive_absences(student_id: str) -> str:
    """
    Checks if a student has exceeded the maximum allowed UNJUSTIFIED absences in any subject.
    Call this tool when a student asks if they are at risk of failing or being eliminated.
    """
    print(f"[DEBUG] Checking excessive absences for student_id: {student_id}")
    
    # We call the highly detailed tool we just created
    absences_list = await get_absences.coroutine(student_id)
    
    if not absences_list:
        return "✅ The student has absolutely no absences on record."

    warnings = []
    
    for record in absences_list:
        subject_name = record["subject"]
        unjustified = record["unjustified_absences"]
        max_limit = record["max_allowed"]
        
        # Check if their unjustified absences hit or exceed the subject's specific limit
        if unjustified >= max_limit:
            warnings.append(f"- **{subject_name}**: {unjustified} unjustified absences (Limit: {max_limit})")

    # If the list is empty, they haven't crossed any limits
    if not warnings:
        return "✅ The student is safe. They have some absences, but none exceed the elimination limits for their subjects."

    # If they exceeded the limit, formulate a strict warning
    warning_message = (
        "⚠️ **ALARM: ELIMINATION RISK** ⚠️\n"
        "The student has exceeded the maximum allowed unjustified absences in the following subjects:\n"
        + "\n".join(warnings)
    )
    
    return warning_message


@tool
async def get_all_subjects() -> str:
    """
    Fetches and returns a complete list of all subjects or courses available in the university.
    Call this tool when a user asks "what subjects are there?", "list all courses", or 
    needs to know the names of the modules.
    """
    print("[DEBUG] Fetching the list of all subjects")
    subjects_collection = db["subjects"]
    
    try:
        # Find all documents in the subjects collection
        cursor = subjects_collection.find({})
        
        subjects_list = []
        async for doc in cursor:
            name = doc.get("name", "Unknown Subject")
            code = doc.get("code", "N/A")
            # Format it nicely for the LLM
            subjects_list.append(f"- {name} (Code: {code})")
            
        if not subjects_list:
            return "There are currently no subjects listed in the database."
            
        return "Available Subjects:\n" + "\n".join(subjects_list)
        
    except Exception as e:
        print(f"[ERROR] Could not fetch subjects: {e}")
        return "I'm sorry, I encountered a database error while trying to retrieve the subjects."




import httpx




@tool
async def delegate_attestation_to_agent(message: str,studentID:str) -> str:
    """
    Sends a message to the external AI chat agent.
    Only forwards the message and authenticates using AI_PASS.
    Always informs the user that the demand for the attestation has been sent and expect to be emailed shortly.
    """
    print(f"[DEBUG] Sending message to attestation agent: {message} and student id {studentID}")

    url = "http://localhost:5000/api/chat/message"
    ai_pass = "AHLABIK"

    payload = {
        "message": message,
        "stduentId": studentID, # Note: Verify your node server actually spells this "stduentId" and not "studentId"
        "x-ai-pass": ai_pass
    }

    # FIX 1: Add the headers variable back!
    headers = {
        "x-ai-pass": ai_pass
    }

    try:
        # FIX 2: Add the timeout back so the email has time to send!
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers
            )

            print("STATUS:", response.status_code)
            print("BODY:", response.text)

            response.raise_for_status()
            return response.text

    except Exception as e:
        return f"❌ Error while sending request: {str(e)}"

# tools_list definition remains the same

# Note: get_subject_by_id is no longer strictly needed as a standalone tool 
# because get_absences handles the translation automatically now, but you can 
# leave it in the list if you want the user to be able to ask "What is subject FDD?"
tools_list = [get_stduent_info,get_absences, check_excessive_absences, get_all_subjects,delegate_attestation_to_agent]