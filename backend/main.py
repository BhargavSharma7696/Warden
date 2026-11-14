from contextlib import asynccontextmanager
from fastapi import FastAPI

from database import init_db
from routers import auth

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware






@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()      # startup pe chalega
    yield          # app yahan chalti rahegi
    # shutdown ka kaam (agar ho) yahan aayega


app = FastAPI(lifespan=lifespan)
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)