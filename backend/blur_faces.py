import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

try:
    import mediapipe as mp
except ImportError:
    mp = None


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: blur_faces.py <input> <output>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    try:
        rgb_image = np.array(Image.open(input_path).convert("RGB"))
        image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
    except Exception:
        print(f"Unable to read image: {input_path}", file=sys.stderr)
        return 3

    local_model = Path(__file__).resolve().parent / "models" / "haarcascade_frontalface_default.xml"
    media_pipe_model = Path(__file__).resolve().parent / "models" / "blaze_face_short_range.tflite"
    faces = []

    if mp is not None and media_pipe_model.exists():
        try:
            base_options = mp.tasks.BaseOptions(model_asset_path=str(media_pipe_model))
            options = mp.tasks.vision.FaceDetectorOptions(
                base_options=base_options,
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                min_detection_confidence=0.7,
            )
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            with mp.tasks.vision.FaceDetector.create_from_options(options) as face_detector:
                detections = face_detector.detect(mp_image).detections
            for detection in detections:
                if not detection.categories or detection.categories[0].score < 0.75:
                    continue
                box = detection.bounding_box
                faces.append((box.origin_x, box.origin_y, box.width, box.height))
        except Exception as error:
            print(f"MediaPipe detection failed, using Haar fallback: {error}", file=sys.stderr)

    if not faces:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade_path = str(local_model if local_model.exists() else Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml")
        detector = cv2.CascadeClassifier(cascade_path)
        faces = detector.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(30, 30))

    if len(faces) == 0:
        print("No face detected; refusing to create an unblurred guest image", file=sys.stderr)
        return 5

    for x, y, width, height in faces:
        # Sedikit perluasan area agar tepi wajah tidak mudah terlihat.
        padding_x = int(width * 0.12)
        padding_y = int(height * 0.18)
        left = max(0, x - padding_x)
        top = max(0, y - padding_y)
        right = min(image.shape[1], x + width + padding_x)
        bottom = min(image.shape[0], y + height + padding_y)
        region = image[top:bottom, left:right]
        if region.size == 0:
            continue
        kernel = max(15, int(min(region.shape[:2]) / 3) | 1)
        image[top:bottom, left:right] = cv2.GaussianBlur(region, (kernel, kernel), 0)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), image):
        print(f"Unable to write image: {output_path}", file=sys.stderr)
        return 4

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
