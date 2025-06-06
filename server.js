import express from 'express';
import cors from 'cors';
import { createCanvas } from 'canvas';
import JsBarcode from 'jsbarcode';
import net from 'net';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load printers
let printers = [];
try {
  const printersData = fs.readFileSync('./printers.json', 'utf8');
  printers = JSON.parse(printersData);
  console.log('Printers loaded:', printers);
} catch (error) {
  console.error('Error loading printers:', error);
}

// Endpoint for printing barcodes
app.post('/print-barcode', async (req, res) => {
  try {
    const { articleNumber, printerIp } = req.body;

    if (!articleNumber || !printerIp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Article number and printer IP are required' 
      });
    }

    console.log(`Printing barcode for article ${articleNumber} to printer at ${printerIp}`);

    // Generate barcode as canvas
    const canvas = createCanvas(400, 150);
    JsBarcode(canvas, articleNumber, {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true
    });

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Create ZPL command for the Honeywell LNX3 printer
    // Note: This is a simplified ZPL command. You may need to adjust it based on your specific printer model
    const zplCommand = `^XA
^FO50,50^GFA,${buffer.length},${buffer.length},${buffer.length},${buffer.toString('base64')}^FS
^FO50,180^A0N,30,30^FD${articleNumber}^FS
^XZ`;

    // Send to printer
    const client = new net.Socket();
    
    client.connect(9100, printerIp, () => {
      console.log('Connected to printer');
      client.write(zplCommand);
      client.end();
    });

    client.on('close', () => {
      console.log('Connection to printer closed');
      res.json({ success: true });
    });

    client.on('error', (err) => {
      console.error('Printer connection error:', err);
      res.status(500).json({ 
        success: false, 
        error: `Printer connection error: ${err.message}` 
      });
    });

  } catch (error) {
    console.error('Error printing barcode:', error);
    res.status(500).json({ 
      success: false, 
      error: `Server error: ${error.message}` 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});