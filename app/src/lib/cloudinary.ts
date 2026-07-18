export const uploadToCloudinary = async (file: File): Promise<string> => {
  // We can use unsigned uploads if configured in Cloudinary,
  // or fetch a signature from the backend for signed uploads.
  // Using an unsigned preset is simpler on the client, but here we will fetch a signature to be secure,
  // or use the Cloudinary URL.
  
  // Example using unsigned upload (requires a preset in Cloudinary):
  // For the sake of this implementation, we will use standard Cloudinary POST.
  
  // Since we don't have an upload preset specified, let's fetch a signature from our server:
  const sigRes = await fetch("/api/upload-signature");
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  
  const { signature, timestamp, cloudName, apiKey } = await sigRes.json();
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  
  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!uploadRes.ok) {
    const error = await uploadRes.json();
    throw new Error(error.error?.message || "Failed to upload to Cloudinary");
  }
  
  const data = await uploadRes.json();
  return data.secure_url;
};
