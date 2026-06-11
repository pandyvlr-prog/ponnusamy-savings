const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const target = `                                <div style="display: flex; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(48,209,88,0.2); padding-top: 8px;">
                                    <div style="flex: 1; text-align: center; background: rgba(234, 88, 12, 0.1); color: #ea580c; border: 1px solid rgba(234, 88, 12, 0.2); border-radius: 4px; font-size: 0.85rem; font-weight: 700; padding: 4px 2px;">
                                        CASH <br> <span id="stat-summary-collected-cash" style="font-size: 1.1rem; font-weight: 800;">₹0</span>
                                    </div>
                                    <div style="flex: 1; text-align: center; background: rgba(147, 51, 234, 0.1); color: #9333ea; border: 1px solid rgba(147, 51, 234, 0.2); border-radius: 4px; font-size: 0.85rem; font-weight: 700; padding: 4px 2px;">
                                        GPAY <br> <span id="stat-summary-collected-gpay" style="font-size: 1.1rem; font-weight: 800;">₹0</span>
                                    </div>
                                </div>`;

const replacement = `                                <div style="display: flex; gap: 8px; margin-top: 10px; border-top: 1px solid rgba(48,209,88,0.2); padding-top: 8px;">
                                    <div style="flex: 1; text-align: center; background: rgba(234, 88, 12, 0.08); color: #ea580c; border: 1px solid rgba(234, 88, 12, 0.2); border-radius: 6px; font-size: 0.85rem; font-weight: 700; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <!-- Cash Banknote SVG Logo -->
                                            <svg width="18" height="12" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                                                <rect x="0.5" y="0.5" width="23" height="15" rx="1.5" fill="#22c55e" stroke="#15803d" stroke-width="1"/>
                                                <rect x="2" y="2" width="20" height="12" rx="1" fill="none" stroke="#16a34a" stroke-width="0.75"/>
                                                <circle cx="5" cy="8" r="1.5" fill="#15803d"/>
                                                <circle cx="19" cy="8" r="1.5" fill="#15803d"/>
                                                <circle cx="12" cy="8" r="3.5" fill="#15803d"/>
                                                <text x="12" y="10.8" font-family="sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">₹</text>
                                            </svg>
                                            CASH
                                        </div>
                                        <span id="stat-summary-collected-cash" style="font-size: 1.1rem; font-weight: 800;">₹0</span>
                                    </div>
                                    <div style="flex: 1; text-align: center; background: rgba(66, 133, 244, 0.08); color: #4285F4; border: 1px solid rgba(66, 133, 244, 0.2); border-radius: 6px; font-size: 0.85rem; font-weight: 700; padding: 6px 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <!-- GPay SVG Logo -->
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                            </svg>
                                            GPAY
                                        </div>
                                        <span id="stat-summary-collected-gpay" style="font-size: 1.1rem; font-weight: 800;">₹0</span>
                                    </div>
                                </div>`;

// Normalize content and target line endings to match
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Success: GPay and Cash boxes updated in index.html.");
} else {
    console.error("Error: Target content not found in index.html.");
}
