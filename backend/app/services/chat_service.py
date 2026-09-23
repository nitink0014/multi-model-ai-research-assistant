from app.services.router_service import route_question
from app.services.document_service import search_document
from app.services.database_service import chat_collection





def add_message(user_id, session_id, role, content):

    existing_chat = chat_collection.find_one({
         "user_id": user_id,
        "session_id": session_id
    })

    message = {
        "role": role,
        "content": content
    }

    if existing_chat:

        chat_collection.update_one(
            {
                 "user_id": user_id,
                "session_id": session_id
            },
            {
                "$push": {
                    "messages": message
                }
            }
        )

    else:

        title = (
            content[:50]
            if role == "user"
            else "New Chat"
        )

        chat_collection.insert_one({
             "user_id": user_id,
            "session_id": session_id,
            "title": title,
            "messages": [message]
        })

def get_history(user_id,session_id):

    chat = chat_collection.find_one({
        "user_id": user_id,
        "session_id": session_id
    })

    if not chat:
        return []

    return chat.get(
        "messages",
        []
    )

def clear_history(user_id,session_id):

    chat_collection.delete_one({
        "user_id": user_id,
        "session_id": session_id
    })

def build_conversation_context(
    user_id,
    session_id
):

    history = get_history(
    user_id,
    session_id
)

    if not history:
        return ""

    conversation = []

    for message in history:

        role = message["role"].capitalize()

        conversation.append(
            f"{role}: {message['content']}"
        )

    return "\n".join(conversation)


def chat_with_ai(
    user_id,
    session_id,
    question,
    context=""
):

    conversation_context = build_conversation_context(
    user_id,
    session_id
)

    document_results = search_document(
    user_id,
    session_id,
    question,
    k=3
)

    document_context = ""

    if document_results:

        document_parts = []

        for i, result in enumerate(document_results):

            source_number = i + 1
            document_parts.append(
            f"[Source {source_number}]\n"
            f"Document: {result['filename']}\n"
            f"{result['chunk']}"
            )

        document_context = "\n\n".join(
            document_parts
        )

    combined_context = ""

    if conversation_context:

        combined_context += f"""
Previous conversation:

{conversation_context}
"""

    if document_context:

        combined_context += f"""
Document context:

{document_context}
"""

    if context:

        combined_context += f"""
Additional context:

{context}
"""

    result = route_question(
        question,
        combined_context
    )

    add_message(
    user_id,
    session_id,
    "user",
    question
)

    add_message(
    user_id,
    session_id,
    "assistant",
    result["answer"]
)

    result["session_id"] = session_id

    result["document_sources"] = document_results

    return result

def get_all_sessions(user_id):

    sessions = []

    chats = chat_collection.find({
        "user_id": user_id
    }).sort(
        "_id",
        -1
    )

    for chat in chats:

        sessions.append({
            "session_id": chat["session_id"],
            "title": chat.get(
                "title",
                "New Chat"
            ),
            "message_count": len(
                chat.get("messages", [])
            )
        })

    return sessions
def get_session_messages(
    user_id,
    session_id
):

    chat = chat_collection.find_one({
        "user_id": user_id,
        "session_id": session_id
    })

    if not chat:
        return []

    return chat.get(
        "messages",
        []
    )