import type React from "react"
import { View, StyleSheet, TouchableOpacity, Text } from "react-native"
import { colors } from "@/constants/colors"
import { Camera, Edit } from "lucide-react-native"

interface ScanTabsProps {
  activeTab: "camera" | "drawing"
  onTabChange: (tab: "camera" | "drawing") => void
}

export const ScanTabs: React.FC<ScanTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "camera" && styles.activeTab]}
        onPress={() => onTabChange("camera")}
      >
        <Camera size={20} color={activeTab === "camera" ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, activeTab === "camera" && styles.activeTabText]}>Máy ảnh</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "drawing" && styles.activeTab]}
        onPress={() => onTabChange("drawing")}
      >
        <Edit size={20} color={activeTab === "drawing" ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, activeTab === "drawing" && styles.activeTabText]}>Vẽ ký tự</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primaryLight + "20", // 20% opacity
  },
  tabText: {
    marginLeft: 8,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: "600",
  },
})
