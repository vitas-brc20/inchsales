import os
from PIL import Image, ImageDraw, ImageFont

def generate_icons():
    os.makedirs('public', exist_ok=True)
    
    # 1. Generate icon.svg
    icon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="quoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>
  <!-- Squircle Base -->
  <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.16)" stroke-width="6" filter="url(#shadow)" />
  <!-- Text '1' in pure white -->
  <text x="210" y="340" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="260" font-weight="900" fill="#FFFFFF">1</text>
  <!-- Quote '\"' in electric royal blue -->
  <text x="325" y="270" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="220" font-weight="900" fill="url(#quoteGrad)">"</text>
</svg>'''
    with open('public/icon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    with open('public/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    print("Created public/icon.svg & public/favicon.svg")

    # 2. Generate logo.svg (horizontal logo: icon + inchsales text)
    logo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 140" width="100%" height="100%">
  <defs>
    <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="logoQuoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>
  <!-- Icon Squircle -->
  <rect x="10" y="15" width="110" height="110" rx="28" fill="url(#logoBgGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
  <text x="54" y="90" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="62" font-weight="900" fill="#FFFFFF">1</text>
  <text x="82" y="74" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="url(#logoQuoteGrad)">"</text>
  
  <!-- Text inchsales -->
  <text x="145" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="60" font-weight="900" letter-spacing="-1.5">
    <tspan fill="#0f172a">inch</tspan><tspan fill="#2563eb">sales</tspan>
  </text>
  <text x="148" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#64748b" letter-spacing="0.5">
    크리에이터를 위한 1초 쇼핑 링크 &amp; 실시간 정산
  </text>
</svg>'''
    with open('public/logo.svg', 'w', encoding='utf-8') as f:
        f.write(logo_svg)
    print("Created public/logo.svg")

    # 3. High-Res PNG generation (1024x1024 supersampled, downscaled for maximum crispness)
    scale = 2
    canvas_size = 512 * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = 24 * scale
    corner_radius = 116 * scale
    # Rounded background
    draw.rounded_rectangle(
        [pad, pad, canvas_size - pad, canvas_size - pad],
        radius=corner_radius,
        fill=(15, 23, 42, 255),
        outline=(255, 255, 255, 40),
        width=4 * scale
    )

    font_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    font_1 = ImageFont.truetype(font_path, 260 * scale)
    font_q = ImageFont.truetype(font_path, 220 * scale)

    b1 = font_1.getbbox('1')
    w1 = b1[2] - b1[0]
    h1 = b1[3] - b1[1]

    bq = font_q.getbbox('\"')
    wq = bq[2] - bq[0]
    hq = bq[3] - bq[1]

    gap = 8 * scale
    total_w = w1 + wq + gap
    start_x = (canvas_size - total_w) // 2
    center_y = (canvas_size - h1) // 2

    # Draw '1' in white
    draw.text((start_x - b1[0], center_y - b1[1]), '1', fill=(255, 255, 255, 255), font=font_1)
    # Draw '\"' in vibrant blue
    draw.text((start_x + w1 + gap - bq[0], center_y - b1[1] - (25 * scale)), '\"', fill=(59, 130, 246, 255), font=font_q)

    # Downsample with Lanczos filter for beautiful anti-aliasing
    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save('public/icon-512.png', 'PNG')
    icon_512.save('public/icon.png', 'PNG')

    icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save('public/icon-192.png', 'PNG')

    apple_icon = img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save('public/apple-touch-icon.png', 'PNG')

    fav_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    fav_32.save('public/favicon-32x32.png', 'PNG')

    fav_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
    fav_16.save('public/favicon-16x16.png', 'PNG')

    # Multi-resolution favicon.ico
    fav_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    fav_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
    fav_32.save(
        'public/favicon.ico',
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
        append_images=[fav_16, fav_48, fav_64]
    )
    print("Created public/icon.png, public/icon-512.png, public/icon-192.png, public/apple-touch-icon.png, public/favicon.ico")

    # 4. Generate horizontal logo PNG (600x140)
    logo_w = 600 * scale
    logo_h = 140 * scale
    logo_img = Image.new('RGBA', (logo_w, logo_h), (0, 0, 0, 0))
    logo_draw = ImageDraw.Draw(logo_img)

    # Icon box
    ibox_x = 10 * scale
    ibox_y = 15 * scale
    ibox_size = 110 * scale
    logo_draw.rounded_rectangle(
        [ibox_x, ibox_y, ibox_x + ibox_size, ibox_y + ibox_size],
        radius=28 * scale,
        fill=(15, 23, 42, 255),
        outline=(255, 255, 255, 30),
        width=2 * scale
    )

    logo_f1 = ImageFont.truetype(font_path, 64 * scale)
    logo_fq = ImageFont.truetype(font_path, 54 * scale)
    b_l1 = logo_f1.getbbox('1')
    b_lq = logo_fq.getbbox('\"')
    
    lw_total = (b_l1[2] - b_l1[0]) + (b_lq[2] - b_lq[0]) + 4 * scale
    lx_start = ibox_x + (ibox_size - lw_total) // 2
    ly_start = ibox_y + (ibox_size - (b_l1[3] - b_l1[1])) // 2

    logo_draw.text((lx_start - b_l1[0], ly_start - b_l1[1]), '1', fill=(255, 255, 255, 255), font=logo_f1)
    logo_draw.text((lx_start + (b_l1[2] - b_l1[0]) + 4 * scale - b_lq[0], ly_start - b_l1[1] - 8 * scale), '\"', fill=(59, 130, 246, 255), font=logo_fq)

    # Text inchsales
    logo_font_text = ImageFont.truetype(font_path, 56 * scale)
    logo_font_sub = ImageFont.truetype(font_path, 16 * scale)

    tx_start = 145 * scale
    ty_start = 32 * scale
    
    b_inch = logo_font_text.getbbox('inch')
    w_inch = b_inch[2] - b_inch[0]
    logo_draw.text((tx_start, ty_start), 'inch', fill=(15, 23, 42, 255), font=logo_font_text)
    logo_draw.text((tx_start + w_inch + 2 * scale, ty_start), 'sales', fill=(37, 99, 235, 255), font=logo_font_text)

    logo_draw.text((tx_start, ty_start + 65 * scale), '크리에이터를 위한 1초 쇼핑 링크 & 실시간 정산', fill=(100, 116, 139, 255), font=logo_font_sub)

    final_logo = logo_img.resize((600, 140), Image.Resampling.LANCZOS)
    final_logo.save('public/logo.png', 'PNG')
    print("Created public/logo.png")

if __name__ == '__main__':
    generate_icons()
