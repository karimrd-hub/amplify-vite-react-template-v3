import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();
console.log("Amplify client initialized:", client);

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    // You can initialize any setup logic here later if needed
  }, []);

  const openCamera = () => {
    // Trigger the file input click
    document.getElementById('camera-input')?.click();
  };

  const compressImage = (imageData: string, maxWidth: number = 1920, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Canvas context not available');
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = imageData;
    });
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalImage = event.target?.result as string;
        
        // Compress the image before storing
        try {
          const compressedImage = await compressImage(originalImage);
          setCapturedImage(compressedImage);
          console.log("Photo captured and compressed!");
          console.log("Original size:", originalImage.length, "Compressed size:", compressedImage.length);
        } catch (error) {
          console.error("Error compressing image:", error);
          setCapturedImage(originalImage); // Fallback to original
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    // Reset the input so the same file can be selected again
    const input = document.getElementById('camera-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const cropUpperThird = (imageData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Canvas context not available');
          return;
        }

        // Set canvas size to upper third of image
        const cropHeight = Math.floor(img.height / 3);
        canvas.width = img.width;
        canvas.height = cropHeight;

        // Draw the upper third
        ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);

        // Convert to base64 with quality compression
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = reject;
      img.src = imageData;
    });
  };

  const sendToAPI = async () => {
    if (!capturedImage) {
      console.error("No image captured to send.");
      return;
    }

    try {
      console.log("Processing images...");
      
      // Get original base64 (remove data:image/jpeg;base64, prefix)
      const originalBase64 = capturedImage.split(',')[1];
      console.log("Original base64 length:", originalBase64.length);
      
      // Create cropped version
      const croppedBase64 = await cropUpperThird(capturedImage);
      console.log("Cropped base64 length:", croppedBase64.length);

      // Calculate approximate payload size (in MB)
      const payloadSizeMB = ((originalBase64.length + croppedBase64.length) * 0.75) / (1024 * 1024);
      console.log("Approximate payload size:", payloadSizeMB.toFixed(2), "MB");

      if (payloadSizeMB > 5) {
        alert("Image is too large. Please try taking a photo with lower resolution.");
        return;
      }

      console.log("Sending to API...");
      
      const response = await fetch('https://eby9ngcjr6.execute-api.eu-west-1.amazonaws.com/dev/save-user-input-to-s3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64_cropped: croppedBase64,
          image_base64: originalBase64
        })
      });

      console.log("API response status:", response.status);
      if (response.ok) {
        const result = await response.json();
        console.log("Success!", result);
        alert("Images uploaded successfully!");
      } else {
        const errorText = await response.text();
        console.error("API error:", response.status, errorText);
        alert(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Error during API call:", error);
      alert("Error uploading images. Please check your connection.");
    }
  };

  return (
    <main style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Welcome to Idara!</h1>
      
      {/* Hidden file input that opens native camera */}
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
            <button onClick={retakePhoto} style={{ padding: "10px 20px", fontSize: "16px", marginRight: "10px" }}>
              Retake
            </button>
            <button onClick={sendToAPI} style={{ padding: "10px 20px", fontSize: "16px", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}>
              Upload
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;