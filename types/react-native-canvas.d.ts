// src/types/react-native-canvas.d.ts
declare module 'react-native-canvas' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface CanvasProps extends ViewProps {
    ref?: React.Ref<Canvas>;
    onContext2D?: (ctx: CanvasRenderingContext2D) => void;
  }

  export class Canvas extends React.Component<CanvasProps> {
    set width(value: number);
    get width(): number;
    set height(value: number);
    get height(): number;
    
    getContext(contextId: '2d'): CanvasRenderingContext2D;
  }

  export interface CanvasRenderingContext2D {
    // Drawing styles
    lineWidth: number;
    strokeStyle: string;
    fillStyle: string;
    lineCap: 'butt' | 'round' | 'square';
    lineJoin: 'round' | 'bevel' | 'miter';
    
    // Rectangle methods
    clearRect: (x: number, y: number, width: number, height: number) => void;
    fillRect: (x: number, y: number, width: number, height: number) => void;
    strokeRect: (x: number, y: number, width: number, height: number) => void;
    
    // Path methods
    beginPath: () => void;
    closePath: () => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) => void;
    arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => void;
    bezierCurveTo: (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => void;
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void;
    
    // Drawing paths
    fill: () => void;
    stroke: () => void;
    
    // Text methods
    fillText: (text: string, x: number, y: number, maxWidth?: number) => void;
    strokeText: (text: string, x: number, y: number, maxWidth?: number) => void;
    measureText: (text: string) => { width: number };
    
    // Image methods
    drawImage: (
      image: any,
      dx: number,
      dy: number,
      dWidth?: number,
      dHeight?: number,
      sx?: number,
      sy?: number,
      sWidth?: number,
      sHeight?: number
    ) => void;
    
    // Transformations
    scale: (x: number, y: number) => void;
    rotate: (angle: number) => void;
    translate: (x: number, y: number) => void;
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    resetTransform: () => void;
    
    // Compositing
    globalAlpha: number;
    globalCompositeOperation: string;
    
    // State
    save: () => void;
    restore: () => void;
    
    // Image data
    createImageData: (width: number, height: number) => ImageData;
    getImageData: (sx: number, sy: number, sw: number, sh: number) => ImageData;
    putImageData: (imagedata: ImageData, dx: number, dy: number) => void;
    
    // Canvas to data URL
    toDataURL: (type?: string, quality?: number) => string;
  }
  
  interface ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }

  export default Canvas;
}