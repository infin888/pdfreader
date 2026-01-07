# Reflow PDF Reader

A modern PDF reader built with React, TypeScript, and Vite that allows you to reflow PDF text into responsive pages optimized for any device.

## Features

- Load PDF files from local storage or URL
- Reflow PDF text into responsive, readable pages
- Navigate between pages using keyboard arrows or swipe gestures
- Adjustable font size
- Word count per page

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

### Development Mode

To run the app in development mode with hot-reloading:

```bash
npm run dev
```

The app will be available at `http://localhost:5173/` (or another port if 5173 is in use).

### Production Build

To build the app for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Usage

1. Open the app in your browser
2. Click "Choose File" to select a PDF from your local storage, or paste a URL to load a PDF from the web
3. Click "Load" or "Sample" to view the PDF
4. Use the arrow keys (← →) or swipe gestures to navigate between pages
5. Adjust the font size using the slider at the top

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **pdfjs-dist** - PDF parsing and rendering
- **Tailwind CSS** - Styling framework

## License

See LICENSE file for details.