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

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        console.log("Photo captured!");
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

  return (
    <main style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Welcome to Idara!</h1>
      
      {/* Hidden file input that opens native camera */}
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="user"  // "user" for front camera, "environment" for back camera
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
            <button onClick={retakePhoto} style={{ padding: "10px 20px", fontSize: "16px" }}>
              Retake
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;