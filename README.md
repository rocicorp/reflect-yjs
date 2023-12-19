# `reflect-yjs`

This library enables collaborative text editing in [Reflect](https://reflect.net/) via [Yjs](https://yjs.dev/).

Live demo at https://type.reflect.net/.

## Features

- **Awareness**: A robust implementation of Yjs "awareness" is included. Awareness is correctly cleaned up in all cases including tab-close, tab/browser-crash, navigation, tab-switch, offline, etc.
- **Multiple Documents**: A single Reflect room can host any number of Yjs documents efficiently.
- **Chunking**: Large Yjs documents are automatically broken down into smaller pieces for efficient incremental updates.
- **Validation**: Easily run custom validation on the server-side to filter profanity, enforce max length, or any other constraint you need.
- **Editor Integration Examples**: Contains practical examples for `codemirror-yjs`, `monaco-yjs`, `tiptap-yjs`.

## Getting Started

See https://hello.reflect.net/how/text

### Running an Example

To explore an example, such as the CodeMirror integration, follow these steps:

1. Clone this repository

   ```bash
   git clone git@github.com:rocicorp/reflect-yjs.git
   cd reflect-yjs
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Navigate to the example directory**

   ```bash
   cd examples/codemirror
   ```

5. **Start the example**
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
