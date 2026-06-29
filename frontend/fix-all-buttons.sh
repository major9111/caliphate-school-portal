#!/bin/bash
# This script adds type="button" to all Button components that don't have type="submit"

# Find all .tsx files in src/pages
find src/pages -name "*.tsx" -type f -exec sed -i 's/<Button /<Button type="button" /g' {} \;

# Fix double type attributes (type="button" type="submit")
find src/pages -name "*.tsx" -type f -exec sed -i 's/type="button" type="submit"/type="submit"/g' {} \;

echo "✅ All buttons fixed"
