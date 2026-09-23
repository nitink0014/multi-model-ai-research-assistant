from app.services.web_search_service import search_web


def get_web_context(question, max_results=5):

    results = search_web(
        question,
        max_results=max_results
    )

    context_parts = []
    sources = []

    for i, result in enumerate(results):

        source_number = i + 1

        context_parts.append(
            f"[Source {source_number}]\n"
            f"Title: {result['title']}\n"
            f"URL: {result['href']}\n"
            f"Description: {result['body']}"
        )

        sources.append({
            "id": source_number,
            "title": result["title"],
            "url": result["href"]
        })

    context = "\n\n".join(context_parts)

    return context, sources