#!/usr/bin/env node
/**
 * Config Converter: MementoConfig7.js → memento_config.json
 *
 * Converts JavaScript IIFE config module to JSON for Python MCP server.
 * Run: node scripts/convert_config.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔄 Converting MementoConfig7.js to JSON...\n');

// Paths
const configJsPath = path.join(__dirname, '../../core/MementoConfig7.js');
const configJsonPath = path.join(__dirname, '../config/memento_config.json');

// Check if source exists
if (!fs.existsSync(configJsPath)) {
    console.error(`❌ Error: MementoConfig7.js not found at ${configJsPath}`);
    process.exit(1);
}

try {
    // Load JavaScript code
    console.log(`📖 Reading ${configJsPath}...`);
    const code = fs.readFileSync(configJsPath, 'utf8');

    // Execute in sandbox
    console.log('⚙️  Executing JavaScript in sandbox...');
    const sandbox = {
        console: console  // Allow console.log from config if needed
    };
    vm.runInNewContext(code, sandbox);

    // Extract config
    if (!sandbox.MementoConfig || typeof sandbox.MementoConfig.getConfig !== 'function') {
        throw new Error('MementoConfig or getConfig() not found in executed code');
    }

    console.log('📦 Extracting configuration...');
    const config = sandbox.MementoConfig.getConfig();

    // Validate extracted config
    if (!config.version) {
        throw new Error('Config missing version field');
    }

    if (!config.libraries || typeof config.libraries !== 'object') {
        throw new Error('Config missing libraries section');
    }

    if (!config.fields || typeof config.fields !== 'object') {
        throw new Error('Config missing fields section');
    }

    // Statistics
    const stats = {
        version: config.version,
        libraries: Object.keys(config.libraries).length,
        fieldCategories: Object.keys(config.fields).length,
        totalFields: Object.values(config.fields).reduce((sum, category) => {
            return sum + (typeof category === 'object' ? Object.keys(category).length : 0);
        }, 0),
        constants: config.constants ? Object.keys(config.constants).length : 0,
        icons: config.icons ? Object.keys(config.icons).length : 0,
        attributes: config.attributes ? Object.keys(config.attributes).length : 0
    };

    console.log('\n📊 Configuration Statistics:');
    console.log(`   Version: ${stats.version}`);
    console.log(`   Libraries: ${stats.libraries}`);
    console.log(`   Field Categories: ${stats.fieldCategories}`);
    console.log(`   Total Fields: ${stats.totalFields}`);
    console.log(`   Constants: ${stats.constants}`);
    console.log(`   Icons: ${stats.icons}`);
    console.log(`   Attributes: ${stats.attributes}`);

    // Write JSON
    console.log(`\n💾 Writing to ${configJsonPath}...`);

    // Ensure config directory exists
    const configDir = path.dirname(configJsonPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Write with pretty formatting
    fs.writeFileSync(
        configJsonPath,
        JSON.stringify(config, null, 2),
        'utf8'
    );

    // Verify written file
    const fileSize = fs.statSync(configJsonPath).size;
    console.log(`   File size: ${(fileSize / 1024).toFixed(2)} KB`);

    console.log('\n✅ Conversion successful!');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review ${configJsonPath}`);
    console.log(`   2. Commit to git: git add config/memento_config.json`);
    console.log(`   3. Start MCP server: python -m src.server`);

} catch (error) {
    console.error('\n❌ Conversion failed!');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
        console.error(`\n   Stack trace:\n${error.stack}`);
    }
    process.exit(1);
}
