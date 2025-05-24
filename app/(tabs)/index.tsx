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
import { extractTextFromImageWithModel, loadModel, isModelLoaded } from "@/utils/model-handler"
import AsyncStorage from "@react-native-async-storage/async-storage"
import 'expo-router/entry';

// Key lưu trữ cài đặt trong AsyncStorage
const SETTINGS_STORAGE_KEY = "text_extraction_model_settings"

export default function ScanScreen() {
  // Tách state cho mỗi tab để tránh mất dữ liệu khi chuyển tab
  const [cameraImageUri, setCameraImageUri] = useState<string | null>(null)
  const [drawingImageUri, setDrawingImageUri] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const { addScan } = useScanStore()
  const [activeTab, setActiveTab] = useState<"camera" | "drawing">("camera")

  // State cho cấu hình model
  const [modelConfig, setModelConfig] = useState({
    enhanceImage: true,
    postProcess: true,
  })

  // Tải model và cài đặt khi component mount
  useEffect(() => {
    loadModelSettings()
    initializeModel()
  }, [])

  // Khởi tạo model
  const initializeModel = async () => {
    if (!isModelLoaded()) {
      setIsModelLoading(true)
      try {
        const success = await loadModel()
        if (!success) {
          Alert.alert("Lỗi tải model", "Không thể tải model CNN. Vui lòng kiểm tra đường dẫn và thử lại.", [
            { text: "OK" },
          ])
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo model:", error)
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải model. Vui lòng thử lại sau.", [{ text: "OK" }])
      } finally {
        setIsModelLoading(false)
      }
    }
  }

  // Tải cài đặt model từ AsyncStorage
  const loadModelSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      if (settingsJson) {
        const settings = JSON.parse(settingsJson)
        setModelConfig({
          enhanceImage: settings.enhanceImage,
          postProcess: settings.postProcess,
        })
      }
    } catch (error) {
      console.error("Lỗi khi tải cài đặt model:", error)
    }
  }

  // Lấy imageUri hiện tại dựa vào tab đang active
  const getCurrentImageUri = () => {
    return activeTab === "camera" ? cameraImageUri : drawingImageUri
  }

  const handleImageSelected = (uri: string) => {
    setCameraImageUri(uri)
    setExtractedText(null)
  }

  const extractText = async () => {
    const imageUri = getCurrentImageUri()
    if (!imageUri) return

    // Kiểm tra xem model đã được tải chưa
    if (!isModelLoaded()) {
      Alert.alert(
        "Model chưa sẵn sàng",
        "Model CNN chưa được tải. Vui lòng đợi hoặc tải lại model trong phần Cài đặt.",
        [{ text: "OK" }],
      )
      return
    }

    setIsExtracting(true)
    try {
      // Sử dụng model để trích xuất văn bản
      const text = await extractTextFromImageWithModel(imageUri, modelConfig)
      setExtractedText(text)

      // Lưu vào lịch sử
      addScan({
        id: Date.now().toString(),
        imageUri,
        extractedText: text,
        createdAt: Date.now(),
      })
    } catch (error) {
      console.error("Lỗi khi trích xuất văn bản:", error)
      Alert.alert("Lỗi trích xuất", "Không thể trích xuất văn bản từ hình ảnh. Vui lòng thử lại.", [{ text: "OK" }])
    } finally {
      setIsExtracting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!extractedText) return

    await Clipboard.setStringAsync(extractedText)
    Alert.alert("Thành công", "Đã sao chép văn bản vào clipboard!")
  }

  const resetScan = () => {
    if (activeTab === "camera") {
      setCameraImageUri(null)
    } else {
      setDrawingImageUri(null)
    }
    setExtractedText(null)
  }

  const handleDrawingCapture = (uri: string) => {
    setDrawingImageUri(uri)

    // Kiểm tra xem model đã được tải chưa
    if (!isModelLoaded()) {
      Alert.alert(
        "Model chưa sẵn sàng",
        "Model CNN chưa được tải. Vui lòng đợi hoặc tải lại model trong phần Cài đặt.",
        [{ text: "OK" }],
      )
      return
    }

    // Tự động trích xuất văn bản từ hình vẽ
    setIsExtracting(true)

    // Xử lý trích xuất
    setTimeout(async () => {
      try {
        // Sử dụng model để trích xuất văn bản
        const text = await extractTextFromImageWithModel(uri, modelConfig)
        setExtractedText(text)

        // Lưu vào lịch sử
        addScan({
          id: Date.now().toString(),
          imageUri: uri,
          extractedText: text,
          createdAt: Date.now(),
        })
      } catch (error) {
        console.error("Lỗi khi trích xuất văn bản:", error)
        Alert.alert("Lỗi trích xuất", "Không thể trích xuất văn bản từ hình vẽ. Vui lòng thử lại.", [{ text: "OK" }])
      } finally {
        setIsExtracting(false)
      }
    }, 500)
  }

  // Xử lý chuyển tab
  const handleTabChange = (tab: "camera" | "drawing") => {
    setActiveTab(tab)
    // Không xóa extractedText khi chuyển tab
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
          <Text style={styles.title}>Trích xuất văn bản từ hình ảnh</Text>
          <Text style={styles.subtitle}>
            {isModelLoading
              ? "Đang tải model CNN..."
              : isModelLoaded()
                ? "Model CNN đã sẵn sàng"
                : "Model CNN chưa được tải"}
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
                      title="Trích xuất văn bản"
                      onPress={extractText}
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
                <Text style={styles.loadingText}>Đang trích xuất văn bản với model CNN...</Text>
                <Text style={styles.loadingSubText}>
                  {modelConfig.enhanceImage ? "Đang tăng cường hình ảnh..." : ""}
                </Text>
              </View>
            )}

            {extractedText && (
              <View style={styles.resultContainer}>
                <View style={styles.textHeaderContainer}>
                  <FileText size={20} color={colors.primary} />
                  <Text style={styles.textHeader}>Văn bản đã trích xuất</Text>
                </View>
                <Text style={styles.extractedText}>{extractedText}</Text>

                <View style={styles.modelInfoContainer}>
                  <Text style={styles.modelInfoText}>
                    Tăng cường hình ảnh:{" "}
                    <Text style={styles.modelInfoHighlight}>{modelConfig.enhanceImage ? "Có" : "Không"}</Text>
                  </Text>
                  <Text style={styles.modelInfoText}>
                    Hậu xử lý kết quả:{" "}
                    <Text style={styles.modelInfoHighlight}>{modelConfig.postProcess ? "Có" : "Không"}</Text>
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <Button
                    title="Sao chép văn bản"
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
                  description="Chọn hình ảnh từ thư viện hoặc chụp ảnh mới để trích xuất văn bản."
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
  modelInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  modelInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modelInfoHighlight: {
    color: colors.primary,
    fontWeight: "500",
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
