import sys
import os
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)
        
    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found at {audio_path}"}))
        sys.exit(1)
        
    try:
        from faster_whisper import WhisperModel
        # Use WHISPER_MODEL env or default to 'small'
        model_size = os.getenv("WHISPER_MODEL", "small")
        
        # Run on CPU with int8 quantization to avoid high memory/CPU usage
        # This works out of the box on standard developer machines.
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        segments, info = model.transcribe(audio_path, beam_size=5)
        text = " ".join([segment.text for segment in segments]).strip()
        
        print(json.dumps({
            "text": text,
            "language": info.language,
            "probability": info.language_probability
        }))
    except ImportError:
        print(json.dumps({
            "error": "faster-whisper library is not installed. Please run 'pip install faster-whisper' inside the backend virtual environment.",
            "fallback": True
        }))
        sys.exit(0)  # Exit with 0 so the typescript service can parse the JSON error payload
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
