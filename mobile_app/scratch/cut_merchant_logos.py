from PIL import Image, ImageDraw
import os

configs = [
    {
        'name': 'foodpanda.png',
        'src': r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\FOOD PANDA LOGO.png',
        'cx': 511.5, 'cy': 498.0, 'radius': 363.0
    },
    {
        'name': 'gotyme.png',
        'src': r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\GOTYME LOGO.png',
        'cx': 511.5, 'cy': 511.5, 'radius': 408.0
    },
    {
        'name': 'grab.png',
        'src': r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\GRAB LOGO.png',
        'cx': 511.5, 'cy': 511.5, 'radius': 509.0
    },
    {
        'name': 'mcdo.png',
        'src': r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\MCDO LOGO.png',
        'cx': 511.5, 'cy': 511.5, 'radius': 508.0
    },
    {
        'name': 'starbucks.png',
        'src': r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\STARBUCKS LOGO.png',
        'cx': 599.5, 'cy': 595.0, 'radius': 532.0
    },
]

out_dir = r'c:\Users\LEGION\Documents\Pawi-FinancialTracker\mobile_app\public\logos'
os.makedirs(out_dir, exist_ok=True)

for cfg in configs:
    im = Image.open(cfg['src']).convert('RGBA')
    cx, cy, r = cfg['cx'], cfg['cy'], cfg['radius']
    
    x0, y0, x1, y1 = cx - r, cy - r, cx + r, cy + r
    cropped = im.crop((int(x0), int(y0), int(x1), int(y1)))
    cw, ch = cropped.size
    
    scale = 4
    mask = Image.new('L', (cw * scale, ch * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, cw * scale - 1, ch * scale - 1), fill=255)
    mask = mask.resize((cw, ch), Image.Resampling.LANCZOS)
    
    cropped.putalpha(mask)
    final = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    dest = os.path.join(out_dir, cfg['name'])
    final.save(dest, format='PNG')
    print("Cleanly saved:", cfg['name'])
