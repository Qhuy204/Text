"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, Switch, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native"
import { colors } from "@/constants/colors"
import { Settings, Info, HelpCircle, Sliders, RefreshCw } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isModelLoaded, reloadModel } from "@/utils/model-handler"
import { loadModel } from "@/utils/model-handler"

// Cấu trúc dữ liệu cho cài đặt model
interface ModelSettings {
  selectedModel: "CNN" | "SVM"
  enhanceImage: boolean
  postProcess: boolean
}

// Key lưu trữ cài đặt trong AsyncStorage
const SETTINGS_STORAGE_KEY = "text_extraction_model_settings"

export default function SettingsScreen() {
  const [enhanceImage, setEnhanceImage] = useState(true)
  const [postProcess, setPostProcess] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [selectedModel, setSelectedModel] = useState<"CNN" | "SVM">("CNN")
  // ✅ Load model khi đổi switch
  const handleModelChange = async (model: "CNN" | "SVM") => {
    setIsLoading(true)
    try {
      const result = await loadModel(model)
      if (result.success && result.current_model) {
        setSelectedModel(result.current_model)
        await saveSettings(result.current_model) // ⬅ lưu lại model mới
        Alert.alert("Thành công", `Đã chuyển sang mô hình ${result.current_model}`)
      } else {
        Alert.alert("Lỗi", "Không thể chuyển model. Vui lòng thử lại.")
      }
    } catch (error) {
      console.error("Lỗi khi chuyển model:", error)
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi chuyển model.")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Lưu settings
  const saveSettings = async (modelOverride?: "CNN" | "SVM") => {
    try {
      const settings: ModelSettings = {
        selectedModel: modelOverride || selectedModel,
        enhanceImage,
        postProcess,
      }
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error("Lỗi khi lưu cài đặt:", error)
    }
  }
    



  // Tải cài đặt khi component mount
  useEffect(() => {
    loadSettings()
    checkModelStatus()
  }, [])

  // Kiểm tra trạng thái model
  const checkModelStatus = async () => {
    const loaded = isModelLoaded()
    setModelLoaded(loaded)
  }

  // Lưu cài đặt khi có thay đổi
  useEffect(() => {
    saveSettings()
  }, [enhanceImage, postProcess])

  // Tải cài đặt từ AsyncStorage
  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      if (settingsJson) {
        const settings: ModelSettings = JSON.parse(settingsJson)
        setSelectedModel(settings.selectedModel || "CNN")
        setEnhanceImage(settings.enhanceImage)
        setPostProcess(settings.postProcess)
      }
    } catch (error) {
      console.error("Lỗi khi tải cài đặt:", error)
    }
  }

  // // Lưu cài đặt vào AsyncStorage
  // const saveSettings = async () => {
  //   try {
  //     const settings: ModelSettings = {
  //       selectedModel,
  //       enhanceImage,
  //       postProcess,
  //     }
  //     await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  //   } catch (error) {
  //     console.error("Lỗi khi lưu cài đặt:", error)
  //   }
  // }

  // Tải lại model
  const handleReloadModel = async () => {
    setIsLoading(true)
    try {
      const success = await reloadModel(selectedModel);
      setModelLoaded(success)

      if (success) {
        Alert.alert("Thành công", "Đã tải lại model thành công.")
      } else {
        Alert.alert("Lỗi", "Không thể tải lại model. Vui lòng thử lại.")
      }
    } catch (error) {
      console.error("Lỗi khi tải lại model:", error)
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải lại model.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Settings size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Cài đặt nhận dạng</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn mô hình sử dụng</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Mô hình CNN</Text>
              <Text style={styles.settingDescription}>
                Mô hình học sâu có độ chính xác cao, sử dụng TensorFlow Lite.
              </Text>
            </View>
            <Switch
              value={selectedModel === "CNN"}
              onValueChange={(value) => {
                if (value && selectedModel !== "CNN") {
                  handleModelChange("CNN")
                }
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={selectedModel === "CNN" ? colors.primary : "#f4f3f4"}
            />

          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Mô hình SVM</Text>
              <Text style={styles.settingDescription}>
                Mô hình máy vector hỗ trợ, nhẹ và hiệu quả với dữ liệu đơn giản.
              </Text>
            </View>
            <Switch
              value={selectedModel === "SVM"}
              onValueChange={(value) => {
                if (value && selectedModel !== "SVM") {
                  handleModelChange("SVM")
                }
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={selectedModel === "SVM" ? colors.primary : "#f4f3f4"}
            />

          </View>

          <TouchableOpacity
            style={[styles.reloadButton, isLoading && styles.reloadButtonDisabled]}
            onPress={handleReloadModel}
            disabled={isLoading}
          >
            <RefreshCw size={18} color={isLoading ? colors.textLight : colors.primary} />
            <Text style={[styles.reloadButtonText, isLoading && styles.reloadButtonTextDisabled]}>
              {isLoading ? "Đang tải model..." : "Tải lại model"}
            </Text>
          </TouchableOpacity>
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin model</Text>

          <View style={styles.modelInfoContainer}>
            <Text style={styles.modelInfoTitle}>Model CNN</Text>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Đường dẫn:</Text>
              <Text style={styles.modelInfoValue}>D:\Text Extraction app\TextApp\backend\model\CNN.tflite</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Kiến trúc:</Text>
              <Text style={styles.modelInfoValue}>
                3 Conv2D (32, 64, 128 filters, 3x3) + 3 MaxPooling2D (2x2) + Flatten + 2 Dense (128, 62) + Dropout (0.5)
              </Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Kích thước input:</Text>
              <Text style={styles.modelInfoValue}>28x28x1</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Số lớp đầu ra:</Text>
              <Text style={styles.modelInfoValue}>62 (0-9, A-Z, a-z)</Text>
            </View>
          </View>

          <View style={styles.modelInfoContainer}>
            <Text style={styles.modelInfoTitle}>Model SVM</Text>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Đường dẫn:</Text>
              <Text style={styles.modelInfoValue}>D:\Text Extraction app\TextApp\backend\model\SVM.joblib</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Kiến trúc:</Text>
              <Text style={styles.modelInfoValue}>
                Feature Extractor (CNN: 3 Conv2D + 3 MaxPooling2D + Flatten) + HOG + PCA (256 components) + SVM (RBF, C=10)
              </Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Kích thước input:</Text>
              <Text style={styles.modelInfoValue}>256 (đặc trưng sau PCA)</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Số lớp đầu ra:</Text>
              <Text style={styles.modelInfoValue}>62 (0-9, A-Z, a-z)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin</Text>

          <TouchableOpacity style={styles.aboutItem}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.aboutText}>Giới thiệu ứng dụng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutItem}>
            <HelpCircle size={20} color={colors.primary} />
            <Text style={styles.aboutText}>Trợ giúp & Hỗ trợ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutItem}>
            <Sliders size={20} color={colors.primary} />
            <Text style={styles.aboutText}>Cài đặt nâng cao</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 16,
  },
  reloadButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reloadButtonText: {
    color: colors.primary,
    fontWeight: "500",
    marginLeft: 8,
  },
  reloadButtonTextDisabled: {
    color: colors.textLight,
  },
  modelInfoContainer: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  modelInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 8,
  },
  modelInfoItem: {
    flexDirection: "row",
    marginVertical: 4,
  },
  modelInfoLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    width: 120,
  },
  modelInfoValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  modelStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modelStatusLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    marginRight: 8,
  },
  modelStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  modelStatusLoaded: {
    backgroundColor: colors.success,
  },
  modelStatusNotLoaded: {
    backgroundColor: colors.error,
  },
  modelStatusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modelStatusTextLoaded: {
    color: colors.success,
  },
  modelStatusTextNotLoaded: {
    color: colors.error,
  },
  modelOptionButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 6,
  marginHorizontal: 4,
},
modelOptionButtonActive: {
  backgroundColor: colors.primaryLight,
  borderColor: colors.primary,
},
modelOptionText: {
  color: colors.textSecondary,
},
modelOptionTextActive: {
  color: colors.primary,
  fontWeight: "600",
},

})
