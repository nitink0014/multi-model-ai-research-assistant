from ddgs import DDGS

def search_web(query, max_results=5):

    results = DDGS().text(
        query,
        region="us-en",
        safesearch="moderate",
        max_results=max_results
    )

    return results