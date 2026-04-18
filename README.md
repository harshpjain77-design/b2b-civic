# Jansampark AI Pipeline

Python-first reference implementation for a mobile-ready civic issue AI pipeline used by Jansampark.

## What is included

- `jansampark_ai/training/`: detector and waste-classifier training entrypoints
- `jansampark_ai/export/`: TensorFlow Lite export pipelines with artifact packaging
- `jansampark_ai/validation/`: authenticity checks, dHash generation, and duplicate detection
- `jansampark_ai/backend/`: cloud verification merge logic and Firestore persistence
- `jansampark_ai/routing/`: Firestore-backed department routing
- `mobile_reference/`: Flutter reference services for `tflite_flutter`
- `tests/`: unit and integration-style tests for core logic

## Quick start

1. Create a virtual environment and install `requirements.txt`.
2. Fill in dataset paths in `configs/detector.yaml` and `configs/classifier.yaml`.
3. Train the models.
4. Export quantized `.tflite` artifacts.
5. Plug the backend verification flow into Vertex AI and Firestore.

## Public Python API

- `train_detector(config_path: str) -> str`
- `train_waste_classifier(config_path: str) -> str`
- `export_detector_tflite(weights_path: str, export_config: str) -> str`
- `export_classifier_tflite(weights_path: str, export_config: str) -> str`
- `score_authenticity(image_path: str, exif_dict: dict) -> AuthenticityFlags`
- `find_duplicate(image_hash: str, lat: float, lon: float, firestore_client) -> Optional[str]`
- `validate_report(payload: SubmissionPayload, firestore_client, vertex_client) -> VerificationResponse`
- `route_issue(label: str, firestore_client) -> str`

## Notes

- Ultralytics and TensorFlow imports are lazy so the non-training parts of the project can still run in lighter environments.
- Detector export includes a fallback path so the pipeline can swap from `YOLO26` to `YOLO11` if TFLite export stability requires it.
