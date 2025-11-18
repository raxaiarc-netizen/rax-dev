#!/bin/bash

# Script to replace all "bolt" and "bolt.diy" references with "rax" and "rax.ai"

echo "Replacing bolt-elements- with rax-elements- in TypeScript and TSX files..."
find ./app -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i '' 's/bolt-elements-/rax-elements-/g' {} +

echo "Replacing bolt- className prefixes with rax- in component files..."
find ./app -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i '' 's/className="\([^"]*\)bolt-/className="\1rax-/g' {} +
find ./app -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i '' "s/className='\([^']*\)bolt-/className='\1rax-/g" {} +

echo "Replacing space bolt- with space rax- in classNames..."
find ./app -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i '' 's/ bolt-/ rax-/g' {} +

echo "Replacing remaining bolt-terminal with rax-terminal..."
find ./app -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.scss" \) ! -path "*/node_modules/*" -exec sed -i '' 's/bolt-terminal/rax-terminal/g' {} +

echo "Replacing i-bolt: icon references with i-rax:..."
find ./app -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" -exec sed -i '' 's/i-bolt:/i-rax:/g' {} +

echo "Replacing remaining bolt.diy references with rax.ai..."
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.html" -o -name "*.txt" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" -exec sed -i '' 's/bolt\.diy/rax.ai/g' {} +

echo "Replacing Bolt with Rax in product names (careful replacements)..."
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) ! -path "*/node_modules/*" ! -path "*/.git/*" -exec sed -i '' 's/Bolt Local/Rax Local/g' {} +

echo "Done! All replacements completed."
echo "Please review the changes and test the application."
