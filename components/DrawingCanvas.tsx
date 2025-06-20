import type React from "react"
import { useRef, useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  type ViewStyle,
  Alert,
} from "react-native"
import { colors } from "@/constants/colors"
import { Copy, FileText, Trash2 } from "lucide-react-native"
import Canvas from "react-native-canvas"
import type { CanvasRenderingContext2D } from "react-native-canvas"
import { captureRef } from "react-native-view-shot"
import { View as RNView } from "react-native"
import Svg, { Path as SvgPath } from "react-native-svg"
import { extractTextFromImageWithModel, type ModelConfig } from "@/utils/model-handler"
import * as Clipboard from "expo-clipboard"
import { useScanStore } from "@/store/scan-store";

interface Point {
  x: number
  y: number
}
interface Path {
  points: Point[]
}
interface HistoryEntry {
  id: string
  imageUri: string
  text: string  
  timestamp: Date
}
interface DrawingCanvasProps {
  onCapture?: (uri: string) => void
  style?: ViewStyle
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCapture, style }) => {
  const canvasRef = useRef<Canvas>(null)
  const viewShotRef = useRef<RNView>(null)
  const [allPaths, setAllPaths] = useState<Path[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<Point[]>([])
  const [recognizedText, setRecognizedText] = useState<string | null>(null)
  const { addScan } = useScanStore();

  
  // 🔧 Thêm state để force re-render
  const [canvasKey, setCanvasKey] = useState(0)
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  
  useEffect(() => {
    console.log("[useEffect] allPaths cập nhật:", allPaths.length);
  }, [allPaths]);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = canvasSize.width
      canvas.height = canvasSize.height
      const context = canvas.getContext("2d")
      if (context) {
        context.lineWidth = 5
        context.strokeStyle = "#000"
        context.lineCap = "round"
        context.lineJoin = "round"
        setCtx(context)
        setIsCanvasReady(true) // ✅ Đánh dấu canvas đã sẵn sàng
      }
    }
  }, [canvasRef.current, canvasSize, canvasKey]) // 🔧 Thêm canvasKey vào dependency

  const drawStroke = (points: Point[]) => {
    if (!ctx || points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const cur = points[i]
      const midX = (prev.x + cur.x) / 2
      const midY = (prev.y + cur.y) / 2
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }

  const renderAllPaths = () => {
    if (!ctx || !isCanvasReady) return; // ✅ Kiểm tra canvas ready
    console.log("[renderAllPaths] Đang render tất cả path, paths count:", allPaths.length);

    // 🔧 Force clear và setup lại canvas
    ctx.save() // Lưu trạng thái hiện tại
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    allPaths.forEach((p, index) => {
      console.log(`[renderAllPaths] Drawing path ${index} with ${p.points.length} points`);
      drawStroke(p.points);
    });
    
    if (currentPathRef.current.length) {
      console.log("[renderAllPaths] Drawing current path with", currentPathRef.current.length, "points");
      drawStroke(currentPathRef.current);
    }
    
    ctx.restore() // Khôi phục trạng thái
  };

  useEffect(() => {
    if (ctx && isCanvasReady) {
      // 🔧 Thêm delay nhỏ để đảm bảo canvas đã được mount
      setTimeout(() => {
        renderAllPaths()
      }, 50)
    }
  }, [ctx, canvasSize, allPaths, isCanvasReady])

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { nativeEvent } = event
      isDrawingRef.current = true
      currentPathRef.current = [{ x: nativeEvent.locationX, y: nativeEvent.locationY }]
      renderAllPaths()
    },
    onPanResponderMove: (event) => {
      const { nativeEvent } = event
      if (!isDrawingRef.current) return
      currentPathRef.current.push({ x: nativeEvent.locationX, y: nativeEvent.locationY })
      if (currentPathRef.current.length % 3 === 0) {
        renderAllPaths()
      }
    },
    onPanResponderRelease: () => {
      if (isDrawingRef.current && currentPathRef.current.length) {
        setAllPaths((prev) => [...prev, { points: [...currentPathRef.current] }])
        isDrawingRef.current = false
      }
    },
  })

  const clearCanvas = () => {
    console.log("[clearCanvas] Bắt đầu xoá canvas");
    
    // 🔧 Reset tất cả state
    setAllPaths([]);
    currentPathRef.current = [];
    isDrawingRef.current = false;
    
    // 🔧 Force re-render canvas
    setCanvasKey(prev => prev + 1)
    setIsCanvasReady(false)

    if (ctx) {
      ctx.save()
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.restore()
      console.log("[clearCanvas] Đã clear canvas thủ công");
    }
    
    // 🔧 Force re-render component sau khi clear
    setTimeout(() => {
      setIsCanvasReady(true)
    }, 100)
    setHistory([]); // Xóa toàn bộ lịch sử ảnh
    setRecognizedText(null) 
    console.log("[clearCanvas] Xoá canvas thành công");
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  const captureCanvas = async () => {
    if (!allPaths.length) {
      Alert.alert("Chưa có nét vẽ", "Vui lòng vẽ ký tự trước khi trích xuất.");
      return;
    }

    try {
      // Force render để đảm bảo canvas đầy đủ nét vẽ
      if (ctx && isCanvasReady) renderAllPaths();

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 200)
          })
        })
      });

      const fullUri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
        width: canvasSize.width,
        height: canvasSize.height,
        snapshotContentContainer: false,
      });

      console.log("[captureCanvas] Capture thành công:", fullUri);

      // 👉 Gửi ảnh tới server ngay tại đây
      const config: ModelConfig = {
        enhanceImage: true,
        postProcess: true,
        model: "CNN", // Hoặc để người dùng chọn model nếu cần
      };

      const text = await extractTextFromImageWithModel(fullUri, config, "drawing");
      console.log("[captureCanvas] Ký tự nhận diện được:", text);
      setRecognizedText(text);

      addScan({
        id: Date.now().toString(),
        imageUri: fullUri,
        extractedText: text,
        createdAt: Date.now(),
      });

      const entry: HistoryEntry = {
        id: generateId(),
        imageUri: fullUri,
        text,
        timestamp: new Date(),
      };

      setHistory((prev) => [...prev, entry]);

    } catch (e) {
      console.error("[captureCanvas] Lỗi:", e);
      Alert.alert("Lỗi nhận diện", e instanceof Error ? e.message : String(e));
    }
  };


  // Helper function to convert points to SVG path
  const pointsToSvgPath = (points: Point[]) => {
    if (points.length < 2) return '';
    
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    return path;
  };

  return (
    <View style={[styles.container, style]}>
      <View
        ref={viewShotRef}
        style={styles.canvasContainer}
        onLayout={({ nativeEvent }) =>
          setCanvasSize({
            width: nativeEvent.layout.width,
            height: nativeEvent.layout.height,
          })
        }
        {...pan.panHandlers}
      >
        <Canvas 
          key={canvasKey} // 🔧 Thêm key để force re-mount
          ref={canvasRef} 
          style={styles.canvas}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout
            setTimeout(() => {
              console.log(width, height) // không dùng event nữa
            }, 100)
          }}



        />
        
        {/* SVG Overlay for better capture compatibility */}
        <Svg 
          key={`svg-${canvasKey}`} // 🔧 Sync với canvas key
          style={StyleSheet.absoluteFillObject} 
          width={canvasSize.width} 
          height={canvasSize.height}
          pointerEvents="none"
        >
          {allPaths.map((path, index) => (
            <SvgPath
              key={`${canvasKey}-${index}`} // 🔧 Unique key với canvasKey
              d={pointsToSvgPath(path.points)}
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentPathRef.current.length > 0 && (
            <SvgPath
              key={`current-${canvasKey}`}
              d={pointsToSvgPath(currentPathRef.current)}
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={clearCanvas}>
          <Trash2 size={20} color={colors.error} />
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button, 
            styles.captureButton,
            !isCanvasReady && styles.disabledButton // 🔧 Disable khi canvas chưa ready
          ]} 
          onPress={captureCanvas}
          disabled={!isCanvasReady} // 🔧 Disable button khi canvas chưa sẵn sàng
        >
          <Text style={styles.captureButtonText}>
            {isCanvasReady ? "Nhận diện ký tự" : "Đang tải..."}
          </Text>
        </TouchableOpacity>
      </View>

      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Lịch sử ký tự</Text>
          <ScrollView horizontal style={styles.historyScroll}>
            {history.map((e) => (
              <View key={e.id} style={styles.historyItem}>
                <Image source={{ uri: e.imageUri }} style={styles.historyImage} resizeMode="contain" />
                <Text style={styles.historyTimestamp}>{e.timestamp.toLocaleTimeString()}</Text>
                <Text style={styles.historyItem}>{e.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      {recognizedText && (
        <View style={styles.resultContainer}>
          <View style={styles.textHeaderContainer}>
            <FileText size={20} color={colors.primary} />
            <Text style={styles.textHeader}>Ký tự đã nhận diện</Text>
          </View>

          <Text style={styles.extractedText}>{recognizedText}</Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={async () => {
                await Clipboard.setStringAsync(recognizedText)
                Alert.alert("Thành công", "Đã sao chép ký tự vào clipboard!")
              }}
            >
              <Copy size={16} color="white" />
              <Text style={styles.primaryButtonText}>Sao chép ký tự</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={clearCanvas}
            >
              <Text style={styles.outlineButtonText}>Quét mới</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  canvasContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#ffffff",
    // borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  controls: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    marginLeft: 8,
    color: colors.error,
    fontWeight: "500",
  },
  captureButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  captureButtonText: {
    color: "white",
    fontWeight: "600",
  },
  // 🔧 Thêm style cho disabled button
  disabledButton: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  historyContainer: {
    width: "100%",
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  historyScroll: {
    width: "100%",
  },
  historyItem: {
    marginRight: 12,
    alignItems: "center",
  },
  historyImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
  },
  historyTimestamp: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  ocrResultContainer: {
  width: "100%",
  marginTop: 20,
  padding: 12,
  borderRadius: 8,
  backgroundColor: "#f2f2f2",
  borderWidth: 1,
  borderColor: colors.border,
},
ocrResultTitle: {
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 4,
},
ocrResultText: {
  fontSize: 15,
  color: "#333333",
},
resultContainer: {
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: 16,
  marginTop: 20,
  width: "100%",
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
primaryButton: {
  backgroundColor: colors.primary,
  borderRadius: 8,
  padding: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  flex: 1,
},
primaryButtonText: {
  color: "white",
  fontWeight: "600",
  fontSize: 13,
},
outlineButton: {
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 8,
  padding: 10,
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
},
outlineButtonText: {
  color: colors.text,
  fontWeight: "600",
  fontSize: 13,
},


})