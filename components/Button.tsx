import type React from "react"
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle, type TextStyle } from "react-native"
import { colors } from "@/constants/colors"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "outline"
  size?: "small" | "medium" | "large"
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getButtonStyle = () => {
    const buttonStyle: ViewStyle = {}

    // Variant styles
    switch (variant) {
      case "primary":
        buttonStyle.backgroundColor = colors.primary
        break
      case "secondary":
        buttonStyle.backgroundColor = colors.secondary
        break
      case "outline":
        buttonStyle.backgroundColor = "transparent"
        buttonStyle.borderWidth = 1
        buttonStyle.borderColor = colors.primary
        break
    }

    // Size styles
    switch (size) {
      case "small":
        buttonStyle.paddingVertical = 8
        buttonStyle.paddingHorizontal = 16
        break
      case "medium":
        buttonStyle.paddingVertical = 12
        buttonStyle.paddingHorizontal = 24
        break
      case "large":
        buttonStyle.paddingVertical = 16
        buttonStyle.paddingHorizontal = 32
        break
    }

    // Disabled style
    if (disabled) {
      buttonStyle.opacity = 0.5
    }

    return buttonStyle
  }

  const getTextStyle = () => {
    const customTextStyle: TextStyle = {}

    if (variant === "outline") {
      customTextStyle.color = colors.primary
    }

    switch (size) {
      case "small":
        customTextStyle.fontSize = 14
        break
      case "medium":
        customTextStyle.fontSize = 16
        break
      case "large":
        customTextStyle.fontSize = 18
        break
    }

    return customTextStyle
  }

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : "white"} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[styles.text, getTextStyle(), textStyle, icon ? { marginLeft: 8 } : {}]}
            numberOfLines={1} // Đảm bảo text chỉ hiển thị trên 1 dòng
            ellipsizeMode="tail" // Cắt text và hiển thị dấu ... nếu quá dài
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  text: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
})
