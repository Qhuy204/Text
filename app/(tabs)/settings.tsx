"use client"

import { useState, useEffect } from "react"
import { StyleSheet, View, Text, Switch, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native"
import { colors } from "@/constants/colors"
import { Settings, Info, HelpCircle, Sliders, RefreshCw } from "lucide-react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { isModelLoaded, reloadModel } from "@/utils/model-handler"

// Cấu trúc dữ liệu cho cài đặt model
interface ModelSettings {
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
        setEnhanceImage(settings.enhanceImage)
        setPostProcess(settings.postProcess)
      }
    } catch (error) {
      console.error("Lỗi khi tải cài đặt:", error)
    }
  }

  // Lưu cài đặt vào AsyncStorage
  const saveSettings = async () => {
    try {
      const settings: ModelSettings = {
        enhanceImage,
        postProcess,
      }
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error("Lỗi khi lưu cài đặt:", error)
    }
  }

  // Tải lại model
  const handleReloadModel = async () => {
    setIsLoading(true)
    try {
      const success = await reloadModel()
      setModelLoaded(success)

      if (success) {
        Alert.alert("Thành công", "Đã tải lại model CNN thành công.")
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
          <Text style={styles.sectionTitle}>Mô hình CNN</Text>

          <View style={styles.modelStatusContainer}>
            <Text style={styles.modelStatusLabel}>Trạng thái:</Text>
            <View
              style={[
                styles.modelStatusIndicator,
                modelLoaded ? styles.modelStatusLoaded : styles.modelStatusNotLoaded,
              ]}
            />
            <Text
              style={[
                styles.modelStatusText,
                modelLoaded ? styles.modelStatusTextLoaded : styles.modelStatusTextNotLoaded,
              ]}
            >
              {modelLoaded ? "Đã tải" : "Chưa tải"}
            </Text>
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
          <Text style={styles.sectionTitle}>Xử lý hình ảnh</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Tăng cường hình ảnh</Text>
              <Text style={styles.settingDescription}>
                Áp dụng điều chỉnh độ tương phản và lọc nhiễu để cải thiện chất lượng hình ảnh.
              </Text>
            </View>
            <Switch
              value={enhanceImage}
              onValueChange={setEnhanceImage}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={enhanceImage ? colors.primary : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Hậu xử lý văn bản</Text>
              <Text style={styles.settingDescription}>
                Áp dụng các hiệu chỉnh để cải thiện độ chính xác của kết quả nhận dạng.
              </Text>
            </View>
            <Switch
              value={postProcess}
              onValueChange={setPostProcess}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={postProcess ? colors.primary : "#f4f3f4"}
            />
          </View>
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
              <Text style={styles.modelInfoValue}>2 lớp tích chập + 1 lớp fully connected</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Kích thước đầu vào:</Text>
              <Text style={styles.modelInfoValue}>28x28x1 (ảnh xám)</Text>
            </View>
            <View style={styles.modelInfoItem}>
              <Text style={styles.modelInfoLabel}>Số lớp đầu ra:</Text>
              <Text style={styles.modelInfoValue}>36 (A-Z, 0-9)</Text>
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
})
