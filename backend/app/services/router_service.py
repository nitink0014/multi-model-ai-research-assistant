
from app.services.llm_service import generate_answer
from app.services.groq_service import generate_groq_answer
from app.services.web_rag_service import get_web_context


gemini_available = True


def select_model(question):

    question = question.lower()

    coding_keywords = [
        "code",
        "coding",
        "program",
        "programming",
        "python",
        "javascript",
        "java",
        "react",
        "bug",
        "debug"
    ]

    research_keywords = [
        "research",
        "research paper",
        "analyze",
        "analysis",
        "deep explanation",
        "detailed explanation"
    ]

    for keyword in coding_keywords:
        if keyword in question:
            return "groq"

    for keyword in research_keywords:
        if keyword in question:
            return "gemini"

    return "groq"

def needs_rag(question):

    question = question.lower()

    rag_keywords = [
        "document",
        "pdf",
        "according to",
        "according to this",
        "research paper",
        "paper",
        "this paper",
        "this document",
        "uploaded",
        "uploaded file",
        "uploaded pdf",
        "file",
        "from the document",
        "from this document",
        "from the pdf",
        "from this pdf",
        "in the document",
        "in this document",
        "in the pdf",
        "in this pdf",
        "based on the document",
        "based on this document",
        "based on the pdf",
        "based on this pdf",
        "summarize the document",
        "summarize this document",
        "summarize the pdf",
        "summarize this pdf"
    ]

    for keyword in rag_keywords:
        if keyword in question:
            return True

    return False

def needs_web_search(question):

    question = question.lower()

    web_keywords = [
        "latest",
        "recent",
        "today",
        "current",
        "now",
        "news",
        "new version",
        "latest version",
        "price",
        "weather",
        "release",
        "released",
        "2026"
    ]

    for keyword in web_keywords:
        if keyword in question:
            return True

    return False


def generate_with_model(
    question,
    context,
    model
):

    global gemini_available

    if model == "gemini":

        if not gemini_available:
            return generate_groq_answer(
                question,
                context
            ), "groq"

        try:

            answer = generate_answer(
                question,
                context
            )

            return answer, "gemini"

        except Exception as error:

            error_text = str(error).lower()

            print(
                f"Gemini error: {error}"
            )

            if (
                "429" in error_text
                or "rate limit" in error_text
                or "quota" in error_text
            ):

                gemini_available = False

                print(
                    "Gemini quota reached."
                )

                print(
                    "Gemini disabled for this session."
                )

            answer = generate_groq_answer(
                question,
                context
            )

            return answer, "groq"

    try:

        answer = generate_groq_answer(
            question,
            context
        )

        return answer, "groq"

    except Exception as error:

        print(
            f"Groq error: {error}"
        )

        if gemini_available:

            answer = generate_answer(
                question,
                context
            )

            return answer, "gemini"

        raise error


def route_question(
    question,
    context=""
):

    preferred_model = select_model(
        question
    )

    use_rag = needs_rag(
        question
    )

    use_web_search = needs_web_search(
        question
    )

    sources = []

    final_context = context

    if use_web_search:

        web_context, sources = get_web_context(
            question,
            max_results=5
        )

        if final_context:

            final_context += (
                "\n\nWeb search context:\n\n"
                + web_context
            )

        else:

            final_context = web_context

    if not final_context:

        final_context = (
            "Answer the user's question "
            "using your general knowledge."
        )

    answer, actual_model = generate_with_model(
        question,
        final_context,
        preferred_model
    )

    return {
        "question": question,
        "model": actual_model,
        "preferred_model": preferred_model,
        "use_rag": use_rag,
        "use_web_search": use_web_search,
        "answer": answer,
        "sources": sources
    }

