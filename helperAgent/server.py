from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from agent_nvidia import ask_agent

app = FastAPI()

class RequestBody(BaseModel):
    message: str
    student_id: str

@app.post("/ask")
async def ask_agent_endpoint(body: RequestBody):
    """
    Sends the user message to the Ollama agent.
    The agent decides autonomously whether to call a tool.
    """
    try:
        # Call the async function from agent.py
        result_text = await ask_agent(message=body.message, student_id=body.student_id)
        
        # Return the final text interpretation back to the user
        return {"response": result_text}
    
    except Exception as e:
        # Catch errors and return a clean 500 response
        raise HTTPException(status_code=500, detail=str(e))

# Run using: uvicorn server:app --reload