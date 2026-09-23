from datetime import datetime, timezone

from app.services.database_service import document_collection
from app.services.embedding_service import generate_embeddings
from app.services.vector_service import (
    create_faiss_index,
    search_faiss
)


documents = {}


def add_document(
    user_id,
    session_id,
    filename,
    chunks
):

    embeddings = generate_embeddings(chunks)

    index = create_faiss_index(embeddings)

    if user_id not in documents:
        documents[user_id] = {}

    if session_id not in documents[user_id]:
        documents[user_id][session_id] = {}

    documents[user_id][session_id][filename] = {
        "filename": filename,
        "chunks": chunks,
        "index": index
    }

    document_collection.update_one(
        {
            "user_id": user_id,
            "session_id": session_id,
            "filename": filename
        },
        {
            "$set": {
                "user_id": user_id,
                "session_id": session_id,
                "filename": filename,
                "chunks": chunks,
                "chunk_count": len(chunks),
                "uploaded_at": datetime.now(
                    timezone.utc
                )
            }
        },
        upsert=True
    )


def load_documents_from_database(
    user_id,
    session_id
):

    saved_documents = document_collection.find({
        "user_id": user_id,
        "session_id": session_id
    })

    session_documents = {}

    for saved_document in saved_documents:

        filename = saved_document["filename"]

        chunks = saved_document.get(
            "chunks",
            []
        )

        if not chunks:
            continue

        embeddings = generate_embeddings(
            chunks
        )

        index = create_faiss_index(
            embeddings
        )

        session_documents[filename] = {
            "filename": filename,
            "chunks": chunks,
            "index": index
        }

    if user_id not in documents:
        documents[user_id] = {}

    documents[user_id][session_id] = (
        session_documents
    )

    return session_documents


def search_document(
    user_id,
    session_id,
    question,
    k=3
):

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        load_documents_from_database(
            user_id,
            session_id
        )

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        return []

    session_documents = (
        documents[user_id][session_id]
    )

    if not session_documents:
        return []

    query_embedding = generate_embeddings(
        [question]
    )[0]

    all_results = []

    for filename, document in (
        session_documents.items()
    ):

        chunks = document["chunks"]

        if not chunks:
            continue

        document_k = min(
            k,
            len(chunks)
        )

        distances, indices = search_faiss(
            document["index"],
            query_embedding,
            document_k
        )

        for i in range(len(indices)):

            index_value = indices[i]

            if index_value < 0:
                continue

            if index_value >= len(chunks):
                continue

            all_results.append({
                "filename": filename,
                "chunk": chunks[index_value],
                "distance": float(
                    distances[i]
                )
            })

    all_results.sort(
        key=lambda result: result["distance"]
    )

    return all_results[:k]


def get_documents(
    user_id,
    session_id
):

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        load_documents_from_database(
            user_id,
            session_id
        )

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        return []

    result = []

    for filename, document in (
        documents[user_id][session_id].items()
    ):

        result.append({
            "filename": filename,
            "chunk_count": len(
                document["chunks"]
            )
        })

    return result


def get_document(
    user_id,
    session_id,
    filename
):

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        load_documents_from_database(
            user_id,
            session_id
        )

    if (
        user_id not in documents
        or session_id not in documents[user_id]
    ):
        return None

    return documents[
        user_id
    ][session_id].get(filename)


def clear_document(
    user_id,
    session_id,
    filename
):

    if (
        user_id in documents
        and session_id in documents[user_id]
    ):

        if filename in documents[user_id][session_id]:

            del documents[
                user_id
            ][session_id][filename]

        if not documents[user_id][session_id]:

            del documents[
                user_id
            ][session_id]

        if not documents[user_id]:

            del documents[user_id]

    document_collection.delete_one({
        "user_id": user_id,
        "session_id": session_id,
        "filename": filename
    })