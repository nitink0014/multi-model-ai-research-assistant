import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def generate_groq_answer(question, context):

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

The context may contain numbered sources.

If you use information from a numbered source, cite it using exactly:
[Source 1]
[Source 2]
[Source 3]

Never invent citations.

If the provided context does not contain enough information, but you can answer using reliable general knowledge, answer using your general knowledge.

Only say:
"I could not find enough information in the provided sources."

when the user specifically asks for information from a document, PDF, research paper, or provided sources and that information is not available.

Context:
{context}

Question:
{question}

Answer:
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content