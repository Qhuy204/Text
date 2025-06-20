// utils/model-handler.ts

import * as FileSystem from "expo-file-system";

// ⚙️ Cấu hình kiểu dữ liệu
export interface ModelConfig {
  enhanceImage: boolean;
  postProcess: boolean;
  model: "CNN" | "SVM";
  
}

export interface OCRResult {
  text: string;
  confidence: number;
  class_index: number;
}

export interface APIResponse {
  success: boolean;
  result?: OCRResult;
  error?: string;
  current_model?: "CNN" | "SVM";
}

export interface LoadModelResult {
  success: boolean;
  current_model: "CNN" | "SVM" | null;
  error?: string;
}

// 🧠 Class client chính
class OCRAPIClient {
  private baseURL: string;

  constructor(baseURL: string = "http://192.168.1.29:5000") {
    this.baseURL = baseURL;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return data.status === "healthy";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  async getCurrentModel(): Promise<"CNN" | "SVM" | null> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return data.current_model || null;
    } catch (error) {
      console.error("Lỗi khi lấy current_model:", error);
      return null;
    }
  }

  async loadModel(model: "CNN" | "SVM"): Promise<LoadModelResult> {
    try {
      const response = await fetch(`${this.baseURL}/load-model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model }),
      });

      const data = await response.json();
      return {
        success: data.success,
        current_model: data.current_model || null,
      };
    } catch (error) {
      console.error("Failed to load model:", error);
      return {
        success: false,
        current_model: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async extractTextFromBase64(imageBase64: string, config: ModelConfig): Promise<OCRResult> {
    try {
      if (!imageBase64) throw new Error("Base64 image is empty");

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const response = await fetch(`${this.baseURL}/extract-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: cleanBase64,
          config,
        }),
      });

      const data: APIResponse = await response.json();
      if (!data.success) throw new Error(data.error || "Unknown error occurred");

      return data.result!;
    } catch (error) {
      console.error("Failed to extract text:", error);
      throw error;
    }
  }

  async extractTextFromFile(fileUri: string, config: ModelConfig): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: fileUri,
        type: "image/jpeg",
        name: "image.jpg",
      } as any);
      formData.append("enhanceImage", config.enhanceImage.toString());
      formData.append("postProcess", config.postProcess.toString());

      const response = await fetch(`${this.baseURL}/extract-text-file`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data: APIResponse = await response.json();
      if (!data.success) throw new Error(data.error || "Unknown error occurred");

      return data.result!;
    } catch (error) {
      console.error("Failed to extract text from file:", error);
      throw error;
    }
  }

  private async convertFileToBase64(fileUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      throw new Error(`Failed to convert file to base64: ${error}`);
    }
  }

  async extractTextFromImageURI(imageUri: string, config: ModelConfig, source: "camera" | "drawing" = "camera"): Promise<string> {
    try {
      const base64Image = await this.convertFileToBase64(imageUri);
      console.log("[Client] Gửi ảnh base64 với source =", source);


      const configWithSource = {
        ...config,
        source, 
      };
      const result = await this.extractTextFromBase64(base64Image, configWithSource);

      const outputPath = `${FileSystem.documentDirectory}resized/resized_${Date.now()}.jpg`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}resized`, {
        intermediates: true,
      });
      await FileSystem.writeAsStringAsync(outputPath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return result.text;
    } catch (error) {
      console.error("Failed to extract text from image URI:", error);
      throw error;
    }
  }
}

// 👉 Khởi tạo client
export const ocrClient = new OCRAPIClient();

// 🌐 Hàm dùng ngoài
export const loadModel = async (model: "CNN" | "SVM"): Promise<LoadModelResult> => {
  return await ocrClient.loadModel(model);
};

export const extractTextFromImageWithModel = async (
  imageUri: string,
  config: ModelConfig,
  source: "camera" | "drawing" = "camera"
): Promise<string> => {
  return ocrClient.extractTextFromImageURI(imageUri, config, source);
};

export const isModelLoaded = async (): Promise<boolean> => {
  return await ocrClient.healthCheck();
};

// export const getCurrentModel = async (): Promise<"CNN" | "SVM" | null> => {
//   return await ocrClient.getCurrentModel();
// };

export const reloadModel = async (model: "CNN" | "SVM"): Promise<boolean> => {
  const result = await loadModel(model);
  return result.success;
};

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Giải phóng tài nguyên của model (hiện tại chỉ có tác dụng trên server)
 * 
 * @returns void
/*******  c2896b74-a6d0-4764-b0f7-f9b554ef2fd9  *******/export const disposeModel = (): void => {
  console.log("Model disposal handled by server");
};

export async function getCurrentModel(): Promise<"CNN" | "SVM" | null> {
  try {
    const res = await fetch("http://192.168.1.29:5000/health");
    const data = await res.json();
    return data.current_model || null;
  } catch {
    return null;
  }
}
