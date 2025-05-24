"use client"

import type React from "react"
import * as ImageManipulator from 'expo-image-manipulator'

import { useRef, useState, useEffect } from "react"
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Image, ScrollView, type ViewStyle } from "react-native"
import { colors } from "@/constants/colors"
import { Trash2 } from "lucide-react-native"
import Canvas from "react-native-canvas"
import type { CanvasRenderingContext2D } from "react-native-canvas"
import { captureRef } from 'react-native-view-shot'
import { View as RNView } from 'react-native'

interface Point { x: number; y: number }
interface Path { points: Point[] }
interface HistoryEntry { id: string; imageUri: string; timestamp: Date }
interface DrawingCanvasProps { onCapture?: (uri: string) => void; style?: ViewStyle }

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCapture, style }) => {
  const canvasRef = useRef<Canvas>(null)
  const viewShotRef = useRef<RNView>(null)
  const [allPaths, setAllPaths] = useState<Path[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<Point[]>([])

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
      }
    }
  }, [canvasRef.current, canvasSize])

  const drawStroke = (points: Point[]) => {
    if (!ctx || points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]; const cur = points[i]
      const midX = (prev.x + cur.x) / 2; const midY = (prev.y + cur.y) / 2
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }

  const renderAllPaths = () => {
    if (!ctx) return
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    allPaths.forEach(p => drawStroke(p.points))
    if (currentPathRef.current.length) drawStroke(currentPathRef.current)
  }

  useEffect(() => { if (ctx) renderAllPaths() }, [ctx, canvasSize, allPaths])

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event: import("react-native").GestureResponderEvent) => {
      const { nativeEvent } = event
      isDrawingRef.current = true
      currentPathRef.current = [{ x: nativeEvent.locationX, y: nativeEvent.locationY }]
      renderAllPaths()
    },
    onPanResponderMove: (event: import("react-native").GestureResponderEvent) => {
      const { nativeEvent } = event
      if (!isDrawingRef.current) return
      currentPathRef.current.push({ x: nativeEvent.locationX, y: nativeEvent.locationY })
      renderAllPaths()
    },
    onPanResponderRelease: () => {
      if (isDrawingRef.current && currentPathRef.current.length) {
        setAllPaths(prev => [...prev, { points: [...currentPathRef.current] }])
        isDrawingRef.current = false
      }
    }
  })

  const clearCanvas = () => {
    setAllPaths([])
    currentPathRef.current = []
    isDrawingRef.current = false
    if (ctx) ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
  }

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7)

  const captureCanvas = async () => {
    if (!viewShotRef.current || !allPaths.length) {
      alert("Vui lòng vẽ trước khi trích xuất")
      return
    }
    try {
      // Tìm bounding box của nét vẽ
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      allPaths.forEach(path => {
        path.points.forEach(p => {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        })
      })
      
      // Thêm padding xung quanh nét vẽ
      const padding = 20
      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = Math.min(canvasSize.width, maxX + padding)
      maxY = Math.min(canvasSize.height, maxY + padding)
      
      const width = maxX - minX
      const height = maxY - minY
      
      // Đảm bảo vùng cắt có kích thước hợp lý
      if (width < 10 || height < 10) {
        // Nếu vùng quá nhỏ, lấy toàn bộ canvas
        const fullUri = await captureRef(viewShotRef, { 
          format: 'png', 
          quality: 1
        })
        
        const entry: HistoryEntry = { 
          id: generateId(), 
          imageUri: fullUri, 
          timestamp: new Date() 
        }
        
        setHistory(prev => [...prev, entry])
        onCapture?.(fullUri)
        return
      }
      
      // Đảm bảo hình vuông cho vùng crop
      const size = Math.max(width, height)
      
      // Điều chỉnh tọa độ để giữ ký tự ở giữa
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      
      const halfSize = size / 2
      const cropX = Math.max(0, Math.min(canvasSize.width - size, centerX - halfSize))
      const cropY = Math.max(0, Math.min(canvasSize.height - size, centerY - halfSize))
      
      // Chụp toàn bộ canvas trước
      const fullUri = await captureRef(viewShotRef, { 
        format: 'png', 
        quality: 1,
        result: 'tmpfile'
      })
      
      // Cắt ảnh với tọa độ chính xác
      const result = await ImageManipulator.manipulateAsync(
        fullUri,
        [{ 
          crop: { 
            originX: cropX, 
            originY: cropY, 
            width: size, 
            height: size 
          } 
        }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      )
      
      const croppedUri = result.uri
      
      // Thêm vào lịch sử và gọi callback
      const entry: HistoryEntry = { 
        id: generateId(), 
        imageUri: croppedUri, 
        timestamp: new Date() 
      }
      
      setHistory(prev => [...prev, entry])
      onCapture?.(croppedUri)
    } catch(e) {
      console.error("Lỗi capture:", e)
      alert("Không thể lưu ảnh: " + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <View style={[styles.container, style]}>
      <View ref={viewShotRef} style={styles.canvasContainer} onLayout={({ nativeEvent }) => setCanvasSize(nativeEvent.layout)} {...pan.panHandlers}>
        <Canvas ref={canvasRef} style={styles.canvas}/>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={clearCanvas}>
          <Trash2 size={20} color={colors.error}/><Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button,styles.captureButton]} onPress={captureCanvas}>
          <Text style={styles.captureButtonText}>Trích xuất văn bản</Text>
        </TouchableOpacity>
      </View>
      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Lịch sử ký tự</Text>
          <ScrollView horizontal style={styles.historyScroll}>
            {history.map(e => (
              <View key={e.id} style={styles.historyItem}>
                <Image source={{uri:e.imageUri}} style={styles.historyImage} resizeMode="contain"/>
                <Text style={styles.historyTimestamp}>{e.timestamp.toLocaleTimeString()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:{width:'100%',alignItems:'center'},
  canvasContainer:{width:'100%',height:300,backgroundColor:'#f0f0f0',borderRadius:12,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  canvas:{width:'100%',height:'100%'},
  controls:{flexDirection:'row',marginTop:16,justifyContent:'space-between',width:'100%'},
  button:{flexDirection:'row',alignItems:'center',padding:10,borderRadius:8,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},
  buttonText:{marginLeft:8,color:colors.error,fontWeight:'500'},
  captureButton:{backgroundColor:colors.primary,borderColor:colors.primary},
  captureButtonText:{color:'white',fontWeight:'600'},
  historyContainer:{width:'100%',marginTop:20},
  historyTitle:{fontSize:16,fontWeight:'600',marginBottom:8},
  historyScroll:{width:'100%'},
  historyItem:{marginRight:12,alignItems:'center'},
  historyImage:{width:100,height:100,borderRadius:8,borderWidth:1,borderColor:colors.border,backgroundColor:'#f0f0f0'},
  historyTimestamp:{fontSize:12,color:colors.text,marginTop:4}
})