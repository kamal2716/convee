# convee desktop

A native, local-first desktop file converter built with Electron. This is a desktop application, not a hosted website. Running it opens a desktop window and lets users choose files or drag them in from File Explorer.

## Run on your computer

1. Install **Node.js 20+**.
2. Clone/download this repository.
3. Open a terminal in the project folder.
4. Run:

```bash
npm install
npm start
```

To build an installer:

```bash
npm run dist
```

Windows installers and a portable build are written to `release/`.

## Built-in conversions in this first MVP

- Images: PNG, JPEG, WebP, AVIF and TIFF (Sharp).
- Text-like files: TXT, Markdown, HTML, JSON, CSV and XML (basic text/markup transforms).
- PDF: load and rewrite PDF structure (pdf-lib).

Files are processed locally and output is saved beside the original. The app does not upload user files.

## Expanding format support

The conversion engine is modular in `src/converter.js`. Office/HWP, video/audio, archives, CAD, fonts, 3D and geospatial formats need dedicated engines and format-specific handling. Common optional engines include LibreOffice, FFmpeg, ImageMagick, Ghostscript, Pandoc, 7-Zip and GDAL. They are not bundled or silently assumed to be installed. Add adapters and availability checks before advertising those conversions as supported.

## Security

- Renderer has no Node integration.
- Context isolation and sandbox are enabled.
- File operations are exposed through a narrow preload API.
- Conversion happens on the local machine.

## License

MIT.
