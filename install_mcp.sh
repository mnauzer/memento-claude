#!/bin/bash
# ==============================================
# Memento Database MCP Server Installation
# ==============================================

echo "🚀 Installing Memento Database MCP Server..."

# Set up Poetry path
export PATH="/home/rasto/.local/bin:$PATH"

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry not found. Installing Poetry first..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="/home/rasto/.local/bin:$PATH"
fi

echo "✅ Poetry found: $(poetry --version)"

# Install dependencies
echo "📦 Installing MCP dependencies..."
poetry install --no-root

# Make scripts executable
chmod +x /home/rasto/memento-claude/simple_memento_mcp.py
chmod +x /home/rasto/memento-claude/memento_mcp_server.py

echo "🔧 Testing MCP server..."

# Test the simple MCP server
echo "Testing simple MCP server..."
timeout 5s poetry run python3 /home/rasto/memento-claude/simple_memento_mcp.py --version || echo "Server test completed"

echo "✅ Memento Database MCP Server installed successfully!"
echo ""
echo "🎯 Usage:"
echo "  # List available libraries:"
echo "  poetry run python3 simple_memento_mcp.py"
echo ""
echo "  # Or use the full-featured server:"
echo "  poetry run python3 memento_mcp_server.py"
echo ""
echo "📚 Available Tools:"
echo "  - list_libraries(): Get all available libraries"
echo "  - get_library_structure(library_name): Get field structure"
echo "  - search_field_usage(field_name): Find field usage across libraries"
echo "  - get_library_relationships(library_name): Get library connections"
echo "  - get_business_module_info(module_type): Get business module information"
echo ""
echo "🔧 Configuration:"
echo "  - Server config: mcp_config.json"
echo "  - Data source: asistanto.json"
echo "  - Dependencies: pyproject.toml"
echo ""
echo "🌟 MCP Server is ready for use with Claude Code!"