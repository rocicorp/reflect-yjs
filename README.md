# `@rocicorp/reflect-yjs`

## Overview

`@rocicorp/reflect-yjs` is a repository designed to demonstrate the integration of Yjs with Reflect. It provides a Reflect Yjs provider and implements awareness functionality. This repository includes examples for integrating Yjs with various editors like CodeMirror, Monaco and tiptap.

## Features

- **Reflect Yjs Provider**: An integration layer between Reflect and Yjs.
- **Awareness Implementation**: Enables tracking and reflecting user presence and changes.
- **Editor Integration Examples**: Contains practical examples for `codemirror-yjs`, `monaco-yjs`, `tiptap-yjs`.

## Getting Started

### Installation

To install `@rocicorp/reflect-yjs`, run the following command:

```bash
npm install @rocicorp/reflect-yjs@latest
```

### Running an Example

To explore an example, such as the CodeMirror integration, follow these steps:

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Build the project**

   ```bash
   npm run build
   ```

3. **Navigate to the example directory**

   ```bash
   cd examples/codemirror
   ```

4. **Start the example**
   ```bash
   npm run watch
   ```

## Publishing Your Project

To publish your project with Reflect and deploy the UI:

1. **Publish the Reflect server**

   ```bash
   npx reflect publish
   ```

2. **Deploy the UI (Example: using Vercel)**
   ```bash
   npx vercel
   ```
