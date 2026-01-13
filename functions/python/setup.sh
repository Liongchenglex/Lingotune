#!/bin/bash
# Setup script for Python Cloud Functions
# Installs dependencies for local development and testing

set -e  # Exit on error

echo "=================================="
echo "Python Cloud Functions Setup"
echo "=================================="
echo ""

# Check Python version
echo "[1/5] Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $PYTHON_VERSION installed"
echo ""

# Check Java (required for KoNLPy)
echo "[2/5] Checking Java installation..."
if java -version 2>&1 >/dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "✓ Java installed: $JAVA_VERSION"
else
    echo "❌ Java not found"
    echo "Installing OpenJDK 11 via Homebrew..."
    brew install openjdk@11

    # Set JAVA_HOME
    echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@11' >> ~/.zshrc
    export JAVA_HOME=/opt/homebrew/opt/openjdk@11
    echo "✓ Java installed"
fi
echo ""

# Create virtual environment
echo "[3/5] Creating Python virtual environment..."
cd "$(dirname "$0")"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate and install dependencies
echo "[4/5] Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Test KoNLPy installation
echo "[5/5] Testing KoNLPy installation..."
python3 -c "from konlpy.tag import Okt; okt = Okt(); print('✓ KoNLPy Okt tokenizer initialized successfully')" || {
    echo "❌ KoNLPy test failed"
    echo "Troubleshooting:"
    echo "1. Ensure Java is installed: java -version"
    echo "2. Set JAVA_HOME: export JAVA_HOME=\$(dirname \$(dirname \$(which java)))"
    echo "3. Reinstall JPype1: pip install --upgrade JPype1"
    exit 1
}
echo ""

echo "=================================="
echo "✓ Setup complete!"
echo "=================================="
echo ""
echo "To activate the virtual environment:"
echo "  source functions/python/venv/bin/activate"
echo ""
echo "To test modules:"
echo "  python tokenizer.py"
echo "  python vocabulary.py"
echo "  python grammar.py"
echo "  python pronunciation.py"
echo ""
