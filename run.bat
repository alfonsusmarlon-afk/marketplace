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
echo - budi@example.com / password123
echo - dewi@example.com / password123
echo - toko@example.com / password123
echo.
python app.py
pause
