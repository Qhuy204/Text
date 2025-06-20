import * as FileSystem from "expo-file-system";
import * as tf from "@tensorflow/tfjs";
import { bundleResourceIO, decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { Asset } from "expo-asset"; // Thêm import này

// Đường dẫn đến model
const MODEL_DIR = FileSystem.documentDirectory + "models/";
const MODEL_PATH = MODEL_DIR + "CNN.tflite";
const LABELS_PATH = MODEL_DIR + "labels.json";

// Cấu hình model
export interface ModelConfig {
  enhanceImage: boolean
  postProcess: boolean
}

// Trạng thái model
interface ModelStatus {
  loaded: boolean
  model: tf.LayersModel | null
  labels: string[] | null
}

// Trạng thái hiện tại của model
const modelStatus: ModelStatus = {
  loaded: false,
  model: null,
  labels: null,
}

/**
 * Sao chép model từ assets vào thư mục tài liệu nếu chưa tồn tại
 */
const copyModelToDocumentDirectory = async (): Promise<void> => {
  try {
    console.log("Bắt đầu copyModelToDocumentDirectory");

    const modelDirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory + "models");
    if (!modelDirInfo.exists) {
      console.log("Thư mục models chưa tồn tại, tạo mới...");
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "models");
    }

    console.log("Tải asset model...");
    const modelModule = require("../assets/models/CNN.tflite");
    const modelAssetPath = require("../assets/models/CNN.tflite");
    console.log("Model module:", require("../assets/models/CNN.tflite"))

    console.log("Đường dẫn require:", modelAssetPath);




    const modelAsset = Asset.fromModule(modelModule);
    await modelAsset.downloadAsync();

    const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!modelInfo.exists) {
      console.log("Sao chép model...");
      await FileSystem.copyAsync({
        from: modelAsset.localUri || modelAsset.uri,
        to: MODEL_PATH,
      });
      console.log("Model đã được sao chép");
    }

    console.log("Tải asset labels...");
    const labelsModule = require("../assets/models/labels.json");
    const labelsAsset = Asset.fromModule(labelsModule);
    await labelsAsset.downloadAsync();

    const labelsInfo = await FileSystem.getInfoAsync(LABELS_PATH);
    if (!labelsInfo.exists) {
      console.log("Sao chép labels...");
      await FileSystem.copyAsync({
        from: labelsAsset.localUri || labelsAsset.uri,
        to: LABELS_PATH,
      });
      console.log("Labels đã được sao chép");
    }
  } catch (error) {
    console.error("Lỗi khi sao chép model hoặc labels:", error);
    throw new Error("Không thể sao chép model từ assets");
  }
};


/**
 * Tải model TensorFlow.js từ file TFLite
 */
export const loadModel = async (): Promise<boolean> => {
  try {
    if (modelStatus.loaded && modelStatus.model) {
      return true;
    }

    await tf.ready();
    await copyModelToDocumentDirectory();

    // 1) Đọc JSON
    const modelJSONText = await FileSystem.readAsStringAsync(
      MODEL_PATH.replace(".tflite", ".json")
    );
    const modelJSON = JSON.parse(modelJSONText);

    // 2) Đọc weights qua fetch + arrayBuffer()
    const resp = await fetch(MODEL_PATH);
    const modelWeightsBuffer = await resp.arrayBuffer();      // ArrayBuffer
    const weightBytes = new Uint8Array(modelWeightsBuffer);   // Uint8Array
    const weightData = Array.from(weightBytes);               // number[]

    // 3) Tải lên TF.js
    const model = await tf.loadLayersModel(
      bundleResourceIO(modelJSON, weightData)
    );

    modelStatus.model = model;
    modelStatus.loaded = true;

    // (nạp labels tương tự như trước)
    const labelsJSON = await FileSystem.readAsStringAsync(LABELS_PATH);
    modelStatus.labels = JSON.parse(labelsJSON);

    return true;
  } catch (error) {
    console.error("Lỗi khi tải model:", error);
    return false;
  }
};

/**
 * Tiền xử lý hình ảnh để phù hợp với đầu vào của model
 */
