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


## Appearance customization

Convee opens with its signature navy, cream and coral palette. Open **Settings → Colour Studio** to change the donut accent, donut surface, app canvas and warm highlight. Each colour has a full-spectrum system colour picker, editable RGB channels and a hex field. The live preview updates as you adjust a value. Donut opacity and cream/navy workspace themes are configurable too.

Appearance preferences are saved locally in the app's user-data folder and synchronized to the floating donut. No colour settings or file data are sent to a server.


## Power tools in progress

The desktop workspace now includes:
- Image crop by normalized crop rectangle, with Sharp processing and output conversion.
- PDF merge, split-into-pages, selected-page extraction and PDF optimization.
- Watch folders using Chokidar with write-completion detection.
- FFmpeg balanced, smaller-file and high-quality video profiles.
- Calibre e-book conversion when `ebook-convert` is installed.
- A Windows NSIS installer and portable target through `npm run dist:win`.

### Optional engines

Install FFmpeg for audio/video; LibreOffice for office documents; Calibre for EPUB/MOBI/AZW3/FB2; Ghostscript for image-aware PDF recompression. These are separate local applications and are not bundled automatically.

### Important implementation limits

The crop tool currently accepts crop percentages rather than providing a drag-to-select visual crop canvas. PDF page rendering to images, true PDF compression without Ghostscript, OCR, CAD conversion and geospatial conversion are not yet available. Native global modifier/drag interaction and the installer still require hands-on Windows testing. The app should not be described as supporting all 270 formats until each adapter is implemented and tested.
