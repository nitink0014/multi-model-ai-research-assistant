from app.services.embedding_service import generate_embeddings
from app.services.vector_service import create_faiss_index, search_faiss
from app.services.llm_service import generate_answer


def ask_rag(chunks, question, k=2):

    embeddings = generate_embeddings(chunks)

    index = create_faiss_index(embeddings)

    query_embedding = generate_embeddings([question])[0]

    distances, indices = search_faiss(
        index,
        query_embedding,
        k
    )

    relevant_chunks = []

    for index_value in indices:
        relevant_chunks.append(
            chunks[index_value]
        )

    context = "\n\n".join(relevant_chunks)

    answer = generate_answer(
        question,
        context
    )

    return {
        "question": question,
        "context": relevant_chunks,
        "answer": answer
    }