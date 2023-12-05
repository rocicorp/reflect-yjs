# `@rocicorp/reflect-yjs`

Store [Yjs](https://yjs.dev) documents in Reflect. Mainly useful for text collaration, but also for use with libraries that know how to talk to Yjs.

## Live Demo

https://type.reflect.net/

## Features

- **Reflect Yjs Provider**: plus right into Yjs as a "provider".
- **Awareness Implementation**: Enables tracking and reflecting user presence and changes.
- **Editor Integration Examples**: Contains practical examples for `codemirror-yjs`, `monaco-yjs`, `tiptap-yjs`.

## Get Started

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
