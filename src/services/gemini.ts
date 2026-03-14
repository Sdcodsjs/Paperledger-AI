import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const isNonRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    // Don't retry client errors (bad API key, invalid request, quota, etc.)
    const msg = error.message;
    if (/\b(400|401|403|404|429)\b/.test(msg)) return true;
    if (/API_KEY_INVALID|PERMISSION_DENIED|INVALID_ARGUMENT/i.test(msg)) return true;
  }
  return false;
};

const retry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || isNonRetryableError(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
};

export const extractDocumentData = async (base64Image: string, mimeType: string) => {
  return retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Image.includes(',') ? base64Image.split(',')[1] : base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: "Extract all financial data from this document. Identify vendor, date, total amount, tax amount, currency, and line items. Also flag if this looks like a duplicate or fraudulent document based on visual cues.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING },
            date: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                },
              },
            },
            isFraudulent: { type: Type.BOOLEAN },
            fraudReason: { type: Type.STRING },
            category: { type: Type.STRING },
            carbonFootprintKg: { type: Type.NUMBER, description: "Estimated carbon footprint in Kg CO2e based on the items purchased." },
            taxDeductibleScore: { type: Type.NUMBER, description: "Score from 0-100 on how likely this is a valid business tax deduction." },
            taxOptimizationTip: { type: Type.STRING, description: "A tip on how to optimize tax for this specific expense." },
            isSubscription: { type: Type.BOOLEAN, description: "Whether this looks like a recurring subscription." },
            subscriptionFrequency: { type: Type.STRING, description: "Frequency of subscription (monthly, yearly, etc.) if applicable." },
            confidenceScore: { type: Type.NUMBER, description: "Confidence score 0-100 of the extraction accuracy." },
            vendorReliabilityScore: { type: Type.NUMBER, description: "AI-generated reliability score for this vendor (0-100)." },
            smartTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI-suggested tags for categorization." },
          },
          required: ["vendor", "totalAmount", "date"],
        },
      },
    });

    if (!response.text) throw new Error("Empty response from AI");
    
    // Clean potential markdown code blocks
    let cleanText = response.text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7, cleanText.length - 3).trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3, cleanText.length - 3).trim();
    }
    
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse AI response:", cleanText);
      throw new Error("Invalid response format from AI");
    }
  });
};

export const extractFromText = async (textContent: string) => {
  return retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `You are a financial document OCR system. Extract all financial data from the following spreadsheet/document text content and return structured JSON.\n\nDocument Content:\n${textContent}\n\nExtract: vendor name, date, total amount, tax amount, currency, invoice number, line items, fraud indicators, category, carbon footprint estimate, tax deductible score, optimization tip, subscription status, confidence score, vendor reliability score, and smart tags.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING },
            date: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                },
              },
            },
            isFraudulent: { type: Type.BOOLEAN },
            fraudReason: { type: Type.STRING },
            category: { type: Type.STRING },
            carbonFootprintKg: { type: Type.NUMBER },
            taxDeductibleScore: { type: Type.NUMBER },
            taxOptimizationTip: { type: Type.STRING },
            isSubscription: { type: Type.BOOLEAN },
            subscriptionFrequency: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            vendorReliabilityScore: { type: Type.NUMBER },
            smartTags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["vendor", "totalAmount", "date"],
        },
      },
    });

    if (!response.text) throw new Error("Empty response from AI");

    let cleanText = response.text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7, cleanText.length - 3).trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3, cleanText.length - 3).trim();
    }

    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse AI response:", cleanText);
      throw new Error("Invalid response format from AI");
    }
  });
};

export const askAboutDocuments = async (query: string, documentsContext: any[]) => {
  return retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Context: ${JSON.stringify(documentsContext)}\n\nQuestion: ${query}`,
      config: {
        systemInstruction: "You are PaperLedger AI. Answer questions about the user's financial documents based on the provided context. Be concise and professional.",
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  });
};
