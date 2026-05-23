@echo off
echo Starting ReBekas Marketplace with Database...
echo.
echo Installing dependencies...
python -m pip install -r requirements.txt -q

echo.
echo Initializing database...
python seed.py

echo.
echo Starting Flask server at http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
echo Demo accounts (untuk testing):
echo - Admin   : admin@example.com  (Pass: 123456)
echo - Penjual : seller@example.com   (Pass: 123456)
echo - Pembeli : buyer@example.com    (Pass: 123456)
echo.
python app.py
pause
