import re
from typing import List


class MeetingSummarizer:
    """
    Generates concise executive summaries from meeting notes.
    """

    def summarize(self, title: str, notes: str) -> str:
        """
        Returns a concise summary string for the given meeting notes.
        """
        if not notes or not notes.strip():
            return f"Meeting '{title}' recorded with no detailed notes."

        lines = [line.strip() for line in notes.splitlines() if line.strip()]
        
        # Clean bullet points and formatting
        cleaned_lines = [re.sub(r"^[-*•\d+.\s]+", "", l) for l in lines]
        
        # Select key sentence candidates
        key_sentences = [l for l in cleaned_lines if len(l.split()) >= 3 and not l.endswith(":")]

        if not key_sentences:
            return f"Meeting '{title}' covered project updates and key alignment items."

        summary_body = " ".join(key_sentences[:3])
        if not summary_body.endswith("."):
            summary_body += "."

        return f"Summary for '{title}': {summary_body}"


meeting_summarizer = MeetingSummarizer()
