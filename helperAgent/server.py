import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent_nvidia import ask_agent

app = FastAPI()


class RequestBody(BaseModel):
    message: str
    student_id: str


async def event_generator(message: str, student_id: str):
    async for chunk in ask_agent(message=message, student_id=student_id):
        # Intercept status strings and route them to status_update
        if isinstance(chunk, str) and chunk.startswith("STATUS:"):
            status_text = chunk.replace("STATUS:", "")
            yield f"data: {json.dumps({'status_update': status_text})}\n\n"
        else:
            # Route text components to token payload natively
            yield f"data: {json.dumps({'token': chunk})}\n\n"

    yield "data: [DONE]\n\n"


@app.post("/ask")
async def ask_agent_endpoint(body: RequestBody):
    return StreamingResponse(
        event_generator(body.message, body.student_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )