import os
import time
import numpy as np
import httpx

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL_NAME = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768

BATCH_SIZE = 10
MAX_RETRIES = 3


def embed_batch(batch):

    for attempt in range(MAX_RETRIES):

        try:

            result = client.models.embed_content(
                model=MODEL_NAME,
                contents=batch,
                config=types.EmbedContentConfig(
                    task_type="SEMANTIC_SIMILARITY",
                    output_dimensionality=EMBEDDING_DIMENSION
                )
            )

            return result.embeddings

        except (
            httpx.RemoteProtocolError,
            httpx.ConnectError,
            httpx.ReadTimeout
        ) as error:

            if attempt == MAX_RETRIES - 1:
                raise error

            wait_time = 2 ** attempt

            print(
                f"Embedding request failed. "
                f"Retrying in {wait_time} seconds..."
            )

            time.sleep(wait_time)


def generate_embeddings(texts):

    if not texts:
        return np.array(
            [],
            dtype="float32"
        )

    all_embeddings = []

    for start in range(
        0,
        len(texts),
        BATCH_SIZE
    ):

        batch = texts[
            start:start + BATCH_SIZE
        ]

        result_embeddings = embed_batch(
            batch
        )

        for embedding in result_embeddings:

            vector = np.array(
                embedding.values,
                dtype="float32"
            )

            norm = np.linalg.norm(
                vector
            )

            if norm > 0:
                vector = vector / norm

            all_embeddings.append(
                vector
            )

    return np.array(
        all_embeddings,
        dtype="float32"
    )