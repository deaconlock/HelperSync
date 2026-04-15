@echo off
cd /d "c:\Users\Deacon\OneDrive\Desktop\HelperSync"
git add src/ public/
git diff --cached --quiet && exit /b 0
git commit -m "autosave: %date% %time%"
git push origin main
