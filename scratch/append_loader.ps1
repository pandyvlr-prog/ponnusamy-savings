$html = @"

    <!-- Premium PDF Loading Overlay -->
    <div id="pdf-loading-overlay" class="pdf-loading-backdrop" style="display: none;">
        <div class="pdf-loading-card material-card">
            <div class="pdf-loading-icon-wrapper">
                <i data-lucide="file-text" class="pdf-loading-icon"></i>
                <div class="pdf-loading-spinner-ring"></div>
            </div>
            <h3 class="pdf-loading-title">Generating Document...</h3>
            <p class="pdf-loading-subtitle">Please wait while we render your beautiful PDF</p>
            <div class="pdf-progress-bar-container">
                <div class="pdf-progress-bar-fill"></div>
            </div>
        </div>
    </div>
</body>
"@

$content = Get-Content 'index.html' -Raw
$content = $content -replace '</body>', $html
Set-Content 'index.html' $content -Encoding UTF8

$css = @"

/* Premium PDF Loading Overlay */
.pdf-loading-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    animation: fadeIn 0.3s forwards;
}

.pdf-loading-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    padding: 40px;
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    text-align: center;
    width: 90%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateY(20px);
    animation: slideUpFade 0.4s 0.1s forwards cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0;
}

.pdf-loading-icon-wrapper {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
}

.pdf-loading-icon {
    width: 32px;
    height: 32px;
    color: var(--blue-main, #3b82f6);
    z-index: 2;
    animation: pulseIcon 2s infinite;
}

.pdf-loading-spinner-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top: 3px solid var(--blue-main, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.pdf-loading-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-main, #111827);
    margin-bottom: 8px;
    letter-spacing: -0.5px;
}

.pdf-loading-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary, #64748b);
    margin-bottom: 24px;
    line-height: 1.5;
}

.pdf-progress-bar-container {
    width: 100%;
    height: 6px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 99px;
    overflow: hidden;
    position: relative;
}

.pdf-progress-bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 30%;
    background: linear-gradient(90deg, var(--blue-main, #3b82f6), #60a5fa);
    border-radius: 99px;
    animation: progressFill 2s infinite ease-in-out;
}

@keyframes progressFill {
    0% { width: 0%; left: 0; }
    50% { width: 40%; left: 30%; }
    100% { width: 100%; left: 100%; }
}

@keyframes pulseIcon {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes slideUpFade {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}
"@

Add-Content -Path 'style.css' -Value $css -Encoding UTF8
