import os
from PIL import Image, ImageDraw, ImageFont

def generate_icon(size):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    bg_color = (45, 45, 45, 255) # Dark gray screen
    accent_color = (74, 158, 255, 255) # #4A9EFF

    # Dimensions
    padding = size // 8
    screen_width = size - padding * 2
    screen_height = int(screen_width * 0.75)
    
    x0 = padding
    y0 = padding + (size - padding * 2 - screen_height) // 2
    x1 = size - padding
    y1 = y0 + screen_height

    # Draw rounded rectangle for the screen
    radius = size // 10
    draw.rounded_rectangle([x0, y0, x1, y1], radius, fill=bg_color, outline=accent_color, width=max(1, size // 20))

    # Add the symbol. Since Pillow doesn't always have a good font for ⟳ readily available in all systems
    # Let's just draw an A and an arrow or a simple shape, or try to load a default font
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(screen_height * 0.6))
        text = "A" # Use 'A' for Asyncron if ⟳ is hard to render
    except:
        font = ImageFont.load_default()
        text = "A"

    # Pillow 10+ handles text anchors well, but we can do it manually for compatibility
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    
    text_x = x0 + (screen_width - w) / 2
    text_y = y0 + (screen_height - h) / 2 - (size // 20) # Slight vertical adjustment

    draw.text((text_x, text_y), text, font=font, fill=accent_color)

    # Save to file
    filename = f"icon{size}.png"
    filepath = os.path.join(os.path.dirname(__file__), filename)
    img.save(filepath, "PNG")
    print(f"Generated {filepath}")

for s in [16, 48, 128]:
    generate_icon(s)
