import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL_NAME = "gemini-3.6-flash"


def generate_answer(question, context):

    if not context or context.strip() == (
        "Answer the user's question "
        "using your general knowledge."
    ):
        prompt = f"""
You are a helpful AI research assistant.

Answer the user's question using your general knowledge.

Give a clear, accurate, and useful answer.

Question:
{question}

Answer:
"""

    else:
        prompt = f"""
You are a helpful AI research assistant.

Answer the user's question using the provided context.

Use the context when it contains information relevant to the question.

If the context contains numbered sources, cite relevant information using:
[Source 1]
[Source 2]
[Source 3]

Never invent citations.

If the context does not contain enough information, but you can answer using reliable general knowledge, answer using your general knowledge.

Only say:
"I could not find enough information in the provided sources."

when the user specifically asks for information from a document, PDF, research paper, or provided sources and that information is not available.

Context:
{context}

Question:
{question}

Answer:
"""

    interaction = client.interactions.create(
        model=MODEL_NAME,
        input=prompt,
        generation_config={
            "thinking_level": "minimal",
            "max_output_tokens": 1024
        }
    )

    return interaction.output_text