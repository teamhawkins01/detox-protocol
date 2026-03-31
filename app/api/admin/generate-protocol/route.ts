import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { category, password } = await req.json();

    // Simple server-side validation
    if (password !== '1PiperdoG!') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = `Generate a highly optimized, technical detox protocol for the category: "${category}". 
    The protocol must be effective, precise, and follow the DETOX.PROTOCOLS brand voice: industrial, high-performance, and results-oriented.
    
    Include:
    1. A bold, technical title.
    2. A list of specific ingredients with precise measurements.
    3. Step-by-step instructions that sound like a technical protocol.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING,
              description: "Technical title of the detox protocol"
            },
            ingredients: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of ingredients with measurements"
            },
            instructions: { 
              type: Type.STRING,
              description: "Step-by-step technical instructions"
            }
          },
          required: ["title", "ingredients", "instructions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI failed to generate content");
    }

    const protocolData = JSON.parse(response.text);

    const newProtocol = {
      ...protocolData,
      category,
      authorId: "ADMIN_SYSTEM",
      authorType: "Admin",
      authorName: "MEDICINE MAN",
      isAiGenerated: true,
      starRating: 5,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, "protocols"), newProtocol);

    return NextResponse.json({ 
      id: docRef.id, 
      title: newProtocol.title 
    });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred during generation' 
    }, { status: 500 });
  }
}
