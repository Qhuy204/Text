from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
import json
import os
from werkzeug.utils import secure_filename
import cv2
import time
import joblib
import socket   
from datetime import datetime
from PIL import ImageDraw
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module='tensorflow')
app = Flask(__name__)
CORS(app)

# Cấu hình
MODEL_PATH = 'models/CNN.tflite'
LABELS_PATH = 'models/labels.json'
UPLOAD_FOLDER = 'temp_uploads'

# Tạo thư mục upload nếu chưa có
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('models', exist_ok=True)
os.makedirs('original', exist_ok=True)


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class OCRModel:
    def __init__(self):
        self.interpreter = None
        self.labels = []
        self.input_details = None
        self.output_details = None
        self.loaded = False
        self.model_type = "CNN"  # hoặc "SVM"
        self.svm_session = None
        self.pca = None
        
    def preprocess_canvas_image(self, image):
        try:
            # Bước 1: Xoá viền bo góc bằng mask
            w, h = image.size
            corner_radius = 10  # Điều chỉnh nếu góc nhỏ/lớn hơn

            # Tạo mask trắng với bo góc đen
            mask = Image.new("L", (w, h), 255)
            draw = ImageDraw.Draw(mask)
            draw.pieslice((0, 0, 2*corner_radius, 2*corner_radius), 180, 270, fill=0)          # Top-left
            draw.pieslice((w-2*corner_radius, 0, w, 2*corner_radius), 270, 360, fill=0)        # Top-right
            draw.pieslice((0, h-2*corner_radius, 2*corner_radius, h), 90, 180, fill=0)         # Bottom-left
            draw.pieslice((w-2*corner_radius, h-2*corner_radius, w, h), 0, 90, fill=0)         # Bottom-right

            # Áp mask vào ảnh
            image_np = np.array(image.convert("RGB"))
            mask_np = np.array(mask) / 255.0
            image_np = (image_np * mask_np[..., np.newaxis]).astype(np.uint8)
            image = Image.fromarray(image_np)

            # Bước 2: Chuyển sang ảnh xám và nhị phân
            gray = np.mean(np.array(image), axis=2).astype(np.uint8)
            _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

            # Bước 3: Crop vùng chữ số
            coords = cv2.findNonZero(binary)
            x, y, w, h = cv2.boundingRect(coords)
            cropped = binary[y:y + h, x:x + w]

            # Bước 4: Resize về 20x20
            resized = cv2.resize(cropped, (20, 20), interpolation=cv2.INTER_NEAREST)

            # Bước 5: Center vào canvas 28x28
            canvas = np.zeros((28, 28), dtype=np.uint8)
            x_offset = (28 - 20) // 2
            y_offset = (28 - 20) // 2
            canvas[y_offset:y_offset + 20, x_offset:x_offset + 20] = resized

            # Bước 6: Loại bỏ blob nhỏ dư thừa (chấm rác)
            n_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(canvas, connectivity=8)
            min_area = 5  # Có thể tăng lên nếu chấm vẫn còn
            clean_canvas = np.zeros_like(canvas)
            for i in range(1, n_labels):
                if stats[i, cv2.CC_STAT_AREA] >= min_area:
                    clean_canvas[labels == i] = 255

            # Bước 7: Chuẩn hóa ảnh
            img = clean_canvas.astype(np.float32) / 255.0
            img = img.reshape(1, 28, 28, 1)

            return img

        except Exception as e:
            print(f"Lỗi trong preprocess_canvas_image: {e}")
            raise e

    def load_model(self, model_type='CNN'):
        try:
            self.model_type = model_type
            print(f"Đang chuyển sang model: {model_type}")

            # Reset các thuộc tính để tránh sử dụng sai
            self.interpreter = None
            self.input_details = None
            self.output_details = None
            self.feature_extractor = None

            if model_type == 'CNN':
                model_path = "models/CNN.tflite"
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Mô hình CNN không tồn tại: {model_path}")
                self.interpreter = tf.lite.Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                print("Đã load model CNN (.tflite)")
            elif model_type == 'SVM':
                try:
                    svm_path = "models/SVM.joblib"
                    if not os.path.exists(svm_path):
                        raise FileNotFoundError(f"Mô hình SVM không tồn tại: {svm_path}")
                    self.svm_session = joblib.load(svm_path)
                    print("Đã load SVM")

                    pca_path = "models/PCA.joblib"
                    if not os.path.exists(pca_path):
                        raise FileNotFoundError(f"PCA model không tồn tại: {pca_path}")
                    elif os.path.getsize(pca_path) == 0:
                        raise ValueError(f"PCA model file trống: {pca_path}")
                    self.pca = joblib.load(pca_path)
                    print(f"Đã load PCA với {self.pca.n_features_in_} đặc trưng")

                    # Load feature extractor từ file .h5
                    feature_extractor_path = "models/feature_extractor.h5"
                    if not os.path.exists(feature_extractor_path):
                        raise FileNotFoundError(f"Mô hình feature extractor không tồn tại: {feature_extractor_path}")
                    self.feature_extractor = tf.keras.models.load_model(feature_extractor_path, compile=False)
                    print("Đã load feature extractor từ feature_extractor.h5")
                except Exception as svm_e:
                    print(f"Lỗi khi load SVM/PCA/Feature Extractor: {svm_e}")
                    raise svm_e
            else:
                raise ValueError(f"Không hỗ trợ model: {model_type}")

            with open(LABELS_PATH, 'r', encoding='utf-8') as f:
                self.labels = json.load(f)

            self.loaded = True
            return True

        except Exception as e:
            print(f"Lỗi khi tải model {model_type}: {e}")
            return False
    def preprocess_image(self, image, enhance_image=True):
        try:
            # B1: RGB -> np.array
            if image.mode != 'RGB':
                image = image.convert('RGB')
            img_np = np.array(image)

            # B2: Làm mịn mà vẫn giữ nét
            img_np = cv2.bilateralFilter(img_np, d=9, sigmaColor=75, sigmaSpace=75)

            # B3: Grayscale
            gray = np.mean(img_np, axis=2).astype(np.uint8)

            # B4: Invert nếu nền sáng
            if np.mean(gray) > 40:
                gray = 255 - gray

            # B5: Nâng cao độ tương phản (sharpen)
            if enhance_image:
                kernel = np.array([[0, -1, 0],
                                [-1, 5, -1],
                                [0, -1, 0]])
                gray = cv2.filter2D(gray, -1, kernel)

            # B6: Binarize
            _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

            # B7: Xóa nhiễu - loại các blob quá nhỏ
            n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
            clean = np.zeros_like(binary)
            for i in range(1, n_labels):
                area = stats[i, cv2.CC_STAT_AREA]
                if area > 30:  # giữ lại blob đủ lớn
                    clean[labels == i] = 255

            # B8: Bounding box vùng có ký tự
            coords = cv2.findNonZero(clean)
            if coords is None:
                raise ValueError("Không tìm thấy ký tự nào.")
            x, y, w, h = cv2.boundingRect(coords)
            cropped = clean[y:y + h, x:x + w]

            # B9: Resize đảm bảo ký tự ≥ 75% chiều cao canvas
            min_height = int(28 * 0.75)  # 21px
            target_height = max(min_height, min(24, h))
            scale = target_height / h
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            resized = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # B10: Đo mật độ pixel trắng
            white_pixels = np.sum(resized > 0)
            density = white_pixels / (new_w * new_h)
            print(f"[Debug] White density: {density:.2f}")

            # B11: Làm dày nét nếu cần
            if white_pixels < 70 or density < 0.25:
                print("[!] Tăng cường độ dày nét do pixel quá ít hoặc mảnh")
                kernel = np.ones((2, 2), np.uint8)
                resized = cv2.dilate(resized, kernel, iterations=1)

            # B12: Center vào canvas 28x28
            canvas = np.zeros((28, 28), dtype=np.uint8)
            x_offset = max((28 - new_w) // 2, 0)
            y_offset = max((28 - new_h) // 2, 0)
            paste_w = min(new_w, 28 - x_offset)
            paste_h = min(new_h, 28 - y_offset)
            canvas[y_offset:y_offset + paste_h, x_offset:x_offset + paste_w] = resized[:paste_h, :paste_w]

            # B13: Chuẩn hoá về [0,1]
            img = canvas.astype(np.float32) / 255.0
            img = img.reshape(1, 28, 28, 1)

            # Debug: lưu ảnh đã xử lý
            os.makedirs('resized', exist_ok=True)
            Image.fromarray((img.squeeze() * 255).astype(np.uint8)) \
                .save(os.path.join('resized', f'camera_cleaned_{int(time.time())}.png'))

            return img

        except Exception as e:
            print(f"[!] Lỗi xử lý ảnh camera: {e}")
            raise e



    def predict(self, image, config):
        print(f"[Model] Nhận yêu cầu predict với source = {config.get('source', 'unknown')}")
        try:
            if not self.loaded:
                raise Exception("Model chưa được tải")

            start_time = time.time()

            if config.get("source") == "canvas":
                processed_image = self.preprocess_canvas_image(image)
            else:
                processed_image = self.preprocess_image(image, config.get('enhanceImage', True))

            if self.model_type == 'CNN':
                if self.interpreter is None:
                    raise ValueError("Interpreter không được khởi tạo cho model CNN")
                self.interpreter.set_tensor(self.input_details[0]['index'], processed_image)
                self.interpreter.invoke()
                output_data = self.interpreter.get_tensor(self.output_details[0]['index'])[0]

            elif self.model_type == 'SVM':
                if self.feature_extractor is None:
                    raise ValueError("Feature extractor không được khởi tạo cho model SVM")
                if self.svm_session is None or self.pca is None:
                    raise ValueError("SVM hoặc PCA không được khởi tạo")
                # Trích xuất đặc trưng CNN bằng feature extractor
                cnn_features = self.feature_extractor.predict(processed_image, verbose=0)[0]

                # Trích xuất đặc trưng HOG (đảm bảo khớp với extract_hog_batch)
                from skimage.feature import hog
                img_gray = processed_image.squeeze() * 255.0
                hog_vector = hog(
                    img_gray,
                    orientations=9,
                    pixels_per_cell=(4, 4),
                    cells_per_block=(2, 2),
                    block_norm='L2-Hys',
                    transform_sqrt=True  # Đảm bảo khớp với extract_hog_batch
                )

                # Kết hợp đặc trưng
                combined_features = np.hstack((cnn_features, hog_vector)).reshape(1, -1)
                print(f"Combined features shape: {combined_features.shape}")
                print(f"PCA expects: {self.pca.n_features_in_} features")
                print(f"CNN features shape: {cnn_features.shape}")
                print(f"HOG features shape: {hog_vector.shape}")

                # Kiểm tra số lượng đặc trưng
                if combined_features.shape[1] != self.pca.n_features_in_:
                    raise ValueError(
                        f"Số lượng đặc trưng không khớp: combined_features có {combined_features.shape[1]} đặc trưng, "
                        f"nhưng PCA mong đợi {self.pca.n_features_in_} đặc trưng"
                    )

                # Áp dụng PCA
                combined_pca = self.pca.transform(combined_features).astype(np.float32)
                output_data = self.svm_session.predict_proba(combined_pca)[0]

            else:
                raise ValueError(f"Model type không hợp lệ: {self.model_type}")

            # --- Phân tích top-2 ---
            top2_indices = np.argsort(output_data)[-2:][::-1]
            top1_idx = int(top2_indices[0])
            top2_idx = int(top2_indices[1])
            top1_conf = float(output_data[top1_idx])
            top2_conf = float(output_data[top2_idx])
            diff = top1_conf - top2_conf

            top1_label = self.labels.get(str(top1_idx), "?")
            top2_label = self.labels.get(str(top2_idx), "?")

            # --- Đánh giá độ chắc chắn ---
            predicted_label = top1_label
            predicted_class = top1_idx
            confidence = top1_conf

            if diff < 0.05:
                predicted_label = "?"
                predicted_class = -1

            processing_time = time.time() - start_time
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            print(f"--- Metrics for {self.model_type} ---")
            print(f"Timestamp: {timestamp}")
            print(f"Model Type: {self.model_type}")
            print(f"Processing Time: {processing_time:.3f} seconds")
            print(f"Confidence: {confidence:.4f}")
            print(f"Top-1: {top1_label} ({top1_conf:.4f})")
            print(f"Top-2: {top2_label} ({top2_conf:.4f})")
            print(f"Top-2 Diff: {diff:.4f}")
            print(f"Predicted Label: {predicted_label}")
            print(f"Class Index: {predicted_class}")
            print("-----------------------------")

            return {
                'text': predicted_label,
                'confidence': confidence,
                'class_index': predicted_class,
                'top_1_label': top1_label,
                'top_2_label': top2_label
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                'text': '',
                'confidence': 0.0,
                'class_index': -1,
                'error': str(e),
                'top_1_label': '',
                'top_2_label': ''
            }

# Khởi tạo model
ocr_model = OCRModel()

@app.route('/load-model', methods=['POST'])
def load_model():
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = {}

        model_type = data.get("model", "CNN")
        success = ocr_model.load_model(model_type)

        return jsonify({
            'success': success,
            'message': f'Model {model_type} loaded successfully' if success else 'Failed to load model',
            'current_model': model_type if success else None
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'current_model': None
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': ocr_model.loaded,
        'current_model': ocr_model.model_type,
    })

@app.route('/extract-text', methods=['POST'])
def extract_text():
    """Extract text from image"""
    try:
        if not ocr_model.loaded:
            if not ocr_model.load_model():
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded and failed to load'
                }), 500

        config = request.json.get('config', {
            'enhanceImage': True,
            'postProcess': False,
            'model': 'CNN'
        })
        ocr_model.load_model(config.get('model', 'CNN'))

        if 'image_base64' in request.json:
            image_data = base64.b64decode(request.json['image_base64'])
            image = Image.open(io.BytesIO(image_data))
            # Lưu ảnh gốc vào thư mục original/
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            original_path = f"original/input_{timestamp}.png"
            image.save(original_path)
            print(f"[Server] Đã lưu ảnh gốc vào: {original_path}")
        elif 'image' in request.files:
            file = request.files['image']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            image = Image.open(file.stream)
        else:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400

        result = ocr_model.predict(image, config)

        return jsonify({
            'success': True,
            'result': result
        })

    except Exception as e:
        print(f"Error in extract_text: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/extract-text-file', methods=['POST'])
def extract_text_file():
    """Extract text from uploaded file"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        enhance_image = request.form.get('enhanceImage', 'true').lower() == 'true'
        post_process = request.form.get('postProcess', 'false').lower() == 'true'

        config = {
            'enhanceImage': enhance_image,
            'postProcess': post_process
        }

        image = Image.open(file.stream)
        result = ocr_model.predict(image, config)

        return jsonify({
            'success': True,
            'result': result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Khởi động server...")
    ip = get_local_ip()
    print(f"Flask server đang chạy tại: http://{ip}:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)