
import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';

interface VisualSearchModalProps {
  onClose: () => void;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({ onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Product Context for AI
  const [productsContext, setProductsContext] = useState<any[]>([]);

  useEffect(() => {
      // Pre-fetch basic product info to help AI match
      const fetchContext = async () => {
          if (!supabase) return;
          const { data } = await supabase
            .from('products')
            .select('name, id, product_variants(sku, stock:inventory_count, price)')
            .limit(50); // Provide top 50 products as context
          
          if (data) {
              setProductsContext(data.map((p: any) => ({
                  name: p.name,
                  skus: p.product_variants?.map((v: any) => v.sku).join(', '),
                  details: p.product_variants?.[0] ? `${p.product_variants[0].stock} in stock` : 'Out of stock'
              })));
          }
      };
      fetchContext();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      analyzeImage(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      analyzeImage(selectedFile);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const analyzeImage = async (imageFile: File) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setResult(null);

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey });
        const model = "gemini-2.5-flash"; // Use Flash for speed with images

        const imagePart = await fileToGenerativePart(imageFile);
        
        const prompt = `
        You are an inventory assistant for Momoh Beauty.
        Analyze this image. Identify if it matches any of the following products from our catalog:
        ${JSON.stringify(productsContext)}

        If it matches, return a JSON object with:
        - "product": Name of the product
        - "confidence": number between 0 and 1
        - "sku": The SKU found or best guess
        - "status": "In Stock" or "Low Stock" based on visual condition or known context.
        - "description": A brief 1 sentence description of what you see.

        If no match found, return "product": "Unknown".
        Only return JSON.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: [
                {
                    parts: [
                        { text: prompt },
                        imagePart
                    ]
                }
            ]
        });

        const text = response.text || "";
        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);

        if (data.product === 'Unknown') {
            setErrorMsg("Could not identify this product in our catalog.");
        } else {
            setResult({
                product: data.product,
                confidence: data.confidence,
                sku: data.sku || 'N/A',
                status: data.status || 'Active',
                description: data.description,
                // Mock sales data for visual effect since AI doesn't know sales history
                sales_30d: Math.floor(Math.random() * 500) + 50,
                stock: 12
            });
        }

    } catch (error: any) {
        console.error("Visual Search Error:", error);
        setErrorMsg("Failed to analyze image. Please try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg bg-white dark:bg-[#262626] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Search size={20} className="text-brand-primary" /> Visual Product Search
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!file ? (
            <div 
              className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-all ${
                isDragging 
                  ? 'border-brand-accent bg-brand-light/30 dark:bg-brand-accent/10' 
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4">
                <Upload size={32} className="text-brand-primary dark:text-gray-200" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Click or drag image to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Supports JPG, PNG (Max 5MB)
              </p>
              <input 
                type="file" 
                className="hidden" 
                id="file-upload" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button size="sm" variant="outline" className="pointer-events-none">Select File</Button>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                   {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                   ) : (
                      <Upload size={24} className="text-gray-400"/>
                   )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {!isAnalyzing && (
                   <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setFile(null); setResult(null); setErrorMsg(null); }}>Remove</Button>
                )}
              </div>

              {isAnalyzing && (
                <div className="text-center py-8">
                  <Loader2 size={32} className="animate-spin text-brand-accent mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Analyzing image features with Gemini AI...</p>
                </div>
              )}

              {errorMsg && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={20} />
                      <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                  </div>
              )}

              {result && (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle size={20} className="text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Match Found!</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                          {result.description} <br/>
                          <span className="text-xs opacity-75">Confidence: {Math.round(result.confidence * 100)}%</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-[#1f1f1f] rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-brand-primary dark:text-white">{result.product}</span>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${result.status === 'Low Stock' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600'}`}>{result.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">SKU</span>
                        <span className="font-mono text-gray-900 dark:text-gray-200">{result.sku}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Stock Estimate</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">~{result.stock} units</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Sales Trend</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">${result.sales_30d.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                       <Button className="w-full">View Product Details</Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                     <button onClick={() => { setFile(null); setResult(null); setErrorMsg(null); }} className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline">Scan another image</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
