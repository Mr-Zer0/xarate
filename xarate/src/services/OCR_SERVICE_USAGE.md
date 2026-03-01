# OCRService Usage Guide

The OCRService provides optical character recognition (OCR) functionality for scanning receipts and extracting expense data automatically.

## Features

- **Camera Capture**: Capture receipt images directly from device camera
- **Gallery Upload**: Select receipt images from device gallery/file system
- **Image Preprocessing**: Automatic grayscale conversion and contrast adjustment for better OCR accuracy
- **OCR Processing**: Extract text from receipt images using Tesseract.js
- **Data Extraction**: Automatically extract amount, date, and merchant name from receipt text
- **Error Handling**: Graceful error handling with clear error messages

## Installation

The service is already installed with the project. Tesseract.js is included as a dependency.

```bash
npm install tesseract.js
```

## Basic Usage

### Import the Service

```typescript
import { ocrService } from '@/services';
```

### Capture from Camera

```typescript
try {
  const imageBlob = await ocrService.captureFromCamera();
  const result = await ocrService.processReceipt(imageBlob);
  
  console.log('Extracted data:', {
    amount: result.amount,
    date: result.date,
    merchant: result.merchant,
    confidence: result.confidence
  });
} catch (error) {
  console.error('Camera capture failed:', error);
  // Handle permission denied or camera not available
}
```

### Select from Gallery

```typescript
try {
  const imageBlob = await ocrService.selectFromGallery();
  const result = await ocrService.processReceipt(imageBlob);
  
  console.log('Extracted data:', result);
} catch (error) {
  console.error('File selection failed:', error);
  // Handle cancelled selection or file read error
}
```

### Process Receipt Image

```typescript
// If you already have an image blob
const result = await ocrService.processReceipt(imageBlob);

// Result structure:
// {
//   text: string;           // Full OCR text
//   confidence: number;     // 0-1 confidence score
//   amount?: number;        // Extracted amount (if found)
//   date?: Date;           // Extracted date (if found)
//   merchant?: string;     // Extracted merchant name (if found)
// }
```

## Advanced Usage

### Manual Data Extraction

You can use the extraction methods directly on text:

```typescript
const receiptText = "Walmart\n123 Main St\nTotal: $45.99\nDate: 03/15/2024";

const amount = ocrService.extractAmount(receiptText);
// Returns: 45.99

const date = ocrService.extractDate(receiptText);
// Returns: Date object for March 15, 2024

const merchant = ocrService.extractMerchant(receiptText);
// Returns: "Walmart"
```

### Image Preprocessing

Preprocess an image before OCR for better results:

```typescript
const preprocessedBlob = await ocrService.preprocessImage(originalBlob);
// Image is converted to grayscale with enhanced contrast
```

### Cleanup Resources

When you're done using OCR (e.g., component unmount):

```typescript
await ocrService.cleanup();
// Terminates the Tesseract worker to free memory
```

## Integration with Expense Form

Example integration in a React component:

```typescript
import { useState } from 'react';
import { ocrService } from '@/services';

function ExpenseForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date(),
  });

  const handleScanReceipt = async () => {
    try {
      setLoading(true);
      
      // Capture from camera
      const imageBlob = await ocrService.captureFromCamera();
      
      // Process with OCR
      const result = await ocrService.processReceipt(imageBlob);
      
      // Pre-fill form with extracted data
      setFormData({
        amount: result.amount?.toString() || '',
        description: result.merchant || '',
        date: result.date || new Date(),
      });
      
      // Show confidence score to user
      if (result.confidence < 0.7) {
        alert('Low confidence OCR result. Please verify the extracted data.');
      }
    } catch (error) {
      console.error('Receipt scan failed:', error);
      alert('Failed to scan receipt. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form>
      <button type="button" onClick={handleScanReceipt} disabled={loading}>
        {loading ? 'Scanning...' : 'Scan Receipt'}
      </button>
      
      <input
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        placeholder="Amount"
      />
      
      <input
        type="text"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Description"
      />
      
      {/* Other form fields... */}
    </form>
  );
}
```

## Error Handling

The service throws descriptive errors that you should handle:

```typescript
try {
  const imageBlob = await ocrService.captureFromCamera();
  const result = await ocrService.processReceipt(imageBlob);
} catch (error) {
  if (error.message.includes('permission denied')) {
    // Show instructions to enable camera permission
    alert('Please allow camera access in your browser settings');
  } else if (error.message.includes('not supported')) {
    // Fallback to gallery upload
    alert('Camera not available. Please upload an image instead.');
  } else {
    // Generic error
    alert('Failed to process receipt. Please try again.');
  }
}
```

## Supported Receipt Formats

The OCR service can extract data from various receipt formats:

### Amount Patterns
- `Total: $45.99`
- `Amount: 45.99`
- `Balance: $45.99`
- `$45.99`
- `45.99 USD`

### Date Patterns
- `03/15/2024` (MM/DD/YYYY)
- `15/03/2024` (DD/MM/YYYY)
- `2024-03-15` (YYYY-MM-DD)
- `March 15, 2024`
- `15 March 2024`

### Merchant Name
- Typically extracted from the first few lines
- Skips phone numbers, dates, and common receipt words
- Returns the most likely merchant name

## Performance Considerations

- **First Load**: Tesseract.js downloads language data (~2MB) on first use
- **Processing Time**: Typical receipt takes 3-5 seconds to process
- **Memory Usage**: OCR worker uses ~50MB of memory
- **Cleanup**: Call `cleanup()` when done to free resources

## Browser Compatibility

- **Camera API**: Requires HTTPS (except localhost)
- **Supported Browsers**: Chrome, Firefox, Safari, Edge (modern versions)
- **Mobile**: Works on iOS Safari and Android Chrome
- **Permissions**: User must grant camera permission

## Tips for Best Results

1. **Good Lighting**: Ensure receipt is well-lit
2. **Flat Surface**: Place receipt on flat surface to avoid distortion
3. **Clear Image**: Avoid blurry or low-resolution images
4. **Contrast**: Dark text on light background works best
5. **Full Receipt**: Capture entire receipt in frame
6. **Verify Data**: Always allow users to verify/correct extracted data

## Troubleshooting

### Low Confidence Scores
- Try preprocessing the image manually
- Ensure good lighting and focus
- Use higher resolution camera if available

### No Data Extracted
- Check if receipt text is clear and readable
- Verify receipt format is supported
- Try manual entry as fallback

### Camera Permission Denied
- Guide user to browser settings
- Provide fallback to gallery upload
- Show clear error messages

## Future Enhancements

- Support for multiple currencies
- Receipt image storage with expense
- Batch processing of multiple receipts
- Machine learning for better extraction accuracy
- Support for handwritten receipts