export const preprocessImage = async (
  imageUri: string,
  enhanceImage: boolean
): Promise<tf.Tensor3D> => {
  try {
    // 1) Load ảnh base64 → tensor
    const imgB64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const imgBuf = tf.util.encodeString(imgB64, "base64").buffer;
    let imgTensor = decodeJpeg(new Uint8Array(imgBuf)) as tf.Tensor3D;

    // 2) Resize về 28×28
    imgTensor = tf.image.resizeBilinear(imgTensor, [28, 28]) as tf.Tensor3D;

    // 3) Nếu cần enhance → tự adjust contrast & brightness
    if (enhanceImage) {
      imgTensor = tf.tidy(() => {
        let t = imgTensor;
        const mean = t.mean();                       // mean của toàn tensor
        t = t.sub(mean).mul(1.2).add(mean);          // contrast ×1.2
        t = t.add(tf.scalar(0.1));                   // brightness +0.1
        return t as tf.Tensor3D;
      });
    }

    // 4) Chuyển sang grayscale [28,28,1]
    const gray = tf.tidy(() => {
      return imgTensor
        .mean(2, true)           // collapse 3 kênh về 1 kênh
        .reshape([28, 28, 1]) as tf.Tensor3D;
    });

    // 5) Normalize [0,1]
    const normalized = tf.tidy(() => {
      return gray.div(tf.scalar(255)) as tf.Tensor3D;
    });

    // Giải phóng tensor trung gian
    tf.dispose([imgTensor, gray]);

    return normalized;
  } catch (error) {
    console.error("Lỗi preprocessImage:", error);
    throw error;
  }
};
/**
 * Dự đoán sử dụng model CNN
 */
export const predictWithCNN = async (imageUri: string, config: ModelConfig): Promise<string> => {
  try {
    console.log(`Dự đoán với CNN: ${imageUri}`)

    // Đảm bảo model đã được tải
    if (!modelStatus.loaded || !modelStatus.model) {
      const loaded = await loadModel()
      if (!loaded) {
        throw new Error("Không thể tải model CNN")
      }
    }

    // Tiền xử lý hình ảnh
    const preprocessedImage = await preprocessImage(imageUri, config.enhanceImage)

    // Mở rộng kích thước batch (thêm chiều batch)
    const batchedImage = preprocessedImage.expandDims(0)

    // Thực hiện dự đoán
    console.log("Thực hiện dự đoán với CNN...")
    const predictions = (await modelStatus.model!.predict(batchedImage)) as tf.Tensor

    // Lấy chỉ số của lớp có xác suất cao nhất
    const predictionArray = await predictions.data()
    const maxIndex = predictionArray.indexOf(Math.max(...Array.from(predictionArray)))

    // Lấy nhãn tương ứng
    const predictedLabel = modelStatus.labels![maxIndex]

    // Giải phóng bộ nhớ
    tf.dispose([preprocessedImage, batchedImage, predictions])

    console.log(`Kết quả dự đoán CNN: ${predictedLabel}`)

    // Hậu xử lý kết quả nếu cần
    const processedResult = config.postProcess ? postprocessResult(predictedLabel, true) : predictedLabel

    return processedResult
  } catch (error) {
    console.error("Lỗi khi dự đoán với CNN:", error)
    throw error
  }
}

/**
 * Hậu xử lý kết quả
 */
export const postprocessResult = (result: string, shouldPostProcess: boolean): string => {
  if (!shouldPostProcess) return result

  console.log(`Hậu xử lý kết quả: ${result}`)

  // Các quy tắc hậu xử lý
  const corrections: Record<string, string> = {
    "0": "O", // Số 0 thường bị nhầm với chữ O
    "1": "I", // Số 1 thường bị nhầm với chữ I
    "5": "S", // Số 5 thường bị nhầm với chữ S
    "8": "B", // Số 8 thường bị nhầm với chữ B
    // Thêm các quy tắc khác nếu cần
  }

  // Áp dụng các quy tắc sửa lỗi
  let processedResult = result
  if (corrections[processedResult]) {
    processedResult = corrections[processedResult]
    console.log(`Đã sửa lỗi: ${result} -> ${processedResult}`)
  }

  return processedResult
}

/**
 * Hàm chính để trích xuất văn bản từ hình ảnh
 */
export const extractTextFromImageWithModel = async (imageUri: string, config: ModelConfig): Promise<string> => {
  console.log(`Trích xuất văn bản với cấu hình:`, config)

  try {
    // Tải model nếu cần
    if (!modelStatus.loaded) {
      const loaded = await loadModel()
      if (!loaded) {
        throw new Error("Không thể tải model")
      }
    }

    // Dự đoán với CNN
    const result = await predictWithCNN(imageUri, config)
    return result
  } catch (error) {
    console.error("Lỗi khi trích xuất văn bản:", error)
    throw error
  }
}

/**
 * Giải phóng bộ nhớ và tài nguyên của model
 */
export const disposeModel = (): void => {
  if (modelStatus.model) {
    modelStatus.model.dispose()
    modelStatus.model = null
    modelStatus.loaded = false
    console.log("Đã giải phóng tài nguyên của model")
  }
}

/**
 * Kiểm tra xem model đã được tải chưa
 */
export const isModelLoaded = (): boolean => {
  return modelStatus.loaded && modelStatus.model !== null
}

/**
 * Tải lại model (giải phóng và tải lại)
 */
export const reloadModel = async (): Promise<boolean> => {
  disposeModel()
  return await loadModel()
}
