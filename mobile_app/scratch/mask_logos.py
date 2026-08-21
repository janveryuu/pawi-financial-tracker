from PIL import Image, ImageDraw
import numpy as np
import os

base_dir = r"c:\Users\LEGION\Documents\Pawi-FinancialTracker\temp_fixed_logos\stitch_globe_icon_design"
out_dir = r"c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public\logos"
os.makedirs(out_dir, exist_ok=True)

# Perfectly trimmed radius for 100% pure circle and 0 edge noise
logo_radii = {
    "bdo": ("remove_all_background_and_whitespace_outside_of_the_blue_bdo_circle._the_final", 408),
    "gcash": ("remove_all_background_and_whitespace_outside_of_the_blue_gcash_circle._the", 410),
    "rcbc": ("remove_all_background_and_whitespace_outside_of_the_blue_rbc_circle._the_final", 408),
    "wise": ("remove_all_background_and_whitespace_outside_of_the_green_wise_circle._the", 410),
    "bpi": ("remove_all_background_and_whitespace_outside_of_the_maroon_bpi_circle._the", 398),
    "unionbank": ("remove_all_background_and_whitespace_outside_of_the_orange_circle._the_final", 410),
    "netflix": ("remove_the_checkerboard_background_outside_of_the_black_netflix_circle._the", 390),
}

for name, (folder, r) in logo_radii.items():
    img_path = os.path.join(base_dir, folder, "screen.png")
    if not os.path.exists(img_path):
        continue
    
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    cx, cy = w / 2.0, h / 2.0
    
    # 4x supersampled mask for ultra-smooth antialiased edge
    scale = 4
    mask = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)
    bbox = [
        (cx - r) * scale,
        (cy - r) * scale,
        (cx + r) * scale,
        (cy + r) * scale,
    ]
    draw.ellipse(bbox, fill=255)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    
    # Apply alpha mask
    img.putalpha(mask)
    
    # Crop to circle bounding box (square)
    crop_box = (
        max(0, int(cx - r - 2)),
        max(0, int(cy - r - 2)),
        min(w, int(cx + r + 2)),
        min(h, int(cy + r + 2)),
    )
    cropped = img.crop(crop_box)
    
    out_path = os.path.join(out_dir, f"{name}.png")
    cropped.save(out_path, "PNG")
    print(f"Saved clean {name}.png ({cropped.size})")

print("All logos perfected!")
