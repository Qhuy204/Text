import { Platform } from 'react-native';

// Mock text extraction function
// In a real app, you would use a real OCR library or API
export const extractTextFromImage = async (imageUri: string): Promise<string> => {
  // This is a mock function that simulates text extraction
  // In a real app, you would use a real OCR library or API like Google Cloud Vision
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demo purposes, return some mock text based on the image URI
  // In a real app, you would send the image to an OCR service
  const mockTexts = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.",
    "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
    "This is extracted text from your image. In a real application, this would be the actual text detected in the image using OCR technology.",
    "Important meeting notes:\n- Project deadline: June 15\n- Budget review next week\n- New team member starting Monday",
    "Receipt\nCoffee Shop\n123 Main St\nTotal: $12.50\nDate: 05/20/2023\nThank you for your business!",
  ];
  
  // Use a hash of the URI to consistently return the same text for the same image
  const hash = imageUri.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const index = Math.abs(hash) % mockTexts.length;
  return mockTexts[index];
};

// Function to check if we're running on web
export const isWeb = Platform.OS === 'web';