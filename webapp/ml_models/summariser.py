"""
Ollama-powered ML functions with chunked map-reduce for large documents.
All inference is done via HTTP calls to the local Ollama instance.
"""

import json
import urllib.request
import urllib.error
import math

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "qwen2.5:3b"
CHUNK_SIZE = 1500  # words per chunk


# ─── Core Ollama Client ─────────────────────────────────────────────────────

def generate_from_ollama(prompt, model=DEFAULT_MODEL, system=""):
    """Calls the local Ollama instance to generate text."""
    data = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "system": system
    }
    req = urllib.request.Request(OLLAMA_URL, data=json.dumps(data).encode('utf-8'))
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get("response", "")
    except urllib.error.URLError as e:
        print(f"Ollama API Error: {e}")
        return None


# ─── Title Generation ────────────────────────────────────────────────────────

def generate_title(text):
    """Generate a short descriptive title from content."""
    system_prompt = (
        "You generate SHORT document titles. Respond with ONLY the title, "
        "no quotes, no explanation. Max 8 words."
    )
    prompt = f"Generate a short title for this content:\n\n{text[:1000]}"
    result = generate_from_ollama(prompt, system=system_prompt)
    if result:
        return result.strip().strip('"').strip("'")[:100]
    return None


# ─── Text Chunking ───────────────────────────────────────────────────────────

def split_into_chunks(text, chunk_size=CHUNK_SIZE):
    """Splits text into chunks of approximately `chunk_size` words."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    num_chunks = math.ceil(len(words) / chunk_size)
    chunks = []
    for i in range(num_chunks):
        start = i * chunk_size
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
    return chunks


# ─── Summarization (Map-Reduce for large docs) ──────────────────────────────

def summarize_chunk(text):
    """Summarize a single chunk of text."""
    system_prompt = "You are a concise text summarizer. Output a brief bullet-point summary."
    prompt = f"Summarize:\n\n{text}"
    return generate_from_ollama(prompt, system=system_prompt)


def summarize_text(text):
    """
    Summarize text using map-reduce for large documents.
    - Small docs: single pass
    - Large docs: chunk → summarize each → combine summaries → final pass
    """
    if not text or len(text.strip()) == 0:
        return ""
    words = text.split()
    if len(words) < 20:
        return text

    chunks = split_into_chunks(text)

    if len(chunks) == 1:
        # Small document — single pass
        result = summarize_chunk(text)
        return result if result else "Error during summarization."

    # Map phase: summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        print(f"  [Map] Summarizing chunk {i+1}/{len(chunks)}...")
        summary = summarize_chunk(chunk)
        if summary:
            chunk_summaries.append(summary)

    if not chunk_summaries:
        return "Error during summarization."

    # Reduce phase: combine all chunk summaries into a final summary
    combined = "\n\n".join(chunk_summaries)
    print(f"  [Reduce] Creating final summary from {len(chunk_summaries)} chunks...")
    system_prompt = "You are a text summarizer. Combine these section summaries into one cohesive, well-organized bullet-point summary. Remove redundancy."
    prompt = f"Combine these summaries into a single coherent summary:\n\n{combined}"
    final = generate_from_ollama(prompt, system=system_prompt)
    return final if final else combined  # Fallback to combined if reduce fails


# ─── Flashcard Generation ────────────────────────────────────────────────────

def generate_flashcards(text):
    """Generate flashcards from text. Uses the summary for large docs."""
    system_prompt = (
        "You are an AI that creates study flashcards. "
        "Your output MUST be a valid JSON array of objects. "
        "Each object must have a 'question' and 'answer' key. "
        "Do NOT output any other text than the JSON."
    )
    prompt = f"Create 5 to 10 flashcards from the following text:\n\n{text}"
    response = generate_from_ollama(prompt, system=system_prompt)
    return _parse_json_response(response, "flashcards")


# ─── Quiz Generation ─────────────────────────────────────────────────────────

def generate_quiz(text):
    """Generate a multiple-choice quiz from text."""
    system_prompt = (
        "You are an AI that creates multiple choice quizzes. "
        "Your output MUST be a valid JSON array of objects. "
        "Each object must have a 'question', 'options' (array of 4 strings), "
        "and 'answer' (the correct option string). "
        "Do NOT output any other text than the JSON."
    )
    prompt = f"Create a 5-question quiz from the following text:\n\n{text}"
    response = generate_from_ollama(prompt, system=system_prompt)
    return _parse_json_response(response, "quiz")


# ─── JSON Parsing Helper ─────────────────────────────────────────────────────

def _parse_json_response(response, label="data"):
    """Robustly parse JSON from an LLM response that may contain markdown fences."""
    if not response:
        return []
    try:
        cleaned = response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"Failed to parse {label} JSON: {response[:200]}")
        return []
