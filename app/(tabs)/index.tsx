"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { ImagePickerButton } from "../../components/ImagePickerButton"
import { Button } from "../../components/Button"
import { colors } from "@/constants/colors"
import { useScanStore } from "../../store/scan-store"
import { Copy, Scan, FileText } from "lucide-react-native"
import * as Clipboard from "expo-clipboard"
import { EmptyState } from "../../components/EmptyState"
import { ScanTabs } from "../../components/ScanTabs"
import { DrawingCanvas } from "../../components/DrawingCanvas"
import {
  extractTextFromImageWithModel,
  loadModel,
  isModelLoaded,
} from "@/utils/model-handler"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as FileSystem from "expo-file-system"
import 'expo-router/entry';
import { AppState } from "react-native"
import { getCurrentModel } from "@/utils/model-handler"

const SETTINGS_STORAGE_KEY = "text_extraction_model_settings"

export default function ScanScreen() {
  const [cameraImageUri, setCameraImageUri] = useState<string | null>(null)
  const [drawingImageUri, setDrawingImageUri] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const { addScan } = useScanStore()
  const [activeTab, setActiveTab] = useState<"camera" | "drawing">("camera")
  const [selectedModel, setSelectedModel] = useState<"CNN" | "SVM">("CNN")
  const [modelReady, setModelReady] = useState(false)

  const checkModelStatus = async () => {
    const ready = await isModelLoaded();
    setModelReady(ready);

    const current = await getCurrentModel();
    if (current) setSelectedModel(current);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await loadModelSettings()
        await checkModelStatus()
      }
    })
    return () => subscription.remove()
  }, [])



  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadModelSettings()  // mỗi khi quay lại app, tự động cập nhật model đã chọn
        checkModelStatus()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])



  useEffect(() => {
    checkModelStatus()
  }, [])

  // const checkModelStatus = async () => {
  //   const ready = await isModelLoaded()
  //   setModelReady(ready)
  // }



  type ModelConfig = {
    enhanceImage: boolean;
    postProcess: boolean;
    model: "CNN" | "SVM";
  };

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    enhanceImage: true,
    postProcess: true,
    model: "CNN",
  });


  useEffect(() => {
    loadModelSettings()
    initializeModel()
  }, [])

  const initializeModel = async () => {
    if (!(await isModelLoaded())) {
      setIsModelLoading(true)
      try {
        const success = await loadModel(selectedModel)
        if (!success) {
          Alert.alert("Lỗi tải model", "Không thể tải model CNN. Vui lòng kiểm tra đường dẫn và thử lại.")
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo model:", error)
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải model. Vui lòng thử lại sau.")
      } finally {
        setIsModelLoading(false)
      }
    }
  }

  const loadModelSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      if (settingsJson) {
        const settings = JSON.parse(settingsJson)
        const newModel = settings.selectedModel || "CNN"
        setModelConfig({
          enhanceImage: settings.enhanceImage,
          postProcess: settings.postProcess,
          model: newModel,
        })
        setSelectedModel(newModel)
      }
    } catch (error) {
      console.error("Lỗi khi tải cài đặt model:", error)
    }
  }


  const getCurrentImageUri = () => {
    return activeTab === "camera" ? cameraImageUri : drawingImageUri
  }

  const handleImageSelected = async (uri: string) => {
    const info = await FileSystem.getInfoAsync(uri)
    if (!info.exists) {
      Alert.alert("Không thể đọc ảnh", "Đường dẫn ảnh không hợp lệ.")
      return
    }
    setCameraImageUri(uri)
    setExtractedText(null)
  }

  const extractText = async (source: "camera" | "drawing" = "camera") => {
    const imageUri = getCurrentImageUri()
    if (!imageUri) return

    if (!(await isModelLoaded())) {
      Alert.alert("Model chưa sẵn sàng", "Model CNN chưa được tải. Vui lòng đợi hoặc tải lại model trong phần Cài đặt.")
      return
    }

    setIsExtracting(true)
    try {
      const text = await extractTextFromImageWithModel(imageUri, modelConfig, source)
      setExtractedText(text)
      addScan({
        id: Date.now().toString(),
        imageUri,
        extractedText: text,
        createdAt: Date.now(),
      })
    } catch (error) {
      console.error("Lỗi khi nhận diện ký tự:", error)
      Alert.alert("Lỗi nhận diện", "Không thể nhận diện ký tự từ hình ảnh. Vui lòng thử lại.")
    } finally {
      setIsExtracting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!extractedText) return
    await Clipboard.setStringAsync(extractedText)
    Alert.alert("Thành công", "Đã sao chép ký tự vào clipboard!")
  }

  const resetScan = () => {
    if (activeTab === "camera") {
      setCameraImageUri(null)
    } else {
      setDrawingImageUri(null)
    }
    setExtractedText(null)
  }

  const handleDrawingCapture = async (uri: string) => {
    setDrawingImageUri(uri)
    setIsExtracting(true)
    try {
      const text = await extractTextFromImageWithModel(uri, modelConfig, "drawing")
      setExtractedText(text)
      addScan({
        id: Date.now().toString(),
        imageUri: uri,
        extractedText: text,
        createdAt: Date.now(),
      })
    } catch (error) {
      console.error("Lỗi khi nhận diện từ canvas:", error)
      Alert.alert("Lỗi", "Không thể nhận diện ký tự từ canvas.")
    } finally {
      setIsExtracting(false)
    }
  }


  const handleTabChange = (tab: "camera" | "drawing") => {
    setActiveTab(tab)

    // Reset dữ liệu của tab còn lại
    if (tab === "camera") {
      setDrawingImageUri(null)
    } else {
      setCameraImageUri(null)
    }

    setExtractedText(null)
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={Platform.OS === "ios" ? "dark" : "auto"} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Nhận diện ký tự từ hình ảnh</Text>
          <Text style={styles.subtitle}>
            {isModelLoading
              ? `Đang tải model ${selectedModel}...`
              : (modelReady ? `Model ${selectedModel} đã sẵn sàng` : `Model ${selectedModel} chưa được tải`)}
          </Text>



        </View>

        {isModelLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải model CNN...</Text>
            <Text style={styles.loadingSubText}>Vui lòng đợi trong giây lát</Text>
          </View>
        ) : (
          <>
            <ScanTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === "camera" ? (
              !cameraImageUri ? (
                <View style={styles.pickerContainer}>
                  <ImagePickerButton onImageSelected={handleImageSelected} />
                </View>
              ) : (
                <View style={styles.scanContainer}>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: cameraImageUri }} style={styles.image} />
                  </View>

                  {!extractedText && !isExtracting && (
                    <Button
                      title="Nhận diện ký tự"
                      onPress={() => extractText("camera")}
                      style={styles.extractButton}
                      icon={<Scan size={20} color="white" />}
                      disabled={!isModelLoaded()}
                    />
                  )}
                </View>
              )
            ) : (
              <View style={styles.drawingContainer}>
                <DrawingCanvas onCapture={handleDrawingCapture} />
              </View>
            )}

            {isExtracting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang nhận diện ký tự với model {selectedModel}...</Text>
                <Text style={styles.loadingSubText}>
                  {modelConfig.enhanceImage ? "Đang tăng cường hình ảnh..." : ""}
                </Text>
              </View>
            )}

            {extractedText && (
              <View style={styles.resultContainer}>
                <View style={styles.textHeaderContainer}>
                  <FileText size={20} color={colors.primary} />
                  <Text style={styles.textHeader}>Ký tự đã nhận diện</Text>
                </View>
                <Text style={styles.extractedText}>{extractedText}</Text>

                <View style={styles.actionButtons}>
                  <Button
                    title="Sao chép ký tự"
                    onPress={copyToClipboard}
                    variant="primary"
                    style={styles.actionButton}
                    textStyle={styles.actionButtonText}
                    icon={<Copy size={16} color="white" />}
                  />
                  <Button
                    title="Quét mới"
                    onPress={resetScan}
                    variant="outline"
                    style={styles.actionButton}
                    textStyle={styles.actionButtonText}
                  />
                </View>
              </View>
            )}

            {!getCurrentImageUri() && activeTab === "camera" && !isModelLoading && (
              <View style={styles.infoContainer}>
                <EmptyState
                  title="Chưa chọn hình ảnh"
                  description="Chọn hình ảnh từ thư viện hoặc chụp ảnh mới để nhận diện ký tự."
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scanContainer: {
    width: "100%",
  },
  drawingContainer: {
    width: "100%",
    marginBottom: 20,
  },
  imageContainer: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  extractButton: {
    alignSelf: "center",
    marginVertical: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textLight,
    fontStyle: "italic",
  },
  resultContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  textHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  textHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
  },
  extractedText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    flexShrink: 1,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
})
