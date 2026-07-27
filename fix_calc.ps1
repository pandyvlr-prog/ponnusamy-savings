$css = Get-Content 'style.css' -Raw

# 1. Animation for overlay & container
$css = $css.Replace('.calc-modal-overlay {', '.calc-modal-overlay {
    align-items: center;
    justify-content: center;')
$css = $css.Replace('.calc-premium-container {', '.calc-premium-container {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;')

# When overlay gets .show, trigger container animation
$showOverlayStr = '.calc-modal-overlay.show {'
$showOverlayReplace = $showOverlayStr + "
    opacity: 1;
    visibility: visible;
}
.calc-modal-overlay.show .calc-premium-container {
    transform: translateY(0) scale(1);
    opacity: 1;"
$css = $css.Replace('.calc-modal-overlay.show {
    opacity: 1;
    visibility: visible;', $showOverlayReplace)

# 2. Fix close button position
$closeBtnStr = 'top: -40px; right: 0;'
$closeBtnReplace = 'top: 20px; right: 20px; z-index: 10;'
$css = $css.Replace($closeBtnStr, $closeBtnReplace)
# Adjust hover color to stand out on glass
$css = $css.Replace('background: rgba(255, 255, 255, 0.1);', 'background: rgba(255, 255, 255, 0.15);')

# 3. Adjust button padding for smaller footprint
$css = $css.Replace('padding: 20px 0;', 'padding: 16px 0;')
$css = $css.Replace('max-width: 420px;', 'max-width: 360px;')

Set-Content 'style.css' -Value $css -NoNewline
