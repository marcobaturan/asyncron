import os
from PIL import Image

def resize_logo(logo_path, output_dir):
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found.")
        return

    img = Image.open(logo_path)
    
    sizes = [16, 48, 128]
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        filename = f"icon{size}.png"
        filepath = os.path.join(output_dir, filename)
        resized.save(filepath, "PNG")
        print(f"Generated {filepath}")

# Update Chrome icons
chrome_icons_dir = "/home/marco/Projects/portfolio/asyncron/asyncron-chrome/icons"
resize_logo("/home/marco/Projects/portfolio/asyncron/assets/logo.png", chrome_icons_dir)

# Update Firefox icons
firefox_icons_dir = "/home/marco/Projects/portfolio/asyncron/asyncron-firefox/icons"
resize_logo("/home/marco/Projects/portfolio/asyncron/assets/logo.png", firefox_icons_dir)
