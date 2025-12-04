import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const API_KEY = process.env.API_KEY || '';

export const generateInventoryReport = async (products: Product[]): Promise<string> => {
  if (!API_KEY) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Prepare a lightweight JSON representation for the prompt
    const inventorySummary = products.map(p => ({
      name: p.name,
      qty: p.quantity,
      cat: p.category,
      expiry: p.expiryDate,
      val: p.price * p.quantity
    }));

    const prompt = `
      Act as an expert Shop Manager and Inventory Analyst. 
      Analyze the following inventory data and provide a concise, actionable report.
      
      Inventory Data:
      ${JSON.stringify(inventorySummary)}

      Please structure your response with the following sections:
      1. **Executive Summary**: Overall health of the stock.
      2. **Critical Alerts**: Identify expired items and items expiring within the next 30 days. Be specific.
      3. **Restock Recommendations**: Identify low stock items (quantity < 10) or gaps in categories.
      4. **Value Optimization**: Suggestions on clearance for expiring goods or high-value risks.

      Keep the tone professional yet urgent where necessary. Format with Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate report at this time.";
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return "An error occurred while communicating with the AI service.";
  }
};