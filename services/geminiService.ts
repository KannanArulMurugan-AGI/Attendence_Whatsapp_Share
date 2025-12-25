
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AttendanceRecord, LearningRule, ParseResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    records: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "Date of attendance (YYYY-MM-DD)" },
          labourName: { type: Type.STRING, description: "Full name of the labour" },
          siteName: { type: Type.STRING, description: "Name of the construction/work site" },
          baseSalary: { type: Type.NUMBER, description: "Daily base salary amount for a full day" },
          day: { type: Type.NUMBER, description: "Attendance units: 1.0 for full day, 0.5 for half day (4 hours)" },
          otHours: { type: Type.NUMBER, description: "Number of Overtime hours worked beyond the day's base" }
        },
        required: ["date", "labourName", "siteName", "baseSalary", "day", "otHours"]
      }
    },
    uncertainties: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Any questions or ambiguities found in the data that need human clarification"
    }
  },
  required: ["records", "uncertainties"]
};

export async function parseAttendanceData(
  text: string, 
  images: string[], 
  learningRules: LearningRule[]
): Promise<ParseResult> {
  const model = "gemini-3-flash-preview";
  
  const rulesSummary = learningRules
    .map(r => `Rule: ${r.pattern} -> Interpretation: ${r.explanation}`)
    .join("\n");

  const systemPrompt = `
    You are an expert data analyst for a construction company. 
    Your task is to extract labour attendance from WhatsApp messages (text or screenshots).
    
    Fields to extract:
    - Date
    - Labour Name
    - Site Name
    - Base Salary (Daily rate)
    - Day (1 for full day, 0.5 for half day/4 hours)
    - OT Hours
    
    SPECIAL LOGIC:
    - If a message says "half day", set day to 0.5.
    - If a message says "full day" or just lists the person, set day to 1.0.
    - 8 hours is considered 1 full day.
    
    CRITICAL CALCULATION RULE: 
    For every record, the application will calculate:
    OT Amount = (Base Salary / 8) * OT Hours.
    Total = (Base Salary * Day) + OT Amount.
    
    LEARNED RULES FROM PREVIOUS HUMAN FEEDBACK:
    ${rulesSummary || "No previous rules. Use your best judgement."}
    
    If data is missing or ambiguous, add a specific question to the 'uncertainties' array.
    If you see repeated messages, parse them anyway; the application logic will handle deduplication.
    Return the data in the specified JSON format.
  `;

  const contents: any[] = [{ text: `Process the following content:\n\nTEXT:\n${text}` }];
  
  images.forEach((imgBase64) => {
    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: imgBase64.split(",")[1] || imgBase64
      }
    });
  });

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contents },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as ParseResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return { records: [], uncertainties: ["Failed to parse the provided information. Please check the format."] };
  }
}
