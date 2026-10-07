import asyncio
import json
import logging
import os
import sys
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from shared.protocol import ProtocolMessage
from agent.runner import AgentBridgeRunner

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("agentbridge.server")

app = FastAPI(
    title="AgentBridge Runtime Server",
    description="Universal backend runtime for AgentBridge semantic execution layer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Set[WebSocket] = set()
current_runner: AgentBridgeRunner | None = None

async def broadcast_to_extension(data: dict):
    message_str = json.dumps(data)
    for ws in list(active_connections):
        try:
            await ws.send_text(message_str)
        except Exception as e:
            logger.warning(f"Error sending to extension websocket: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_extensions": len(active_connections),
        "service": "AgentBridge Universal Runtime"
    }

@app.websocket("/ws/extension")
async def websocket_extension_endpoint(websocket: WebSocket):
    global current_runner
    await websocket.accept()
    active_connections.add(websocket)
    logger.info("Extension connected via WebSocket")

    runner = AgentBridgeRunner(broadcast_to_extension)
    current_runner = runner

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg = ProtocolMessage(**data)
            except Exception as pe:
                logger.warning(f"Invalid message format received: {raw_text[:100]}... Error: {pe}")
                continue

            msg_type = msg.type
            logger.info(f"Received message type: {msg_type}")

            if msg_type == "client.hello":
                await websocket.send_text(json.dumps({
                    "type": "server.hello",
                    "request_id": msg.request_id,
                    "payload": {"status": "connected", "server": "AgentBridge Universal Runtime v1.0"},
                    "timestamp": 0.0
                }))

            elif msg_type == "agent.run_gmail_summary_task":
                asyncio.create_task(runner.execute_gmail_summary_task())

            elif msg_type == "agent.run_shopping_task":
                asyncio.create_task(runner.execute_shopping_task())

            elif msg_type == "agent.run_universal_task":
                goal = msg.payload.get("goal", "Universal Task")
                asyncio.create_task(runner.execute_universal_task(goal))

            elif msg_type in ("page.inspect_result", "action.result"):
                runner.handle_incoming_message(msg)

            elif msg_type == "task.sync":
                pass

    except WebSocketDisconnect:
        logger.info("Extension disconnected from WebSocket")
    finally:
        active_connections.discard(websocket)

# Serve test mock pages
MOCK_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "mock_pages")
if os.path.exists(MOCK_DIR):
    app.mount("/mock", StaticFiles(directory=MOCK_DIR, html=True), name="mock")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8765, reload=False)
