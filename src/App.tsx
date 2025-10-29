// src/App.tsx
import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { compressImage, cropUpperThird, dataUrlToBase64, calculatePayloadSize } from "./services/imageService";
import { uploadImages, parseUploadResponse } from "./services/apiService";
import { startStepFunction, getExecutionResult } from "./services/stepFunctionService";

const client = generateClient<Schema>();
console.log("Amplify client initialized:", client);

// Allowed document types for OCR processing
const ALLOWED_DOCUMENT_TYPES = [
  "ID card",
  "Passport",
  "Driving license",
  "Credit card",
  "Resident card"
];

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<any>(null);

  useEffect(() => {
    // Initialize setup logic if needed
  }, []);

  const openCamera = () => {
    document.getElementById('camera-input')?.click();
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalImage = event.target?.result as string;
      try {
        const compressedImage = await compressImage(originalImage);
        setCapturedImage(compressedImage);
        console.log("Photo captured and compressed!");
        console.log("Original size:", originalImage.length, "Compressed size:", compressedImage.length);
      } catch (error) {
        console.error("Error compressing image:", error);
        setCapturedImage(originalImage);
      }
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setProcessingStatus("");
    setOcrResult(null);
    const input = document.getElementById('camera-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const sendToAPI = async () => {
  if (!capturedImage) {
    console.error("No image captured to send.");
    return;
  }

  setIsUploading(true);
  setProcessingStatus("Uploading image...");
  setOcrResult(null);

  try {
    console.log("Processing images...");
    const originalBase64 = dataUrlToBase64(capturedImage);
    const croppedBase64 = await cropUpperThird(capturedImage);

    console.log("Original base64 length:", originalBase64.length);
    console.log("Cropped base64 length:", croppedBase64.length);

    const payloadSizeMB = calculatePayloadSize([originalBase64, croppedBase64]);
    console.log("Approximate payload size:", payloadSizeMB.toFixed(2), "MB");

    if (payloadSizeMB > 5) {
      alert("Image is too large. Please try taking a photo with lower resolution.");
      setProcessingStatus("");
      return;
    }

    console.log("Sending to API...");
    const result = await uploadImages({
      image_base64_cropped: croppedBase64,
      image_base64: originalBase64,
    });

    console.log("Success!", result);
    
    // Parse the response
    const parsedResponse = parseUploadResponse(result);
    console.log("Parsed response:", parsedResponse);

    if (!parsedResponse.success) {
      throw new Error("Upload was not successful");
    }

    const documentType = parsedResponse.data.document_type["Document Type"];
    const s3Key = parsedResponse.data.s3_key;
    const documentSide = parsedResponse.data.document_side["Side"];

    console.log("Document Type:", documentType);
    console.log("S3 Key:", s3Key);
    console.log("Document Side:", documentSide);

    // Check if document type is allowed for OCR processing
    if (ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      setProcessingStatus(`Document type: ${documentType}. Starting OCR processing...`);
      
      try {
        // Start Step Function (Express returns result immediately)
        const executionResponse = await startStepFunction(s3Key);
        console.log("Step Function response:", executionResponse);
        
        setProcessingStatus("OCR processing completed!");
        setOcrResult(executionResponse);
        alert("Images uploaded and processed successfully!");
        
      } catch (stepFunctionError) {
        console.error("Step Function error:", stepFunctionError);
        setProcessingStatus("OCR processing failed");
        alert("Image uploaded but OCR processing failed. Please try again.");
      }
    } else {
      setProcessingStatus(`Document type "${documentType}" does not require OCR processing.`);
      alert(`Image uploaded successfully! Document type: ${documentType}`);
    }

  } catch (error) {
    console.error("Error during API call:", error);
    setProcessingStatus("Upload failed");
    alert("Error uploading images. Please check your connection.");
  } finally {
    setIsUploading(false);
  }
};

  return (
    <main style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Welcome to Idara!</h1>
      
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleImageCapture}
        style={{ display: "none" }}
      />

      {!capturedImage && (
        <button onClick={openCamera} style={{ padding: "10px 20px", fontSize: "16px" }}>
          + new
        </button>
      )}

      {capturedImage && (
        <div>
          <h2>Captured Photo:</h2>
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: "100%", maxWidth: "500px", border: "2px solid #333" }}
          />
          
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={retakePhoto}
              style={{ padding: "10px 20px", fontSize: "16px", marginRight: "10px" }}
              disabled={isUploading}
            >
              Retake
            </button>
            <button
              onClick={sendToAPI}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: isUploading ? "#cccccc" : "#4CAF50",
                color: "white",
                border: "none",
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
              disabled={isUploading}
            >
              {isUploading ? "Processing..." : "Upload"}
            </button>
          </div>

          {processingStatus && (
            <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
              <strong>Status:</strong> {processingStatus}
            </div>
          )}

          {ocrResult && (
            <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "5px" }}>
              <h3>OCR Result:</h3>
              <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                {JSON.stringify(ocrResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default App;