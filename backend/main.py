# backend/main.py
# FastAPI backend converted from your Colab notebook (YT_Video_Query_Bot_(RAG with Langchain).ipynb)
# Uses: youtube-transcript-api, langchain-google-genai, langchain_community FAISS, sentence splitters
# Env vars required:
# - GOOGLE_API_KEY (for Google Generative API / embeddings)
# - ALLOWED_ORIGINS (comma-separated origins for CORS, e.g. https://your-frontend.vercel.app)
# - OPTIONAL: SAVE_INDEX_DIR (directory to persist indexes; default ./indexes)

import os
import re
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document

# ---------- Config ----------
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS','*').split(',')
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL','models/text-embedding-004')
LLM_MODEL = os.getenv('LLM_MODEL','gemini-1.5-realtime')
SAVE_INDEX_DIR = os.getenv('SAVE_INDEX_DIR','./indexes')

if not os.path.exists(SAVE_INDEX_DIR):
    os.makedirs(SAVE_INDEX_DIR, exist_ok=True)

# ---------- App ----------
app = FastAPI(title='YouTube RAG (from Colab)')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# In-memory threads store: thread_id -> dict (video_id, retriever, docs, metadata)
THREADS = {}

# Helpers
YOUTUBE_ID_REGEX = re.compile(r'(?:youtu\.be/|v=|/embed/|/shorts/)([\w-]{11})')

class IngestRequest(BaseModel):
    url: str
    language: Optional[str] = None

class IngestResponse(BaseModel):
    thread_id: str
    video_id: str
    url: HttpUrl
    chunks: int

class ChatRequest(BaseModel):
    thread_id: str
    message: str
    k: int = 4

class Source(BaseModel):
    text: str
    start: float
    end: float
    ts_label: str
    url: HttpUrl

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]

# Parse video id
def parse_video_id(url_or_id: str) -> str:
    m = YOUTUBE_ID_REGEX.search(url_or_id)
    if m:
        return m.group(1)
    if re.fullmatch(r'[\w-]{11}', url_or_id):
        return url_or_id
    raise HTTPException(status_code=400, detail='Could not parse YouTube video ID')

# Transcript fetch
def fetch_transcript(video_id: str, language: Optional[str] = None):
    try:
        if language:
            fetched = YouTubeTranscriptApi.get_transcript(video_id, languages=[language, 'en'])
        else:
            fetched = YouTubeTranscriptApi.get_transcript(video_id)
        return fetched
    except TranscriptsDisabled:
        raise HTTPException(status_code=404, detail='Transcripts are disabled for this video')
    except NoTranscriptFound:
        raise HTTPException(status_code=404, detail='No transcript found')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Transcript fetch failed: {e}')

# Chunking while preserving timestamps
def build_documents_with_timestamps(segments, target_chars=1000, overlap_chars=200):
    docs = []
    buf = []
    buf_len = 0
    chunk_start = None
    chunk_end = None
    for seg in segments:
        text = seg.get('text','').strip()
        if not text:
            continue
        start = float(seg.get('start',0.0))
        duration = float(seg.get('duration',0.0))
        end = start + duration
        if chunk_start is None:
            chunk_start = start
        chunk_end = end
        if buf_len + len(text) + 1 > target_chars and buf:
            chunk_text = ' '.join(buf)
            docs.append(Document(page_content=chunk_text, metadata={'start': chunk_start, 'end': chunk_end}))
            overlap_text = chunk_text[-overlap_chars:]
            buf = [overlap_text, text] if overlap_text else [text]
            buf_len = len(''.join(buf))
            chunk_start = start
        else:
            buf.append(text)
            buf_len += len(text) + 1
    if buf:
        chunk_text = ' '.join(buf)
        docs.append(Document(page_content=chunk_text, metadata={'start': chunk_start or 0.0, 'end': chunk_end or 0.0}))
    return docs

# Timestamp label
def format_ts_label(seconds: float) -> str:
    s = int(max(0, seconds))
    m, s = divmod(s,60)
    h, m = divmod(m,60)
    if h:
        return f'{h:02d}:{m:02d}:{s:02d}'
    return f'{m:02d}:{s:02d}'

# Build retriever
def build_retriever(docs: List[Document]):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail='GOOGLE_API_KEY is not set')
    embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)
    vs = FAISS.from_documents(docs, embeddings)
    retriever = vs.as_retriever(search_type='similarity', search_kwargs={'k':6})
    return retriever, vs

def yt_watch_url(video_id: str, start: float) -> str:
    return f'https://www.youtube.com/watch?v={video_id}&t={int(max(0, start))}s'

PROMPT_SYSTEM = ("You answer questions about a YouTube video using its transcript chunks. "
                 "Be concise and accurate. If the transcript does not contain the answer, say you don't know.")

def get_llm():
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail='GOOGLE_API_KEY not set')
    return ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.2)

@app.get('/health')
def health():
    return {'ok': True}

@app.post('/ingest', response_model=IngestResponse)
def ingest(req: IngestRequest):
    video_id = parse_video_id(req.url)
    segments = fetch_transcript(video_id, req.language)
    docs = build_documents_with_timestamps(segments)
    retriever, vs = build_retriever(docs)

    thread_id = uuid.uuid4().hex
    THREADS[thread_id] = {
        'video_id': video_id,
        'url': f'https://www.youtube.com/watch?v={video_id}',
        'retriever': retriever,
        'vectorstore': vs,
        'docs': docs,
    }

    return IngestResponse(thread_id=thread_id, video_id=video_id, url=THREADS[thread_id]['url'], chunks=len(docs))

@app.post('/chat', response_model=ChatResponse)
def chat(req: ChatRequest):
    thread = THREADS.get(req.thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail='Unknown thread_id. Call /ingest first.')
    retriever = thread['retriever']
    video_id = thread['video_id']

    docs = retriever.get_relevant_documents(req.message)[:req.k]
    context = '\n\n'.join(f"[Start {format_ts_label(float(d.metadata.get('start',0.0)))}] {d.page_content}" for d in docs)

    prompt = PromptTemplate(template="""
You are a helpful assistant.
Answer ONLY from the provided transcript context. If the context is insufficient, say you don't know.

{context}

Question: {question}
""", input_variables=['context','question'])

    final_prompt = prompt.invoke({'context': context, 'question': req.message})

    llm = get_llm()
    try:
        resp = llm.invoke(final_prompt)
        answer = resp.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'LLM error: {e}')

    sources = []
    for d in docs:
        start = float(d.metadata.get('start',0.0))
        end = float(d.metadata.get('end', start))
        ts_label = format_ts_label(start)
        sources.append(Source(text=d.page_content[:250] + ('...' if len(d.page_content)>250 else ''), start=start, end=end, ts_label=ts_label, url=yt_watch_url(video_id, start)))

    return ChatResponse(answer=answer, sources=sources)

# Run locally: uvicorn main:app --reload --port 8000

# ---------------------------
# README notes (quick)
# 1. Put this file in backend/main.py of a repo.
# 2. requirements.txt should include:
#    fastapi
#    uvicorn[standard]
#    youtube-transcript-api
#    langchain-google-genai
#    langchain-core
#    langchain-community
#    faiss-cpu
#    python-dotenv
# 3. Set GOOGLE_API_KEY in Render (or your host) and ALLOWED_ORIGINS to your frontend.
# 4. Deploy on Render (free web service) with start command:
#    uvicorn backend.main:app --host 0.0.0.0 --port $PORT
# 5. For frontend, set NEXT_PUBLIC_API_BASE to the Render URL and call /ingest and /chat as shown in previous plan.