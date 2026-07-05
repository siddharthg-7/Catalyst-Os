import sys
import os
import json
import subprocess

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: speak.py <text> <output_path> [model_path]"}))
        sys.exit(1)
        
    text = sys.argv[1]
    output_path = sys.argv[2]
    
    # Piper path and model config
    piper_path = os.getenv("PIPER_PATH", "backend/tools/piper/piper.exe")
    model_path = sys.argv[3] if len(sys.argv) > 3 else os.getenv("PIPER_MODEL", "backend/tools/piper/en_US-amy-medium.onnx")
    
    # Ensure directory of output path exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    # Try executing piper directly
    try:
        # Piper takes text on stdin
        process = subprocess.Popen(
            [piper_path, "--model", model_path, "--output_file", output_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode == 0 and os.path.exists(output_path):
            print(json.dumps({"success": True, "output_file": output_path}))
        else:
            print(json.dumps({
                "error": f"Piper execution failed: {stderr or stdout}",
                "fallback": True
            }))
            sys.exit(0)
    except FileNotFoundError:
        print(json.dumps({
            "error": f"Piper executable not found at '{piper_path}'. Please install Piper or update PIPER_PATH in your .env configuration.",
            "fallback": True
        }))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
