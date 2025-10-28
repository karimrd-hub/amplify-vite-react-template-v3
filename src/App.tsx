// src/App.tsx
import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { compressImage, cropUpperThird, dataUrlToBase64, calculatePayloadSize } from "./services/imageService";
import { uploadImages } from "./services/apiService";

const client = generateClient<Schema>();
console.log("Amplify client initialized:", client);

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    const input = document.getElementById('camera-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const sendToAPI = async () => {
    if (!capturedImage) {
      console.error("No image captured to send.");
      return;
    }

    setIsUploading(true);

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
        return;
      }

      console.log("Sending to API...");

      const result = await uploadImages({
        image_base64_cropped: croppedBase64,
        image_base64: originalBase64,
      });

      console.log("Success!", result);
      alert("Images uploaded successfully!");
    } catch (error) {
      console.error("Error during API call:", error);
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
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;