#!/bin/bash
sed -i 's/activeWindow/globalThis.window/g' e2e/fixtures/obsidian.ts
