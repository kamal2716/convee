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

## Built-in conversions

- Images: PNG, JPEG, WebP, AVIF and TIFF (Sharp).
- Text-like files: TXT, Markdown, HTML, JSON, CSV and XML (basic text/markup transforms).
- PDF: load and rewrite PDF structure (pdf-lib).

Files are processed locally and output is saved beside the original. The app does not upload user files.

## Optional local engines

The floating format donut is an experimental desktop interaction. On Windows, hold Ctrl while dragging with the left mouse button. macOS uses Option; Linux uses Ctrl. The native input hook and transparent overlay require testing on each operating system and desktop environment.

- LibreOffice: compatible Writer, Calc and Impress conversions.
- FFmpeg: audio/video conversions.
- 7-Zip: detected, but archive-to-archive conversion is not yet exposed.
- GDAL, Pandoc and Ghostscript: detected for future adapters; not yet exposed as general conversion routes.

Install optional engines separately. Convee does not upload files.

## Current limitations

This is an early desktop MVP, not a 270-format converter yet. HWP/HWPX, e-books, fonts, CAD, 3D models, geospatial conversion, PDF page extraction/merge, crop tools, watch folders and browser-download capture are not implemented. Unsupported pairs are not shown as available.

## Security

- Renderer has no Node integration.
- Context isolation and sandbox are enabled.
- File operations are exposed through a narrow preload API.
- Conversion happens on the local machine.

## License

MIT.
