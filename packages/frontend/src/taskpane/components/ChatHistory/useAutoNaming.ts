import { libraryApi } from "../../../services/libraryApi";
import { backendApi } from "../../../services/api";

export const useAutoNaming = () => {
  const generateTitle = async (
    sessionId: string,
    firstMessage: string,
    firstResponse: string
  ): Promise<string | null> => {
    try {
      // Use the ask API to generate a title
      const prompt = `Generate a concise 3-5 word title for this conversation. Only return the title, nothing else.

User: ${firstMessage.substring(0, 200)}
Assistant: ${firstResponse.substring(0, 200)}

Title:`;

      const result = await backendApi.askStream({
        question: prompt,
        sourceConfig: {
          includeDocument: false,
          enableWebSearch: false,
        },
      });

      const title = result.answer.trim().replace(/^Title:\s*/i, "").trim();
      
      // Clean up the title - remove quotes, limit length
      const cleanTitle = title
        .replace(/^["']|["']$/g, "")
        .substring(0, 60)
        .trim();

      if (cleanTitle && cleanTitle.length > 0) {
        // Update the session title
        await libraryApi.updateChatSession(sessionId, cleanTitle);
        return cleanTitle;
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
    }

    // Fallback to truncated first message
    const fallbackTitle = firstMessage.substring(0, 50).trim();
    if (fallbackTitle) {
      try {
        await libraryApi.updateChatSession(sessionId, fallbackTitle);
        return fallbackTitle;
      } catch (error) {
        console.error("Failed to update with fallback title:", error);
      }
    }

    return null;
  };

  return { generateTitle };
};

