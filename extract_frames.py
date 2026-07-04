import os
import cv2
from PIL import Image

def extract_frames(video_path, output_dir, target_fps=30):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f"Opening video: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: OpenCV could not open {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video FPS: {fps}, Total Frames: {total_frames}")

    count = 0
    saved_count = 0
    step = max(1, int(fps / target_fps))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if count % step == 0:
            saved_count += 1
            filename = os.path.join(output_dir, f"frame_{saved_count:04d}.webp")
            
            # Convert BGR (OpenCV) to RGB (PIL)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(rgb_frame)
            # Save compressed WebP image
            img.save(filename, "WEBP", quality=85)

            if saved_count % 20 == 0:
                print(f"Extracted {saved_count} frames...")

        count += 1

    cap.release()
    print(f"Successfully extracted {saved_count} frames into {output_dir}")

if __name__ == "__main__":
    video_file = os.path.abspath(os.path.join("assets", "founder_video.mp4"))
    output_folder = os.path.abspath(os.path.join("public", "frames"))
    extract_frames(video_file, output_folder, target_fps=24)
