import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

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
        rgb_image = np.array(ImageOps.exif_transpose(Image.open(input_path)).convert("RGB"))
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
                min_detection_confidence=0.35,
            )
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            with mp.tasks.vision.FaceDetector.create_from_options(options) as face_detector:
                detections = face_detector.detect(mp_image).detections
            for detection in detections:
                if not detection.categories or detection.categories[0].score < 0.40:
                    continue
                box = detection.bounding_box
                faces.append((box.origin_x, box.origin_y, box.width, box.height))
        except Exception as error:
            print(f"MediaPipe detection failed, using Haar fallback: {error}", file=sys.stderr)

    if not faces:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        cascade_directory = Path(cv2.data.haarcascades)
        frontal_path = local_model if local_model.exists() else cascade_directory / "haarcascade_frontalface_default.xml"
        profile_path = cascade_directory / "haarcascade_profileface.xml"

        def detect_with_cascade(cascade_file: Path, source: np.ndarray, scale=1.0):
            detector = cv2.CascadeClassifier(str(cascade_file))
            if detector.empty():
                return []
            found = detector.detectMultiScale(source, scaleFactor=1.05, minNeighbors=3, minSize=(24, 24))
            return [(int(x / scale), int(y / scale), int(width / scale), int(height / scale)) for x, y, width, height in found]

        # Try the original image and enlarged versions because a baby's face
        # can occupy only a small part of a portrait photo.
        for scale in (1.0, 1.5, 2.0, 3.0):
            enlarged = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC) if scale != 1.0 else gray
            faces.extend(detect_with_cascade(frontal_path, enlarged, scale))
            if not faces:
                faces.extend(detect_with_cascade(profile_path, enlarged, scale))
            if faces:
                break

        # A small rotation pass helps with photos where the baby's head is
        # tilted. Coordinates are mapped back to the original image.
        if not faces:
            height, width = gray.shape[:2]
            center = (width // 2, height // 2)
            for angle in (-12, 12):
                matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(gray, matrix, (width, height), borderMode=cv2.BORDER_REPLICATE)
                rotated_faces = detect_with_cascade(frontal_path, rotated)
                inverse = cv2.invertAffineTransform(matrix)
                for x, y, box_width, box_height in rotated_faces:
                    corners = np.array([[x, y], [x + box_width, y + box_height]], dtype=np.float32).reshape(-1, 1, 2)
                    mapped = cv2.transform(corners, inverse).reshape(-1, 2)
                    left, top = np.min(mapped, axis=0).astype(int)
                    right, bottom = np.max(mapped, axis=0).astype(int)
                    faces.append((left, top, right - left, bottom - top))
                if faces:
                    break

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
